from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.utils import timezone
from apps.social.models import ChatSession, JoinRequest
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.utils import get_profile_id, resolve_profile
from django.shortcuts import get_object_or_404
import uuid

class InviteViewSet(viewsets.ViewSet):
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_profile(self, request):
        my_id = get_profile_id(request.user)
        return my_id, request.user.role, request.user.get_full_name() or "User"

    @action(detail=False, methods=['post'], url_path='join/(?P<token>[^/.]+)')
    def join_via_link(self, request, token=None):
        """Point 3: Join via invite_link_token."""
        session = ChatSession.objects.filter(invite_link_token=token).first()
        if not session: return error_response("Invalid or expired invite link.")

        my_id, role, name = self._get_my_profile(request)
        
        # Check eligibility (Reuse logic from sessions.py but for join flow)
        # For efficiency, I'll refer to the logic in Point 3 & 5
        drive_id = session.participants_metadata.get('drive_id')
        
        if drive_id:
            from apps.placement.models import PlacementDrive, PlacementApplication
            from apps.placement.services.eligibility_engine import EligibilityEngine
            
            drive = get_object_or_404(PlacementDrive, id=drive_id)
            is_eligible = EligibilityEngine.is_student_eligible(drive, my_id) if role == 'STUDENT' else True
            has_applied = PlacementApplication.objects.filter(drive=drive, student_id=my_id).exists() if role == 'STUDENT' else True
            
            if role == 'STUDENT':
                if not is_eligible: return success_response("Not Eligible", data={"status": "NOT_ELIGIBLE", "msg": "You are not eligible for this drive."})
                if not has_applied: return success_response("Apply First", data={"status": "APPLY_FIRST", "msg": "Please apply for the drive before joining."})
            
        # Case 1: Join
        self._add_to_session(session, my_id, role, name)
        return success_response("Joined successfully", data={"session_id": session.session_id})

    @action(detail=True, methods=['post'])
    def request_access(self, request, pk=None):
        """Point 5: Student clicks 'Request Access'."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session not found.")
        
        my_id, role, name = self._get_my_profile(request)
        
        JoinRequest.objects.get_or_create(
            session=session,
            user_id=my_id,
            user_role=role,
            user_name=name,
            status='PENDING'
        )
        return success_response("Request sent to Institutional Admin.")

    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        """Admin panel: view pending join requests."""
        if request.user.role not in ['INST_ADMIN', 'ADMIN']:
            return error_response("Unauthorized", code=403)
        
        reqs = JoinRequest.objects.filter(status='PENDING').select_related('session')
        return success_response("Pending requests", data=[{
            "id": r.id,
            "session_name": r.session.name,
            "user_name": r.user_name,
            "user_role": r.user_role,
            "created_at": r.created_at
        } for r in reqs])

    @action(detail=True, methods=['post'])
    def resolve_request(self, request, pk=None):
        """Admin approval/rejection."""
        if request.user.role not in ['INST_ADMIN', 'ADMIN']:
             return error_response("Unauthorized", code=403)
             
        join_req = get_object_or_404(JoinRequest, id=pk)
        action_type = request.data.get('action') # APPROVE / REJECT
        
        if action_type == 'APPROVE':
            join_req.status = 'APPROVED'
            join_req.resolved_at = timezone.now()
            join_req.save()
            
            # Automatically add to session
            self._add_to_session(join_req.session, join_req.user_id, join_req.user_role, join_req.user_name)
            return success_response("Request approved and user added.")
        else:
            join_req.status = 'REJECTED'
            join_req.resolved_at = timezone.now()
            join_req.save()
            return success_response("Request rejected.")

    def _add_to_session(self, session, uid, role, name):
        plist = list(session.participants)
        if not any(int(p['id']) == int(uid) and p['role'] == role for p in plist):
            plist.append({"id": int(uid), "role": role, "name": name})
            session.participants = plist
            session.save()
