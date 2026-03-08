from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
import uuid
import logging
from apps.social.models import ChatSession, ChatMessage
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.security import SecureVaultService
from apps.social.utils import get_profile_id, resolve_profile
from django.utils import timezone

class MessageViewSet(viewsets.ViewSet):
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_id(self, request):
        return get_profile_id(request.user)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Fetch chat history with decription."""
        session = ChatSession.objects.filter(session_id=pk).first()
        if not session: return error_response("Session group unreachable.")
        
        my_id = self._get_my_id(request)
        role = request.user.role
        
        # Security: check membership or public access
        is_member = any(int(p['id']) == int(my_id) and p['role'] == role for p in session.participants)
        if not is_member and not session.open_invite:
            return error_response("Access Denied", code=403)

        msgs = session.messages.all().order_by('timestamp')
        results = []
        
        for m in msgs:
            # Point 7: Message Metadata (Seen/Delivered)
            status = "SENT"
            tracking = m.status_tracking or {}
            
            if session.is_group:
                seen_by = [k for k, v in tracking.items() if v.get('seen_at')]
                if len(seen_by) >= len(session.participants) - 1:
                    status = "SEEN"
                elif any(v.get('delivered_at') for v in tracking.values()):
                    status = "DELIVERED"
            else:
                other_key = next((k for k in tracking.keys() if not k.startswith(f"{my_id}_{role}")), None)
                if other_key:
                    track = tracking[other_key]
                    if track.get('seen_at'): status = "SEEN"
                    elif track.get('delivered_at'): status = "DELIVERED"

            results.append({
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "content": str(SecureVaultService.decrypt(m.content)),
                "attachment_url": m.attachment_file.url if m.attachment_file else None,
                "attachment_type": m.attachment_type,
                "timestamp": m.timestamp,
                "is_me": int(m.sender_id) == int(my_id),
                "status": status,
                "metadata": m.metadata
            })
        
        return success_response("History synchronized.", data=results)

    @action(detail=True, methods=['get'])
    def status_info(self, request, pk=None):
        """Point 7: info view showing Seen by, Delivered to."""
        msg = get_object_or_404(ChatMessage, id=pk)
        session = msg.session
        
        delivered_to = []
        seen_by = []
        
        for p in session.participants:
            key = f"{p['id']}_{p['role']}"
            if key == f"{msg.sender_id}_{msg.sender_role}": continue
            
            track = msg.status_tracking.get(key, {})
            profile = resolve_profile(p['id'], p['role'])
            
            if track.get('seen_at'):
                seen_by.append({"name": profile.get('name'), "time": track['seen_at']})
            elif track.get('delivered_at'):
                delivered_to.append({"name": profile.get('name'), "time": track['delivered_at']})

        return success_response("Message metrics", data={
            "delivered_to": delivered_to,
            "seen_by": seen_by,
            "timestamp": msg.timestamp
        })
