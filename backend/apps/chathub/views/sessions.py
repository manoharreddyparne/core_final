from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db.models import Count
from apps.social.models import ChatSession, ChatMessage
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.security import SecureVaultService
from apps.social.utils import get_profile_id, resolve_profile
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
import uuid

class SessionViewSet(viewsets.ViewSet):
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_id(self, request):
        return get_profile_id(request.user)

    @action(detail=False, methods=['get'])
    def list_sessions(self, request):
        """Highly optimized session list with <500ms target."""
        my_id = self._get_my_id(request)
        role = request.user.role
        search = request.query_params.get('search', '').lower()

        # Optimize with select_related if there were related objects, 
        # but ChatSession uses JSONField for participants.
        sessions = ChatSession.objects.filter(
            participants__contains=[{"id": int(my_id), "role": role}]
        ).order_by('-last_message_at')

        # GIN index on participants and db_index on last_message_at (added in models.py) 
        # will make this fast.

        unread_map = {} # TODO: Implement status_tracking based unread count

        results = []
        my_key = f"{my_id}_{role}"
        
        for s in sessions:
            if s.deleted_for and f"{role}-{my_id}" in s.deleted_for:
                continue

            # Identify "other" for display
            if s.is_group:
                other_name, orole, oid = s.name or "Group", "GROUP", 0
            else:
                plist = s.participants or []
                other = next((p for p in plist if not (int(p['id']) == int(my_id) and p['role'] == role)), plist[0] if plist else {})
                other_name, orole, oid = other.get('name', 'Peer'), other.get('role'), other.get('id')

            if search and search not in other_name.lower():
                continue

            last_msg = s.messages.order_by('-timestamp').only('content', 'timestamp', 'sender_id').first()
            preview = "Encrypted Message"
            if last_msg:
                try: 
                    preview = SecureVaultService.decrypt(last_msg.content)[:40]
                except: 
                    pass

            # Precise Unread Count Calculation using JSON status_tracking
            unread_count = s.messages.exclude(sender_id=my_id, sender_role=role).filter(
                **{f"status_tracking__{my_key}__seen_at__isnull": True}
            ).count()

            results.append({
                "session_id": s.session_id,
                "other_name": other_name,
                "other_role": orole,
                "other_id": oid,
                "my_id": my_id,
                "my_role": role,
                "last_msg_at": last_msg.timestamp if last_msg else s.created_at,
                "last_msg_preview": preview,
                "is_group": s.is_group,
                "unread_count": unread_count,
                "last_msg_status": "SENT" if last_msg else None
            })

        return success_response("Sessions retrieved", data=results)

    @action(detail=True, methods=['get'], url_path='detail')
    def session_detail(self, request, pk=None):
        """Highly advanced verification hub for ChatHub loading & join flow."""
        # Since apps.social is SHARED, this queries public schema regardless of tenant switch.
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: 
            return error_response("Protocol non-existent or purged.", code=404)

        my_id = self._get_my_id(request)
        role = request.user.role

        participants_list = session.participants or []
        is_member = any(int(p['id']) == int(my_id) and p['role'] == role for p in participants_list)
        
        drive_id = session.participants_metadata.get('drive_id') if session.participants_metadata else None
        
        requires_access = not session.open_invite
        kicked_list = session.participants_metadata.get('kicked_participants', []) if session.participants_metadata else []
        is_kicked = f"{role}-{my_id}" in kicked_list

        can_join = False
        status_code = "MEMBER" if is_member else "IDLE"
        message = ""
        
        if not is_member:
            if is_kicked:
                # Check if they've already sent a re-entry request
                from apps.social.models import JoinRequest
                kick_join_req = JoinRequest.objects.filter(
                    session=session, user_id=my_id, user_role=role
                ).order_by('-created_at').first()
                if kick_join_req and kick_join_req.status == 'PENDING':
                    status_code = 'NEEDS_APPROVAL'
                    can_join = False
                    requires_access = True
                    message = 'Your re-entry request is pending admin review.'
                elif kick_join_req and kick_join_req.status == 'REJECTED':
                    status_code = 'REJECTED'
                    can_join = False
                    message = 'Your re-entry request was rejected by the administrator.'
                else:
                    status_code = "KICKED"
                    can_join = False
                    requires_access = True
                    message = "You were removed from this thread by an administrator. Please request access if you believe this is an error."

            # Check Invite Expiration
            elif session.invite_expiry_at and session.invite_expiry_at < timezone.now():
                status_code = "EXPIRED"
                message = "The manifestation link for this room has expired."
            elif drive_id and not session.open_invite:
                # Eligibility Check Logic
                from apps.placement.models import PlacementDrive, PlacementApplication
                from apps.placement.services.eligibility_engine import EligibilityEngine
                
                # We stay in current schema for Registry/Application check
                drive = PlacementDrive.objects.filter(id=drive_id).first()
                if not drive:
                    # Drive might be in another institution's schema
                    status_code = "STRANGER"
                    message = "This room belongs to a different recruitment jurisdiction."
                else:
                    is_eligible = EligibilityEngine.is_student_eligible(drive, my_id) if role == 'STUDENT' else True
                    has_applied = PlacementApplication.objects.filter(drive=drive, student_id=my_id).exists() if role == 'STUDENT' else True

                    if role == 'STUDENT':
                        if not is_eligible:
                            status_code = "NOT_ELIGIBLE"
                            message = "Intelligence analysis suggests you are not eligible for this sequence."
                            can_join = False
                        else:
                            # Point 1: Placement Drive Hub access — MUST apply first
                            if not has_applied:
                                status_code = "APPLY_FIRST"
                                message = "Eligible match detected. Strategic prerequisite: You must establish an application before entering the manifestation hub."
                                can_join = False
                            else:
                                status_code = "ELIGIBLE"
                                can_join = True
                    else:
                        # Faculty/Admin of THIS institution auto-eligible
                        can_join = True

            elif session.open_invite:
                # Even for open-invite sessions, check for a pending or rejected JoinRequest
                # (this handles the case where student was kicked and re-requested)
                from apps.social.models import JoinRequest
                join_req = JoinRequest.objects.filter(
                    session=session, user_id=my_id, user_role=role
                ).order_by('-created_at').first()
                if join_req and join_req.status == 'PENDING':
                    status_code = 'NEEDS_APPROVAL'
                    can_join = False
                    message = 'Your access request is pending review by the administrator.'
                elif join_req and join_req.status == 'REJECTED':
                    status_code = 'REJECTED'
                    can_join = False
                    message = 'Your access request was rejected by the administrator.'
                else:
                    can_join = True
                    status_code = 'ELIGIBLE'
            else:
                # Check JoinRequest for kicked users who re-requested
                from apps.social.models import JoinRequest
                join_req = JoinRequest.objects.filter(
                    session=session, user_id=my_id, user_role=role
                ).order_by('-created_at').first()
                if join_req and join_req.status == 'PENDING':
                    status_code = 'NEEDS_APPROVAL'
                    can_join = False
                    message = 'Your access request is awaiting admin approval.'
                elif join_req and join_req.status == 'REJECTED':
                    status_code = 'REJECTED'
                    can_join = False
                    message = 'Your access request was rejected by the administrator.'
                else:
                    status_code = 'STRANGER'
                    message = 'Unauthorized access attempt to secure thread.'


        data = {
            "session_id": session.session_id,
            "name": session.name,
            "is_group": session.is_group,
            "is_member": is_member,
            "my_id": my_id,
            "my_role": role,
            "status_code": status_code,
            "message": message,
            "can_join": can_join,
            "requires_access": requires_access,
            "open_invite": session.open_invite,
            "invite_expiry_at": session.invite_expiry_at,
            "participants_metadata": session.participants_metadata,
            "participants": [resolve_profile(p['id'], p['role']) for p in participants_list] if (is_member or session.open_invite) else [],
            "invite_link": (
                f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/chat-hub?token={session.invite_link_token}"
                if session.invite_link_token else
                f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/chat-hub?group={session.session_id}"
            ) if session.is_group else None
        }
        return success_response("Status verified", data=data)

    @action(detail=True, methods=['post'], url_path='establish_and_broadcast')
    def establish_and_broadcast(self, request, pk=None):
        """Points 2 & 6: Automated recruitment broadcast from the hub."""
        if request.user.role not in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN', 'FACULTY']:
             return error_response("Unauthorized", code=403)
             
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session or not session.participants_metadata.get('drive_id'):
            return error_response("Session is not a drive hub or was purged.")
            
        drive_id = session.participants_metadata.get('drive_id')
        from apps.placement.models import PlacementDrive
        drive = PlacementDrive.objects.filter(id=drive_id).first()
        if not drive:
            return error_response("Associated drive not found.")
            
        from apps.placement.services.eligibility_engine import EligibilityEngine
        # Check if already broadcasted (initial)
        mode = 'REMINDER' if drive.is_broadcasted else 'INITIAL'
        result = EligibilityEngine.broadcast_invitations(drive, mode=mode)
        
        return success_response("Broadcast sequence established.", data=result)

    @action(detail=True, methods=['post'], url_path='join_gate')
    def join_gate(self, request, pk=None):
        """Allows eligible users to join the protocol after verification."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: 
            return error_response("Protocol non-existent or purged.", code=404)

        my_id = self._get_my_id(request)
        role = request.user.role
        
        # Check if already a member
        is_member = any(int(p['id']) == int(my_id) and p['role'] == role for p in session.participants)
        if is_member:
            return success_response("Already synchronized.")

        # Point 5: Prevent re-join if kicked
        kicked_list = session.participants_metadata.get('kicked_participants', []) if session.participants_metadata else []
        if f"{role}-{my_id}" in kicked_list:
            return error_response("Governance restriction: You were removed from this thread. Please submit a request access.", code=403)

        drive_id = session.participants_metadata.get('drive_id') if session.participants_metadata else None
        can_join = False

        if session.open_invite:
            can_join = True
        elif drive_id:
            from apps.placement.models import PlacementDrive, PlacementApplication
            from apps.placement.services.eligibility_engine import EligibilityEngine
            
            drive = PlacementDrive.objects.filter(id=drive_id).first()
            if drive:
                is_eligible = EligibilityEngine.is_student_eligible(drive, my_id) if role == 'STUDENT' else True
                has_applied = PlacementApplication.objects.filter(drive=drive, student_id=my_id).exists() if role == 'STUDENT' else True
                
                # Point 5: Enrollment verification — MUST apply before joining manifest
                if (role == 'STUDENT' and is_eligible and has_applied) or role != 'STUDENT':
                    can_join = True

        if can_join:
            self._perform_join(session, my_id, role)
            return success_response("Handshake complete. Synchronization successful.")
        
        return error_response("Governance threshold not met. Access denied.", code=403)

    def _perform_join(self, session, my_id, role):
        prof = resolve_profile(my_id, role)
        plist = list(session.participants)
        if not any(int(p['id']) == int(my_id) and p['role'] == role for p in plist):
            plist.append({"id": int(my_id), "role": role, "name": prof.get('name', 'Peer')})
            session.participants = plist
            session.save()

    def destroy(self, request, pk=None):
        """
        Soft-delete: marks session as deleted for THIS user only.
        Other participants still see the chat.
        For 1-on-1 chats where both participants delete, the session is hard-deleted.
        """
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session:
            return error_response("Session not found.", code=404)

        my_id = self._get_my_id(request)
        role = request.user.role
        my_key = f"{role}-{my_id}"

        # Check membership
        is_member = any(int(p['id']) == int(my_id) and p['role'] == role for p in session.participants)
        if not is_member:
            return error_response("Access denied.", code=403)

        if not session.deleted_for:
            session.deleted_for = []

        if my_key not in session.deleted_for:
            session.deleted_for = list(session.deleted_for) + [my_key]

        # Hard delete if all participants have deleted
        total = len(session.participants)
        if len(session.deleted_for) >= total:
            session.delete()
            return success_response("Conversation permanently purged.")

        session.save()
        return success_response("Conversation removed from your view.")

