from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db import transaction
from apps.social.models import ChatSession
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.utils import get_profile_id, resolve_profile

class ParticipantViewSet(viewsets.ViewSet):
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_id(self, request):
        return get_profile_id(request.user)

    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        """Disconnect self from group participant list."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session lost.")
        
        my_id = self._get_my_id(request)
        role = request.user.role
        
        # Point 6: Inst Admin not allowed to leave
        if role == 'INST_ADMIN':
            return error_response("Inst Admin cannot leave their institutional threads.")

        with transaction.atomic():
            new_participants = [p for p in session.participants if not (int(p['id']) == int(my_id) and p['role'] == role)]
            session.participants = new_participants
            
            # Record deletion locally
            if not session.deleted_for: session.deleted_for = []
            session.deleted_for.append(f"{role}-{my_id}")
            
            session.save()
            
        return success_response("Membership terminated.")

    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        """Admin logic to eject individuals."""
        session = ChatSession.objects.filter(session_id=pk).first()
        my_role = request.user.role
        
        # Security: Only admins can remove others
        if my_role not in ['INST_ADMIN', 'ADMIN']:
            return error_response("Unauthorized", code=403)
            
        target_id = request.data.get('user_id')
        target_role = request.data.get('role')
        
        with transaction.atomic():
            session.participants = [p for p in session.participants if not (int(p['id']) == int(target_id) and p['role'] == target_role)]
            session.save()
            
        return success_response("Participant removed.")
