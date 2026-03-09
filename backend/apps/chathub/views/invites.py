from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.utils import timezone
from apps.social.models import ChatSession, JoinRequest
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.utils import get_profile_id, resolve_profile
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.notifications.services import NotificationDispatcher
from django_tenants.utils import schema_context
import uuid
import json

class InviteViewSet(viewsets.ViewSet):
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _notify_admins(self, session, title, message):
        """Dispatches real-time alerts to institution-level authorities."""
        from apps.identity.models import InstitutionAdmin
        channel_layer = get_channel_layer()
        
        # Determine target admins (Across institution)
        with schema_context('public'):
            admins = InstitutionAdmin.objects.all() # Logic can be refined to filter by ID
            for admin in admins:
                group_name = f"user_sessions_{admin.user_id}_INST_ADMIN"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "user_notification",
                        "data": {
                            "title": title,
                            "message": message,
                            "notification_type": "JOIN_REQUEST",
                            "session_id": str(session.session_id)
                        }
                    }
                )

    def _notify_student(self, user_id, title, message, session_id):
        """Binary feedback loop for student access resolution."""
        channel_layer = get_channel_layer()
        group_name = f"user_sessions_{user_id}_STUDENT"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "user_notification",
                "data": {
                    "title": title,
                    "message": message,
                    "notification_type": "JOIN_RESPONSE",
                    "session_id": str(session_id)
                }
            }
        )

    def _get_my_profile(self, request):
        my_id = get_profile_id(request.user)
        role = getattr(request.user, 'role', 'STUDENT')
        prof = resolve_profile(my_id, role)
        return my_id, role, prof.get('name', 'User')

    @action(detail=False, methods=['post'], url_path='join/(?P<token>[^/.]+)')
    def join_via_link(self, request, token=None):
        """Point 3: Join via invite_link_token with Expiry & Open Mode."""
        session = ChatSession.objects.filter(invite_link_token=token).first()
        if not session: 
            # Detect if this token belongs to a different institution (cross-tenant probe)
            try:
                from django_tenants.utils import get_tenant_model
                TenantModel = get_tenant_model()
                for tenant in TenantModel.objects.exclude(schema_name='public'):
                    if tenant.schema_name != request.tenant.schema_name:
                        with schema_context(tenant.schema_name):
                            if ChatSession.objects.filter(invite_link_token=token).exists():
                                return error_response(f"Protocol link belongs to a different institution. Cross-institution entry is not permitted.")
            except Exception:
                pass
            return error_response("Protocol link invalid or has been decommissioned.")

        # Check Expiry
        if session.invite_expiry_at and session.invite_expiry_at < timezone.now():
            return error_response("Communication channel link has expired.")

        my_id, role, name = self._get_my_profile(request)
        
        # Check eligibility unless Open Invite Mode is ACTIVE
        if not session.open_invite:
            drive_id = session.participants_metadata.get('drive_id')
            if drive_id:
                from apps.placement.models import PlacementDrive, PlacementApplication
                from apps.placement.services.eligibility_engine import EligibilityEngine
                
                drive = PlacementDrive.objects.filter(id=drive_id).first()
                if drive:
                    is_eligible = EligibilityEngine.is_student_eligible(drive, my_id) if role == 'STUDENT' else True
                    has_applied = PlacementApplication.objects.filter(drive=drive, student_id=my_id).exists() if role == 'STUDENT' else True
                    
                    if role == 'STUDENT':
                        if not is_eligible: 
                            return success_response("Not Eligible", data={"status": "NOT_ELIGIBLE", "msg": "Intelligence analysis suggests you are not eligible for this sequence."})
                        if not has_applied: 
                            return success_response("Apply First", data={"status": "APPLY_FIRST", "msg": "Protocol requires application established before room synchronization."})

        # Case 1: Join
        self._add_to_session(session, my_id, role, name)
        return success_response("Handshake complete. Synchronization successful.", data={"session_id": session.session_id})

    @action(detail=False, methods=['post'])
    def request_access(self, request):
        """Point 5: Student clicks 'Request Access'."""
        session_id = request.data.get('session_id')
        session = ChatSession.objects.filter(session_id=session_id).first()
        if not session: return error_response("Session not found.")
        
        my_id, role, name = self._get_my_profile(request)
        
        JoinRequest.objects.get_or_create(
            session=session,
            user_id=my_id,
            user_role=role,
            user_name=name,
            status='PENDING'
        )
        
        # Point 15: Notify Admins Lively
        self._notify_admins(session, "Room Access Request", f"{name} ({role}) is requesting synchronization with {session.name}.")
        
        return success_response("Request sent to Institutional Admin.")

    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        """Admin panel: view pending join requests."""
        if request.user.role not in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN']:
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
        if request.user.role not in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN']:
             return error_response("Unauthorized", code=403)
             
        join_req = get_object_or_404(JoinRequest, id=pk)
        action_type = request.data.get('action') # APPROVE / REJECT
        
        if action_type == 'APPROVE':
            join_req.status = 'APPROVED'
            join_req.resolved_at = timezone.now()
            join_req.save()
            
            # Automatically add to session
            self._add_to_session(join_req.session, join_req.user_id, join_req.user_role, join_req.user_name)
            
            # Point 15: Notify Student Lively
            self._notify_student(join_req.user_id, "Protocol Approved", f"You have been granted access to {join_req.session.name}.", join_req.session.session_id)
            
            return success_response("Request approved and user added.")
        else:
            join_req.status = 'REJECTED'
            join_req.resolved_at = timezone.now()
            join_req.save()
            
            # Point 15: Notify Student Lively
            self._notify_student(join_req.user_id, "Protocol Rejected", f"Your request for {join_req.session.name} was denied by governance.", join_req.session.session_id)
            
            return success_response("Request rejected.")

    @action(detail=False, methods=['post'])
    def generate_link(self, request):
        """Admin: generate/refresh a tokenized join link."""
        if request.user.role not in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN']:
             return error_response("Unauthorized. Governance access restricted to Institute Administrators.", code=403)
        
        session_id = request.data.get('session_id')
        session = ChatSession.objects.filter(session_id=session_id).first()
        if not session: return error_response("Session not found.", code=404)
        
        token = str(uuid.uuid4()).replace('-', '')
        session.invite_link_token = token
        session.save()
        
        from django.conf import settings
        link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/chat-hub?token={token}"
        return success_response("Protocol link generated.", data={"invite_link": link, "token": token})

    def _add_to_session(self, session, uid, role, name):
        plist = list(session.participants)
        if not any(int(p['id']) == int(uid) and p['role'] == role for p in plist):
            plist.append({"id": int(uid), "role": role, "name": name})
            session.participants = plist
            session.save()
