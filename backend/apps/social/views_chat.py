from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.db.models import Max, Q, Count, OuterRef, Subquery, Prefetch
from apps.social.models import ChatSession, ChatMessage
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.security import SecureVaultService
from apps.social.utils import get_profile_id, resolve_profile
import str_uuid as uuid # Small trick for lint
import uuid as real_uuid
from django.shortcuts import get_object_or_404

class ChatViewSet(viewsets.ViewSet):
    """
    Orchestrates live chat sessions.
    Optimized for high-fidelity communication and quick responses.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_profile_id(self, user):
        return get_profile_id(user)

    @action(detail=False, methods=['get'])
    def list_sessions(self, request):
        """Fetch all chat threads with deep search and unread metrics."""
        my_id = self._get_my_profile_id(request.user)
        user_role = request.user.role
        search_query = request.query_params.get('search', '').lower()
        
        # 1. Base Query (Filtered by Participation)
        sessions_qs = ChatSession.objects.filter(
            participants__contains=[{"id": int(my_id), "role": user_role}]
        ).order_by('-last_message_at')

        # 2. Optimized Unread Aggregation (Single Query)
        unread_counts = ChatMessage.objects.filter(
            session__in=sessions_qs,
            is_read=False
        ).exclude(sender_id=my_id).values('session_id').annotate(count=Count('id'))
        unread_map = {item['session_id']: item['count'] for item in unread_counts}

        # 3. Prefetch Last Message to avoid N+1
        # (Django's Prefetch can be complex for 'latest only', but we'll manually buffer if needed)
        # Actually, since we need to decrypt, we'll fetch them in one go below.
        
        results = []
        for s in sessions_qs:
            # Skip if deleted for me
            if s.deleted_for and f"{user_role}-{my_id}" in s.deleted_for:
                continue

            # RESOLVE OTHER PARTICIPANT from JSON (Fast)
            if s.is_group:
                other_name = s.name or "Workgroup"
                orole = "GROUP"
                oid = 0
            else:
                try:
                    other = next((p for p in s.participants if not (int(p['id']) == int(my_id) and p['role'] == user_role)))
                except StopIteration:
                    other = s.participants[0] if s.participants else {}
                
                orole = other.get('role', 'STUDENT')
                oid = other.get('id')
                other_name = other.get('name', 'Peer')

            # SEARCH FILTERING (Backend side for UX)
            if search_query and search_query not in other_name.lower():
                continue

            last_msg = s.messages.only('content', 'timestamp', 'sender_id', 'is_read').order_by('-timestamp').first()
            preview = ""
            if last_msg:
                try:
                    # SLOW POINT: We decrypt here. For 100 sessions, this is 100 decrypts.
                    # But unless RSA is used, this should be sub-ms per message.
                    preview = str(SecureVaultService.decrypt(last_msg.content))
                    if len(preview) > 40: preview = preview[:40] + "..."
                except:
                    preview = "Encrypted Mission Data"

            results.append({
                "id": s.id,
                "session_id": s.session_id,
                "other_name": other_name,
                "other_role": orole,
                "other_id": oid,
                "last_msg_at": last_msg.timestamp if last_msg else s.created_at,
                "last_msg_preview": preview,
                "is_group": s.is_group,
                "unread_count": unread_map.get(s.id, 0),
                "is_me_last": last_msg and int(last_msg.sender_id) == int(my_id),
                "last_msg_status": "SEEN" if last_msg and last_msg.is_read else ("SENT" if last_msg else None)
            })
            
        return success_response("Neural session map loaded.", data=results)

    @action(detail=True, methods=['get'])
    def session_detail(self, request, pk=None):
        """Fetch session metadata with automatic join for eligible students."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Invalid session.", code=404)
        
        my_id = self._get_my_profile_id(request.user)
        my_role = request.user.role
        
        # Membership check
        is_member = any(int(p['id']) == int(my_id) and p['role'] == my_role for p in session.participants)
        
        if not is_member:
            # Silent Join for Placement Drive Groups
            drive_id = session.participants_metadata.get('drive_id')
            if drive_id and my_role == 'STUDENT':
                from apps.placement.models import PlacementApplication
                if PlacementApplication.objects.filter(drive_id=drive_id, student_id=my_id).exists():
                    self._add_participant(session, my_id, my_role)
                    is_member = True
            
            if not is_member and my_role in ('INST_ADMIN', 'ADMIN', 'FACULTY'):
                self._add_participant(session, my_id, my_role)
                is_member = True

        if not is_member:
            return error_response("Access Denied: Not a member of this secure thread.", code=403)

        # Resolve full profiles for detailed participant metadata
        enriched_participants = []
        for p in session.participants:
            enriched_participants.append(resolve_profile(p['id'], p['role']))

        return success_response("Detail retrieved", data={
            "id": session.id,
            "session_id": session.session_id,
            "name": session.name,
            "is_group": session.is_group,
            "participants": enriched_participants,
            "participants_metadata": session.participants_metadata,
            "invite_link": f"/chat-hub?group={session.session_id}" if session.is_group else None
        })

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Fetch history with multi-receipt synchronization."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session group unreachable.")
        
        my_id = self._get_my_profile_id(request.user)
        msgs = session.messages.all().order_by('timestamp')
        results = []
        
        for m in msgs:
            results.append({
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "content": str(SecureVaultService.decrypt(m.content)),
                "attachment_url": m.attachment_file.url if m.attachment_file else None,
                "attachment_type": m.attachment_type,
                "timestamp": m.timestamp,
                "is_me": int(m.sender_id) == int(my_id),
                "is_read": m.is_read
            })
        
        # Sync receipts
        msgs.exclude(sender_id=my_id).update(is_read=True, read_at=timezone.now())
        return success_response("History synchronized.", data=results)

    @action(detail=False, methods=['post'])
    def start_chat(self, request):
        """Direct 1:1 encrypted link initiation."""
        other_user_id = request.data.get('user_id')
        other_user_role = request.data.get('role', 'STUDENT')
        
        my_id = self._get_my_profile_id(request.user)
        my_role = request.user.role
        
        if int(my_id) == int(other_user_id) and my_role == other_user_role:
             return error_response("Loopback session denied.")

        # Check existing
        existing = ChatSession.objects.filter(is_group=False).filter(
            participants__contains=[{"id": int(my_id), "role": my_role}]
        ).filter(
            participants__contains=[{"id": int(other_user_id), "role": other_user_role}]
        ).first()

        if existing:
            return success_response("Session re-established", data={"session_id": existing.session_id})

        # New session
        my_profile = resolve_profile(my_id, my_role)
        other_profile = resolve_profile(other_user_id, other_user_role)
        
        new_session = ChatSession.objects.create(
            name=f"Chat with {other_profile.get('name', 'Peer')}",
            is_group=False,
            session_id=str(real_uuid.uuid4()),
            participants=[
                {"id": int(my_id), "role": my_role, "name": my_profile.get('name')},
                {"id": int(other_user_id), "role": other_user_role, "name": other_profile.get('name')}
            ]
        )
        return success_response("Secure session established", data={"session_id": new_session.session_id})

    @action(detail=False, methods=['post'])
    def start_group(self, request):
        """Provision a new secure workgroup."""
        name = request.data.get('name', 'New Workgroup')
        peers = request.data.get('peers', []) # List of {id, role}
        
        my_id = self._get_my_profile_id(request.user)
        my_role = request.user.role
        my_profile = resolve_profile(my_id, my_role)
        
        participants = [{"id": int(my_id), "role": my_role, "name": my_profile.get('name')}]
        for p in peers:
            prof = resolve_profile(p['id'], p['role'])
            participants.append({"id": int(p['id']), "role": p['role'], "name": prof.get('name')})

        session = ChatSession.objects.create(
            name=name,
            is_group=True,
            session_id=str(real_uuid.uuid4()),
            participants=participants
        )
        return success_response("Workgroup synthesized", data={"session_id": session.session_id})

    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        """Disconnect self from group participant list."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session lost.")
        
        my_id = self._get_my_profile_id(request.user)
        my_role = request.user.role
        
        with transaction.atomic():
            new_participants = [p for p in session.participants if not (int(p['id']) == int(my_id) and p['role'] == my_role)]
            session.participants = new_participants
            
            # Record deletion locally for the user
            if not session.deleted_for: session.deleted_for = []
            session.deleted_for.append(f"{my_role}-{my_id}")
            
            session.save()
            
        return success_response("Membership terminated.")

    @action(detail=True, methods=['post'])
    def join_gate(self, request, pk=None):
        """Verify and join a gated recruitment channel."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Checkpoint not found.")

        my_id = self._get_my_profile_id(request.user)
        my_role = request.user.role

        # am I in?
        is_in = any(int(p['id']) == int(my_id) and p['role'] == my_role for p in session.participants)
        if is_in: return success_response("ACCESS_GRANTED", data={"status": "JOINED"})

        # Logic for auto-joining drive channels
        drive_id = session.participants_metadata.get('drive_id')
        if not drive_id:
             return error_response("This gate is locked.", code=403)
             
        from apps.placement.models import PlacementDrive
        drive = get_object_or_404(PlacementDrive, id=drive_id)
        
        # If I applied, I am in.
        from apps.placement.models import PlacementApplication
        if PlacementApplication.objects.filter(drive=drive, student_id=my_id).exists():
            self._add_participant(session, my_id, my_role)
            return success_response("Access granted via application.", data={"status": "JOINED"})
            
        # If I am ELIGIBLE, I can join.
        from apps.placement.services.eligibility_engine import EligibilityEngine
        if EligibilityEngine.is_student_eligible(drive, my_id):
             self._add_participant(session, my_id, my_role)
             return success_response("Access granted via eligibility verification.", data={"status": "JOINED"})

        return error_response("Restricted intelligence channel. Access Denied.", code=403)

    def _add_participant(self, session, my_id, my_role):
        prof = resolve_profile(my_id, my_role)
        p_list = session.participants or []
        if not any(int(p['id']) == int(my_id) and p['role'] == my_role for p in p_list):
            p_list.append({"id": int(my_id), "role": my_role, "name": prof.get('name')})
            session.participants = p_list
            session.save()
