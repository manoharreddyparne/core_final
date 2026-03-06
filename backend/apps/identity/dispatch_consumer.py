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
        """Accept first, then authorize. Allows sending rich error messages back."""
        await self.accept()
        self.user = self.scope.get("user")
        
        if not self.user or not getattr(self.user, "is_authenticated", False):
            logger.warning("[DISPATCH-WS] Connect Attempt: Unauthenticated or None")
            await self._send_error("Authentication required. Please refresh.")
            await self.close()
            return

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
        user_type = data.get("user_type", "student")

        # Resolve institution from user context
        institution = getattr(self.user, "institution", None)
        if not institution:
            await self._send_error("Institution not found for this user")
            return

        schema = institution.schema_name
        await self._run_dispatch(schema, institution, roll_numbers, section, user_type)

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

    async def _run_dispatch(self, schema, institution, roll_numbers, section, user_type="student"):
        """Run the dispatch and stream progress events in true real-time."""
        from apps.auip_institution.models import (
            StudentPreSeededRegistry, StudentAcademicRegistry,
            FacultyPreSeededRegistry, FacultyAcademicRegistry
        )
        from apps.identity.services.activation_service import ActivationService
        from django_tenants.utils import schema_context
        import asyncio

        # 1. PREPARATION: Resolve IDs and classify status (Sync)
        @sync_to_async
        def _get_batch_data():
            with schema_context(schema):
                # Routing logic based on user_type
                if user_type == "faculty":
                    id_field = 'employee_id'
                    ident_field = 'identifier'
                    AcademicModel = FacultyAcademicRegistry
                    PreSeededModel = FacultyPreSeededRegistry
                    # Faculty don't have sections for dispatch usually, but we support roll_numbers
                    query_rolls = [str(r).strip() for r in roll_numbers if r]
                else:
                    id_field = 'roll_number'
                    ident_field = 'identifier'
                    AcademicModel = StudentAcademicRegistry
                    PreSeededModel = StudentPreSeededRegistry
                    if section:
                        query_rolls = list(AcademicModel.objects.filter(section=section).values_list(id_field, flat=True))
                    else:
                        query_rolls = [str(r).strip().upper() for r in roll_numbers if r]

                if not query_rolls: return None

                # Preload data to avoid N+1 queries in threads
                preseeded_map = {getattr(s, ident_field).upper(): s for s in PreSeededModel.objects.filter(**{f"{ident_field}__in": query_rolls})}
                name_map = {getattr(a, id_field).upper(): a.full_name.title() for a in AcademicModel.objects.filter(**{f"{id_field}__in": query_rolls}).only(id_field, 'full_name')}

                # ⚡ Optimized Bulk Sync: Ensure all have identity records
                missing_rolls = [r for r in query_rolls if r.upper() not in preseeded_map]
                if missing_rolls:
                    acads = AcademicModel.objects.filter(**{f"{id_field}__in": missing_rolls})
                    new_identities = []
                    for a in acads:
                        # Faculty uses email field, Student uses official_email/personal_email
                        email = getattr(a, 'email', None) or getattr(a, 'official_email', None) or getattr(a, 'personal_email', None)
                        if email:
                            new_identities.append(PreSeededModel(identifier=getattr(a, id_field), email=email))
                    
                    if new_identities:
                        PreSeededModel.objects.bulk_create(new_identities, ignore_conflicts=True)
                        for s in PreSeededModel.objects.filter(**{f"{ident_field}__in": missing_rolls}):
                            preseeded_map[getattr(s, ident_field).upper()] = s

                # Categorize
                to_invite = []
                already_done = []
                for roll in query_rolls:
                    roll_up = roll.upper()
                    stu = preseeded_map.get(roll_up)
                    name = name_map.get(roll_up, "")
                    if not stu:
                        already_done.append((roll, name, "not_found"))
                    elif stu.is_activated:
                        already_done.append((roll, name, "already_active"))
                    else:
                        to_invite.append((stu, name))
                return to_invite, already_done, len(query_rolls)

        batch_result = await _get_batch_data()
        if not batch_result:
            await self._send_done({"invited": 0, "already_active": 0, "not_found": 0, "failed": 0})
            return

        to_invite, already_done, total = batch_result
        summary = {"invited": 0, "already_active": 0, "not_found": 0, "failed": 0}
        current = 0

        # Send instant non-dispatchable updates
        for roll, name, status in already_done:
            current += 1
            summary[status] += 1
            await self._send_progress(current, total, roll, status, name)

        # 2. DISPATCH: Parallel Email Sending with Real-time Progress
        if to_invite:
            def _dispatch_task(item):
                stu, name = item
                with schema_context(schema):
                    try:
                        ActivationService.create_tenant_invitation(stu, schema, entry_type=user_type)
                        return (stu.identifier, name, "sent")
                    except Exception as e:
                        logger.error(f"[DISPATCH-WS] Failed for {stu.identifier}: {e}")
                        return (stu.identifier, name, "failed")

            # Gmail SMTP is slow (2s/send), SES is fast (0.1s/send)
            # 20 workers is a safe balance for both
            MAX_WORKERS = min(20, len(to_invite))
            loop = asyncio.get_event_loop()

            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
                tasks = [loop.run_in_executor(pool, _dispatch_task, s) for s in to_invite]
                for future in asyncio.as_completed(tasks):
                    roll, name, status = await future
                    current += 1
                    key = "invited" if status == "sent" else "failed"
                    summary[key] += 1
                    await self._send_progress(current, total, roll, status, name)

        await self._send_done(summary)
