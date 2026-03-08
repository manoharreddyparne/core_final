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

        unread_map = {
            item['session_id']: item['count'] 
            for item in ChatMessage.objects.filter(session__in=sessions, is_read=False)
            .exclude(sender_id=my_id).values('session_id').annotate(count=Count('id'))
        }

        results = []
        for s in sessions:
            if s.deleted_for and f"{role}-{my_id}" in s.deleted_for:
                continue

            # Identify "other" for display
            if s.is_group:
                other_name, orole, oid = s.name or "Group", "GROUP", 0
            else:
                other = next((p for p in s.participants if not (int(p['id']) == int(my_id) and p['role'] == role)), s.participants[0])
                other_name, orole, oid = other.get('name', 'Peer'), other.get('role'), other.get('id')

            if search and search not in other_name.lower():
                continue

            last_msg = s.messages.order_by('-timestamp').only('content', 'timestamp', 'sender_id', 'is_read').first()
            preview = "Encrypted Message"
            if last_msg:
                try: preview = SecureVaultService.decrypt(last_msg.content)[:40]
                except: pass

            results.append({
                "session_id": s.session_id,
                "other_name": other_name,
                "other_role": orole,
                "other_id": oid,
                "last_msg_at": last_msg.timestamp if last_msg else s.created_at,
                "last_msg_preview": preview,
                "is_group": s.is_group,
                "unread_count": unread_map.get(s.id, 0),
                "last_msg_status": "SEEN" if last_msg and last_msg.is_read else "SENT" if last_msg else None
            })

        return success_response("Sessions retrieved", data=results)

    @action(detail=True, methods=['get'], url_path='detail')
    def session_detail(self, request, pk=None):
        """Verification logic for ChatHub loading flow."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Not found", code=404)

        my_id = self._get_my_id(request)
        role = request.user.role

        is_member = any(int(p['id']) == int(my_id) and p['role'] == role for p in session.participants)
        
        # Point 2 & 5 logic
        drive_id = session.participants_metadata.get('drive_id')
        
        status_code = "MEMBER" if is_member else "STRANGER"
        message = ""
        can_join = False
        requires_access = False

        if not is_member and drive_id:
            from apps.placement.models import PlacementDrive, PlacementApplication
            from apps.placement.services.eligibility_engine import EligibilityEngine
            
            drive = get_object_or_404(PlacementDrive, id=drive_id)
            is_eligible = EligibilityEngine.is_student_eligible(drive, my_id) if role == 'STUDENT' else True
            has_applied = PlacementApplication.objects.filter(drive=drive, student_id=my_id).exists() if role == 'STUDENT' else True

            if role == 'STUDENT':
                if not is_eligible:
                    status_code = "NOT_ELIGIBLE"
                    message = "You are not eligible for this drive."
                elif not has_applied:
                    status_code = "APPLY_FIRST"
                    message = "Please apply for the drive before joining this chat."
                else:
                    # Case 1: Eligible and applied -> Auto Join
                    self._perform_join(session, my_id, role)
                    is_member = True
                    status_code = "MEMBER"
            else:
                # Inst Admin or Faculty of department auto-join
                # (Assuming dept check if needed, but Point 5 says Inst Admin/Faculty auto-member)
                self._perform_join(session, my_id, role)
                is_member = True
                status_code = "MEMBER"

        if not is_member and status_code == "STRANGER":
            if session.is_group:
                can_join = True # Show "Join Chat" button
                requires_access = True # Or "Request Access" if restricted
            
        data = {
            "session_id": session.session_id,
            "name": session.name,
            "is_group": session.is_group,
            "is_member": is_member,
            "status_code": status_code,
            "message": message,
            "can_join": can_join,
            "requires_access": requires_access,
            "participants": [resolve_profile(p['id'], p['role']) for p in session.participants] if is_member else []
        }
        return success_response("Status verified", data=data)

    def _perform_join(self, session, my_id, role):
        prof = resolve_profile(my_id, role)
        plist = list(session.participants)
        if not any(int(p['id']) == int(my_id) and p['role'] == role for p in plist):
            plist.append({"id": int(my_id), "role": role, "name": prof.get('name')})
            session.participants = plist
            session.save()
