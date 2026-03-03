"""
DispatchConsumer — WebSocket consumer for real-time bulk invite progress.

Frontend connects to: ws://<host>/ws/dispatch/
Protocol:
  → client sends: { action: "start", roll_numbers: ["...", ...], schema: "inst_xxx" }
  ← server sends: { type: "progress", current: N, total: N, roll: "...", status: "sent"|"failed"|"already_active"|"not_found", pct: 0-100 }
  ← server sends: { type: "done", summary: {...} }
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class DispatchConsumer(AsyncWebsocketConsumer):
    """
    Streams real-time activation dispatch progress over WebSocket.
    Authenticated via query-param token (reuses identity WS middleware).
    """

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not getattr(self.user, "is_authenticated", False):
            logger.warning("[DISPATCH-WS] Rejected unauthenticated connection")
            await self.close()
            return
        await self.accept()
        logger.info(f"[DISPATCH-WS] Connected: user={self.user}")

    async def disconnect(self, close_code):
        logger.info(f"[DISPATCH-WS] Disconnected: code={close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self._send_error("Invalid JSON")
            return

        if data.get("action") != "start":
            return

        roll_numbers = data.get("roll_numbers", [])
        section = data.get("section")

        # Resolve institution from user context
        institution = getattr(self.user, "institution", None)
        if not institution:
            await self._send_error("Institution not found for this user")
            return

        schema = institution.schema_name
        await self._run_dispatch(schema, institution, roll_numbers, section)

    async def _send_progress(self, current, total, roll, status, name=""):
        pct = round((current / total) * 100) if total > 0 else 0
        await self.send(text_data=json.dumps({
            "type": "progress",
            "current": current,
            "total": total,
            "roll": roll,
            "name": name,
            "status": status,   # "sent" | "failed" | "already_active" | "not_found"
            "pct": pct,
        }))

    async def _send_done(self, summary):
        await self.send(text_data=json.dumps({
            "type": "done",
            "summary": summary,
        }))

    async def _send_error(self, message):
        await self.send(text_data=json.dumps({
            "type": "error",
            "message": message,
        }))

    async def _run_dispatch(self, schema, institution, roll_numbers, section):
        """Run the dispatch and stream progress events."""

        @sync_to_async
        def _resolve_and_dispatch():
            from apps.auip_institution.models import StudentPreSeededRegistry, StudentAcademicRegistry
            from apps.identity.services.activation_service import ActivationService
            from django_tenants.utils import schema_context
            import threading

            results = []  # list of (roll, name, status)
            lock = threading.Lock()

            with schema_context(schema):
                # Resolve rolls
                if section:
                    query_rolls = list(
                        StudentAcademicRegistry.objects
                        .filter(section=section)
                        .values_list('roll_number', flat=True)
                    )
                elif roll_numbers:
                    query_rolls = [str(r).strip().upper() for r in roll_numbers if r]
                else:
                    return []

                if not query_rolls:
                    return []

                # Bulk preload identity records (2 queries max)
                preseeded_map = {
                    s.identifier.upper(): s
                    for s in StudentPreSeededRegistry.objects.filter(identifier__in=query_rolls)
                }
                name_map = {
                    a.roll_number.upper(): a.full_name.title()
                    for a in StudentAcademicRegistry.objects.filter(roll_number__in=query_rolls)
                    .only('roll_number', 'full_name')
                }

                # Auto-sync missing
                missing = [r for r in query_rolls if r.upper() not in preseeded_map]
                if missing:
                    acads = StudentAcademicRegistry.objects.filter(roll_number__in=missing)
                    for acad in acads:
                        try:
                            acad.sync_to_preseeded()
                        except Exception:
                            pass
                    new_entries = StudentPreSeededRegistry.objects.filter(identifier__in=missing)
                    for s in new_entries:
                        preseeded_map[s.identifier.upper()] = s

                # Classify
                to_invite = []
                for roll in query_rolls:
                    stu = preseeded_map.get(roll.upper())
                    if not stu:
                        results.append((roll, name_map.get(roll.upper(), ""), "not_found"))
                    elif stu.is_activated:
                        results.append((roll, name_map.get(roll.upper(), ""), "already_active"))
                    else:
                        to_invite.append(stu)

                static_results = list(results)  # capture non-invite results

                # Parallel dispatch
                MAX_WORKERS = min(20, max(1, len(to_invite)))

                def _send_one(stu_entry):
                    name = name_map.get(stu_entry.identifier.upper(), "")
                    try:
                        ActivationService.create_tenant_invitation(
                            stu_entry, schema, entry_type="student"
                        )
                        return (stu_entry.identifier, name, "sent")
                    except Exception as e:
                        logger.error(f"[DISPATCH-WS] Failed for {stu_entry.identifier}: {e}")
                        return (stu_entry.identifier, name, "failed")

                invite_results = []
                if to_invite:
                    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
                        futures = {pool.submit(_send_one, s): s for s in to_invite}
                        for future in as_completed(futures):
                            invite_results.append(future.result())

                return static_results + invite_results

        # Run sync work off the event loop
        try:
            all_results = await _resolve_and_dispatch()
        except Exception as e:
            await self._send_error(str(e))
            return

        total = len(all_results)
        summary = {"invited": 0, "already_active": 0, "not_found": 0, "failed": 0}

        for i, (roll, name, status) in enumerate(all_results, 1):
            await self._send_progress(i, total, roll, status, name)
            summary[status] = summary.get(status, 0) + 1

            # Small yield to keep WS alive for rapid sends
            import asyncio
            await asyncio.sleep(0)

        await self._send_done(summary)
