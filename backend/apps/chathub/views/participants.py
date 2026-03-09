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
        if role in ['INST_ADMIN', 'INSTITUTION_ADMIN']:
            return error_response("Inst Admin cannot leave their institutional threads.")

        with transaction.atomic():
            new_participants = [p for p in session.participants if not (int(p['id']) == int(my_id) and p['role'] == role)]
            session.participants = new_participants
            
            # Record deletion locally
            if not session.deleted_for: session.deleted_for = []
            session.deleted_for.append(f"{role}-{my_id}")
            session.save()

        # Broadcast update
        self._broadcast_metadata(session)
            
        return success_response("Membership terminated.")

    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        """Admin logic to eject individuals."""
        session = ChatSession.objects.filter(session_id=pk).first()
        my_role = request.user.role
        
        # Security: Only admins can remove others
        if my_role not in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN']:
            return error_response("Insufficient authority.", code=403)
            
        target_id = request.data.get('user_id')
        target_role = request.data.get('role')
        
        with transaction.atomic():
            session.participants = [p for p in session.participants if not (int(p['id']) == int(target_id) and p['role'] == target_role)]
            
            # Point 5: Prevent immediate rejoin for kicked members
            meta = session.participants_metadata.copy() if session.participants_metadata else {}
            kicked = meta.get('kicked_participants', [])
            kicked_id = f"{target_role}-{target_id}"
            if kicked_id not in kicked:
                kicked.append(kicked_id)
                meta.update({'kicked_participants': kicked})
                session.participants_metadata = meta
            
            session.save()
        
        self._broadcast_metadata(session)
            
        return success_response("Participant removed.")
    @action(detail=True, methods=['post'])
    def update_settings(self, request, pk=None):
        """Toggle room settings like Announcement Mode."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session lost.")
        
        my_role = request.user.role
        if my_role not in ['INST_ADMIN', 'ADMIN', 'FACULTY']:
            return error_response("Unauthorized", code=403)
            
        read_only = request.data.get('read_only_for_students', False)
        open_invite = request.data.get('open_invite', False)
        invite_expiry_at = request.data.get('invite_expiry_at')
        
        # Merge metadata using update to satisfy linters and ensure safety
        meta = session.participants_metadata or {}
        meta.update({'read_only_for_students': read_only})
        session.participants_metadata = meta
        
        # Save model level fields
        session.open_invite = open_invite
        if invite_expiry_at:
             session.invite_expiry_at = invite_expiry_at
             
        session.save()
        
        self._broadcast_metadata(session)

        return success_response("Governance policy updated.")

    def _broadcast_metadata(self, session):
        """Triggers real-time metadata sync across all connected nodes."""
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{session.session_id}',
            {
                'type': 'metadata_broadcast',
                'session_id': str(session.session_id),
                'participants_count': len(session.participants),
                'open_invite': session.open_invite,
                'metadata': session.participants_metadata
            }
        )
    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        """Admin logic to add individuals."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session lost.")
        
        my_role = request.user.role
        if my_role not in ['INST_ADMIN', 'ADMIN', 'FACULTY']:
            return error_response("Unauthorized", code=403)
            
        target_id = request.data.get('user_id')
        target_role = request.data.get('role')
        target_name = request.data.get('name')
        
        if not target_id or not target_role:
            return error_response("Incomplete target data.")
            
        with transaction.atomic():
            plist = list(session.participants)
            if not any(int(p['id']) == int(target_id) and p['role'] == target_role for p in plist):
                final_name = target_name
                if not final_name:
                    profile = resolve_profile(target_id, target_role)
                    final_name = profile.get('name', 'User')

                plist.append({
                    "id": int(target_id),
                    "role": target_role,
                    "name": final_name
                })
                session.participants = plist
                session.save()

        self._broadcast_metadata(session)
            
        return success_response("Participant integrated.")
