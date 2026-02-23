from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SocialPost, SocialLike, SocialComment, Connection, ChatSession, SupportTicket
from .serializers import SocialPostSerializer, SocialCommentSerializer, SupportTicketSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
import uuid
from django.utils import timezone
from datetime import timedelta

class SocialFeedViewSet(viewsets.ModelViewSet):
    """
    Handles institutional professional hub, following, and posts.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    queryset = SocialPost.objects.all().order_by('-created_at')
    serializer_class = SocialPostSerializer

    def perform_create(self, serializer):
        user = self.request.user
        first = getattr(user, 'first_name', '')
        last = getattr(user, 'last_name', '')
        author_name = f"{first} {last}".strip() or user.email
        
        serializer.save(
            author_id=user.id,
            author_role=getattr(user, 'role', 'STUDENT'),
            author_name=author_name
        )

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        like, created = SocialLike.objects.get_or_create(
            post=post,
            user_id=request.user.id,
            user_role=request.user.role
        )
        if not created:
            like.delete()
            post.likes_count = max(0, post.likes_count - 1)
            post.save()
            return success_response("Post unliked", data={"likes": post.likes_count})
        
        post.likes_count += 1
        post.save()
        return success_response("Post liked", data={"likes": post.likes_count})

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        post = self.get_object()
        content = request.data.get('content')
        if not content:
            return error_response("Comment content required.")
            
        from django.db import models # Ensure models is available for Q queries
        user = request.user
        first = getattr(user, 'first_name', '')
        last = getattr(user, 'last_name', '')
        user_name = f"{first} {last}".strip() or user.email

        comment = SocialComment.objects.create(
            post=post,
            user_id=request.user.id,
            user_role=request.user.role,
            user_name=user_name,
            content=content
        )
        post.comments_count += 1
        post.save()
        
        return success_response("Comment added", data={"comment_id": comment.id})

    @action(detail=False, methods=['get'])
    def my_network(self, request):
        """Standardized professional network overview."""
        my_id = self._get_my_profile_id(request.user)
        user_role = getattr(request.user, 'role', 'STUDENT')

        if user_role == 'SUPER_ADMIN':
            return success_response("Network stats synchronized.", data={
                "following_count": 0,
                "followers_count": 0,
                "friends_count": 0,
                "pending_requests_count": 0,
            })

        # Following: Anyone I follow (status ACCEPTED/FOLLOWING) + Mutual Friends
        following = Connection.objects.filter(
            follower_id=my_id, 
            follower_role=user_role,
            status__in=['ACCEPTED', 'FOLLOWING', 'FRIENDS']
        ).count()

        # Followers: Anyone following me + Mutual Friends
        followers = Connection.objects.filter(
            following_id=my_id, 
            following_role=user_role,
            status__in=['ACCEPTED', 'FOLLOWING', 'FRIENDS']
        ).count()

        # Friends: Bilateral connections
        friends = Connection.objects.filter(
            (models.Q(follower_id=my_id, follower_role=user_role) | models.Q(following_id=my_id, following_role=user_role)),
            status='FRIENDS'
        ).count()

        # Requests sent to me
        requests = Connection.objects.filter(
            following_id=my_id, 
            following_role=user_role, 
            status='PENDING'
        ).count()
        
        return success_response("Network stats synchronized.", data={
            "following_count": following,
            "followers_count": followers,
            "friends_count": friends,
            "pending_requests_count": requests,
        })

    @action(detail=False, methods=['get'])
    def requests(self, request):
        """List pending connection requests sent to the user."""
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        my_id = self._get_my_profile_id(request.user)
        role = request.user.role
        
        pending = Connection.objects.filter(following_id=my_id, following_role=role, status='PENDING')
        results = []
        for req in pending:
            sender_name = "System User"
            
            # Resolve sender based on their record type
            if req.follower_role == 'STUDENT':
                s = StudentAcademicRegistry.objects.filter(id=req.follower_id).first()
                if s: sender_name = s.full_name
            elif req.follower_role == 'FACULTY':
                f = FacultyAcademicRegistry.objects.filter(id=req.follower_id).first()
                if f: sender_name = f.full_name
            elif req.follower_role in ('INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN'):
                a = AdminAuthorizedAccount.objects.filter(id=req.follower_id).first()
                if a: sender_name = f"{a.first_name} {a.last_name}".strip() or a.email

            results.append({
                "request_id": req.id,
                "sender_id": req.follower_id,
                "sender_name": sender_name,
                "sender_role": req.follower_role,
                "created_at": req.created_at
            })
        return success_response("Pending requests", data=results)

    @action(detail=True, methods=['post'])
    def respond_request(self, request, pk=None):
        """Accept or Decline a connection request."""
        action_type = request.data.get('action') # 'ACCEPT' or 'DECLINE'
        my_id = self._get_my_profile_id(request.user)
        try:
            conn = Connection.objects.get(id=pk)
            if int(conn.following_id) != int(my_id):
                return error_response("Unauthorized to respond to this request.", code=403)
                
            if action_type == 'ACCEPT':
                conn.status = 'FRIENDS'
                conn.save()

                # Notify the person who sent the request
                from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
                sender_email = None
                if conn.follower_role == 'STUDENT':
                    s = StudentAcademicRegistry.objects.filter(id=conn.follower_id).first()
                    if s: sender_email = s.official_email or s.personal_email
                elif conn.follower_role == 'FACULTY':
                    f = FacultyAcademicRegistry.objects.filter(id=conn.follower_id).first()
                    if f: sender_email = f.email
                elif conn.follower_role in ('INST_ADMIN', 'INSTITUTION_ADMIN'):
                    a = AdminAuthorizedAccount.objects.filter(id=conn.follower_id).first()
                    if a: sender_email = a.email

                if sender_email:
                    self._notify_user(
                        sender_email,
                        "Request Accepted",
                        f"{request.user.email} is now a connection. Start collaborating!",
                        "/chat-hub"
                    )

                return success_response("Connection accepted.")
            else:
                conn.delete()
                return success_response("Request declined.")
        except Connection.DoesNotExist:
            return error_response("Request not found.", code=404)

    @action(detail=False, methods=['get'])
    def discover(self, request):
        """Universal Discovery: Students, Faculty, and Admins."""
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        search = request.query_params.get('search', '')
        my_id = self._get_my_profile_id(request.user)
        user_role = getattr(request.user, 'role', 'STUDENT')
        
        # Exclude ALREADY connected from current follower's perspective
        connected_ids_roles = Connection.objects.filter(
            follower_id=my_id, follower_role=user_role
        ).values('following_id', 'following_role')
        
        # Helper to convert to list of combinations
        connected_set = set((c['following_id'], c['following_role']) for c in connected_ids_roles)
        
        data = []

        # 1. Students
        s_qs = StudentAcademicRegistry.objects.all()
        if search: s_qs = s_qs.filter(full_name__icontains=search)
        for s in s_qs[:10]:
            if (s.id, 'STUDENT') not in connected_set and not (my_id == s.id and user_role == 'STUDENT'):
                data.append({"id": s.id, "name": s.full_name, "role": "STUDENT", "avatar": s.full_name[0]})

        # 2. Faculty
        f_qs = FacultyAcademicRegistry.objects.all()
        if search: f_qs = f_qs.filter(full_name__icontains=search)
        for f in f_qs[:10]:
            if (f.id, 'FACULTY') not in connected_set and not (my_id == f.id and user_role == 'FACULTY'):
                data.append({"id": f.id, "name": f.full_name, "role": "FACULTY", "avatar": f.full_name[0]})

        # 3. Admins
        a_qs = AdminAuthorizedAccount.objects.all()
        if search: a_qs = a_qs.filter(models.Q(first_name__icontains=search) | models.Q(last_name__icontains=search))
        for a in a_qs[:5]:
            name = f"{a.first_name} {a.last_name}".strip() or a.email
            role_val = getattr(a, 'role', 'INST_ADMIN')
            if (a.id, role_val) not in connected_set and not (my_id == a.id and user_role == role_val):
                data.append({"id": a.id, "name": name, "role": role_val, "avatar": name[0]})

        return success_response("Discovery list retrieved", data=data)

    def _get_my_profile_id(self, user):
        """Standardized ID resolution: Registry ID for students/faculty, Auth ID for admins."""
        if not user: return None
        role = getattr(user, 'role', 'STUDENT')
        if role == "STUDENT":
            return user.academic_ref.id if hasattr(user, 'academic_ref') and user.academic_ref else user.id
        if role == "FACULTY":
            return user.academic_ref.id if hasattr(user, 'academic_ref') and user.academic_ref else user.id
        return user.id

    @action(detail=False, methods=['post'])
    def connect(self, request):
        """Send a friend request (Connection with PENDING status)."""
        target_id = request.data.get('target_id')
        target_role = request.data.get('target_role', 'STUDENT')
        
        my_id = self._get_my_profile_id(request.user)
        user_role = request.user.role
        
        if int(target_id) == my_id and target_role == user_role:
            return error_response("Cannot connect with yourself.")

        # Check for existing connection
        existing = Connection.objects.filter(
            follower_id=my_id,
            follower_role=user_role,
            following_id=target_id,
            following_role=target_role
        ).first()
        
        if existing:
            return error_response(f"Already {existing.status.lower()}.")

        Connection.objects.create(
            follower_id=my_id,
            follower_role=user_role,
            following_id=target_id,
            following_role=target_role,
            status='PENDING'
        )

        # Trigger Notification for Target
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        target_email = None
        if target_role == 'STUDENT':
            s = StudentAcademicRegistry.objects.filter(id=target_id).first()
            if s: target_email = s.official_email or s.personal_email
        elif target_role == 'FACULTY':
            f = FacultyAcademicRegistry.objects.filter(id=target_id).first()
            if f: target_email = f.email
        elif target_role in ('INST_ADMIN', 'INSTITUTION_ADMIN'):
            a = AdminAuthorizedAccount.objects.filter(id=target_id).first()
            if a: target_email = a.email

        if target_email:
            first = getattr(request.user, 'first_name', '')
            last = getattr(request.user, 'last_name', '')
            requester_name = f"{first} {last}".strip() or request.user.email
            
            self._notify_user(
                target_email, 
                "New Connection Request", 
                f"{requester_name} ({request.user.role}) wants to connect.",
                "/professional-hub?review=1"
            )

        return success_response("Connection request dispatched.")

    def _notify_user(self, email, title, message, link):
        from apps.notifications.models import Notification
        from apps.identity.models import User
        from django_tenants.utils import schema_context
        
        user_obj = None
        with schema_context('public'):
            user_obj = User.objects.filter(email=email).first()
            
        if user_obj:
            Notification.objects.create(
                recipient_id=user_obj.id,
                title=title,
                message=message,
                notification_type='COMMUNICATION',
                link_url=link
            )
                
            # WebSocket Push
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_sessions_{user_obj.id}_{user_obj.role}",
                    {
                        "type": "session_update",
                        "data": {
                            "action": "new_notification",
                            "title": title,
                            "message": message,
                            "link_url": link
                        }
                    }
                )

    @action(detail=False, methods=['post'])
    def follow(self, request):
        """One-way follow (ACCEPTED status)."""
        target_id = request.data.get('target_id')
        target_role = request.data.get('target_role', 'STUDENT')
        my_id = self._get_my_profile_id(request.user)
        user_role = request.user.role

        Connection.objects.update_or_create(
            follower_id=my_id,
            follower_role=user_role,
            following_id=target_id,
            following_role=target_role,
            defaults={'status': 'ACCEPTED'}
        )
        return success_response("Followed successfully.")

    @action(detail=False, methods=['get'])
    def connections(self, request):
        """List detailed profiles of people I'm connected with."""
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        my_id = self._get_my_profile_id(request.user)
        user_role = request.user.role

        # 1. Who am I following? (Excluding pending)
        following_conns = Connection.objects.filter(
            follower_id=my_id, 
            follower_role=user_role, 
            status__in=['ACCEPTED', 'FOLLOWING', 'FRIENDS']
        )
        # 2. Who is following me? (Excluding pending)
        follower_conns = Connection.objects.filter(
            following_id=my_id, 
            following_role=user_role, 
            status__in=['ACCEPTED', 'FOLLOWING', 'FRIENDS']
        )
        # 3. Mutual Connections (Friends)
        friends_conns = Connection.objects.filter(
            (models.Q(follower_id=my_id, follower_role=user_role) | models.Q(following_id=my_id, following_role=user_role)),
            status='FRIENDS'
        )

        def resolve_profile(uid, role):
            name = "Unknown User"
            if role == 'STUDENT':
                s = StudentAcademicRegistry.objects.filter(id=uid).first()
                if s: name = s.full_name
            elif role == 'FACULTY':
                f = FacultyAcademicRegistry.objects.filter(id=uid).first()
                if f: name = f.full_name
            elif role in ('INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN'):
                a = AdminAuthorizedAccount.objects.filter(id=uid).first()
                if a: name = f"{a.first_name} {a.last_name}".strip() or a.email
            
            # Presence Check (Public Registry)
            from apps.identity.models import LoginSession
            from django_tenants.utils import schema_context
            from django.utils import timezone
            from datetime import timedelta
            
            online = False
            last_seen = None
            with schema_context('public'):
                session = LoginSession.objects.filter(tenant_user_id=uid, role=role).order_by('-last_active').first()
                if session:
                    last_seen = session.last_active
                    if session.is_active and session.last_active > timezone.now() - timedelta(minutes=5):
                        online = True

            return {
                "id": uid, 
                "role": role, 
                "name": name, 
                "avatar": name[0] if name else "?",
                "is_online": online,
                "last_seen": last_seen,
                "connection_id": None # Placeholder, filled by caller
            }

        friends_list = []
        for c in friends_conns:
            other_id = c.following_id if int(c.follower_id) == int(my_id) and c.follower_role == user_role else c.follower_id
            other_role = c.following_role if int(c.follower_id) == int(my_id) and c.follower_role == user_role else c.follower_role
            friends_list.append({**resolve_profile(other_id, other_role), "status": c.status, "connection_id": c.id})

        results = {
            "following": [
                {**resolve_profile(c.following_id, c.following_role), "status": c.status, "connection_id": c.id}
                for c in following_conns
            ],
            "followers": [
                {**resolve_profile(c.follower_id, c.follower_role), "status": c.status, "connection_id": c.id}
                for c in follower_conns
            ],
            "connections": friends_list
        }
        return success_response("Connections retrieved", data=results)

    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        """Remove a connection or follow."""
        my_id = self._get_my_profile_id(request.user)
        user_role = request.user.role
        
        # Connection could be where I am follower OR where I am following (if friend)
        conn = Connection.objects.filter(
            models.Q(id=pk) & 
            (models.Q(follower_id=my_id, follower_role=user_role) | 
             models.Q(following_id=my_id, following_role=user_role))
        ).first()

        if not conn:
            return error_response("Connection not found.")

        conn.delete()
        return success_response("Disconnected successfully.")

class SupportViewSet(viewsets.ModelViewSet):
    """
    Automated bug fixes and issue self-healing hub.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketSerializer

    def perform_create(self, serializer):
        # Auto-diagnose on create
        ticket = serializer.save()
        from apps.core_brain.services import SelfHealingSupportService
        SelfHealingSupportService.auto_diagnose(ticket.id)

class ChatViewSet(viewsets.ViewSet):
    """
    Orchestrates live chat sessions.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]

    @action(detail=False, methods=['get'])
    def list_sessions(self, request):
        """Fetch all chat threads that aren't deleted for me."""
        my_id = SocialFeedViewSet._get_my_profile_id(self, request.user)
        user_role = request.user.role
        
        # Filter sessions where I am a participant and I haven't 'deleted' it
        # Since participants is a JSON list, we use a manual filter for reliability across DB engines
        # Database-level filtering for JSON participants
        all_sessions = ChatSession.objects.filter(
            participants__contains=[{"id": int(my_id), "role": user_role}]
        ).order_by('-last_message_at')
        
        results = []
        from .security import SecureVaultService
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        
        for s in all_sessions:
            # Skip if I've 'deleted' this conversation (individual removal)
            if s.deleted_for and f"{user_role}-{my_id}" in s.deleted_for:
                continue

            if s.is_group:
                other_name = s.name or "Secure Workgroup"
                orole = "GROUP"
                oid = 0
            else:
                other = next((p for p in s.participants if not (int(p['id']) == int(my_id) and p['role'] == user_role)), s.participants[0])
                orole = other.get('role', 'STUDENT')
                oid = other.get('id')
                other_name = other.get('name', 'Unknown Peer')
                if not other_name or other_name == "Unknown User":
                    if orole == 'STUDENT':
                        p = StudentAcademicRegistry.objects.filter(id=oid).first()
                        if p: other_name = p.full_name
                    elif orole == 'FACULTY':
                        p = FacultyAcademicRegistry.objects.filter(id=oid).first()
                        if p: other_name = p.full_name
                    elif orole in ('INST_ADMIN', 'ADMIN'):
                        p = AdminAuthorizedAccount.objects.filter(id=oid).first()
                        if p: other_name = f"{p.first_name} {p.last_name}".strip() or p.email

            # Last Message Preview (Decrypted)
            last_msg = s.messages.order_by('-timestamp').first()
            preview = ""
            if last_msg:
                preview = SecureVaultService.decrypt(last_msg.content)
                if len(preview) > 30: preview = preview[:30] + "..."

            # Resolve Presence (Last Seen / Live) - tenant isolated
            from apps.identity.models import LoginSession
            from django_tenants.utils import schema_context
            from datetime import timedelta
            
            online = False
            last_seen = None
            schema = request.tenant.schema_name
            with schema_context('public'):
                psess = LoginSession.objects.filter(
                    tenant_user_id=oid, 
                    role=orole,
                    tenant_schema=schema
                ).order_by('-last_active').first()
                if psess:
                    last_seen = psess.last_active
                    if psess.is_active and psess.last_active > timezone.now() - timedelta(minutes=5):
                        online = True

            results.append({
                "id": s.id,
                "session_id": s.session_id,
                "other_name": other_name,
                "other_role": orole,
                "other_id": oid,
                "last_msg_at": s.last_message_at,
                "last_msg_preview": preview,
                "is_group": s.is_group,
                "unread_count": s.messages.filter(is_read=False).exclude(sender_id=my_id).count(),
                "is_online": online,
                "last_seen": last_seen
            })
            
        return success_response("Secure sessions retrieved", data=results)

    @action(detail=False, methods=['get'])
    def messages(self, request):
        """Fetch history with E2EE Vault decryption."""
        session_id = request.query_params.get('session_id')
        if not session_id:
            return error_response("session_id required.")
            
        from .security import SecureVaultService
        from .models import ChatMessage
        
        msgs = ChatMessage.objects.filter(session__session_id=session_id).order_by('timestamp')
        my_id = SocialFeedViewSet._get_my_profile_id(self, request.user)
        
        results = []
        for m in msgs:
            results.append({
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "content": SecureVaultService.decrypt(m.content),
                "attachment_url": m.attachment_file.url if m.attachment_file else None,
                "attachment_type": m.attachment_type,
                "timestamp": m.timestamp,
                "is_me": int(m.sender_id) == int(my_id),
                "is_read": m.is_read,
                "read_at": m.read_at
            })
        
        # Mark as read (Async trigger usually, but direct for now)
        msgs.exclude(sender_id=my_id).update(is_read=True, read_at=timezone.now())
        
        return success_response("Decrypted messages retrieved", data=results)

    @action(detail=False, methods=['post'])
    def start_chat(self, request):
        """Standardized Handshake: Bilateral connection required."""
        other_user_id = request.data.get('user_id')
        other_user_role = request.data.get('role', 'STUDENT')
        my_id = SocialFeedViewSet._get_my_profile_id(self, request.user)
        my_role = request.user.role

        # 🛡️ THE HANDSHAKE: Strict Connection Verification
        valid = Connection.objects.filter(
            (models.Q(follower_id=my_id, follower_role=my_role, following_id=other_user_id, following_role=other_user_role) |
             models.Q(following_id=my_id, following_role=my_role, follower_id=other_user_id, follower_role=other_user_role)),
            status='FRIENDS'
        ).exists()

        if not valid:
            return error_response("Handshake required. You must be connected (FRIENDS) to initiate secure collaboration.", code=403)

        # Proceed to session setup
        from django.db.models import Count
        session = ChatSession.objects.filter(is_group=False).filter(
            participants__contains=[{"id": int(other_user_id), "role": other_user_role}]
        ).filter(
            participants__contains=[{"id": int(my_id), "role": my_role}]
        ).first()
        
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        def resolve_name(uid, role):
            if role == 'STUDENT':
                p = StudentAcademicRegistry.objects.filter(id=uid).first()
                return p.full_name if p else "Student"
            elif role == 'FACULTY':
                p = FacultyAcademicRegistry.objects.filter(id=uid).first()
                return p.full_name if p else "Faculty"
            else:
                p = AdminAuthorizedAccount.objects.filter(id=uid).first()
                return f"{p.first_name} {p.last_name}".strip() if p else "Admin"

        if not session:
            session = ChatSession.objects.create(
                participants=[
                    {"id": int(my_id), "role": my_role, "name": resolve_name(my_id, my_role)},
                    {"id": int(other_user_id), "role": other_user_role, "name": resolve_name(other_user_id, other_user_role)}
                ]
            )
        
        # 🔄 Clean up deleted_for if it was previously removed
        marker = f"{my_role}-{my_id}"
        if session.deleted_for and marker in session.deleted_for:
            session.deleted_for.remove(marker)
            session.save()

        return success_response("Secure channel established.", data={"session_id": session.session_id})

    @action(detail=False, methods=['post'])
    def start_group_chat(self, request):
        """Standardized Handshake: Bilateral connection required with all peers for group."""
        peers = request.data.get('peers', []) # List of {id, role}
        group_name = request.data.get('name', 'Secure Workgroup')
        my_id = SocialFeedViewSet._get_my_profile_id(self, request.user)
        my_role = request.user.role

        if len(peers) < 1:
            return error_response("Group requires at least one peer.")

        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        def resolve_name(uid, role):
            if role == 'STUDENT':
                p = StudentAcademicRegistry.objects.filter(id=uid).first()
                return p.full_name if p else "Student"
            elif role == 'FACULTY':
                p = FacultyAcademicRegistry.objects.filter(id=uid).first()
                return p.full_name if p else "Faculty"
            else:
                p = AdminAuthorizedAccount.objects.filter(id=uid).first()
                return f"{p.first_name} {p.last_name}".strip() if p else "Admin"

        participants = [{"id": int(my_id), "role": my_role, "name": resolve_name(my_id, my_role)}]

        for peer in peers:
            oid = peer.get('id')
            orole = peer.get('role', 'STUDENT')
            
            # 🛡️ THE HANDSHAKE
            valid = Connection.objects.filter(
                (models.Q(follower_id=my_id, follower_role=my_role, following_id=oid, following_role=orole) |
                 models.Q(following_id=my_id, following_role=my_role, follower_id=oid, follower_role=orole)),
                status='FRIENDS'
            ).exists()

            if not valid:
                return error_response("Handshake required. You must be connected to all peers to form a group.", code=403)
                
            participants.append({"id": int(oid), "role": orole, "name": resolve_name(oid, orole)})

        session = ChatSession.objects.create(
            is_group=True,
            name=group_name,
            participants=participants
        )
        return success_response("Group channel established.", data={"session_id": session.session_id})

    @action(detail=False, methods=['post'])
    def delete_session(self, request):
        """Individual removal of a conversation thread."""
        session_id = request.data.get('session_id')
        my_id = SocialFeedViewSet._get_my_profile_id(self, request.user)
        marker = f"{request.user.role}-{my_id}"
        
        session = ChatSession.objects.filter(session_id=session_id).first()
        if session:
            if marker not in session.deleted_for:
                session.deleted_for.append(marker)
                session.save()
            return success_response("Conversation removed from your view.")
        return error_response("Session not found.")
