from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db.models import Q
from apps.social.models import Connection
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.utils import get_profile_id, resolve_profile

class NetworkViewSet(viewsets.ViewSet):
    """
    Handles institutional professional network, connections, and discovery.
    Unified under ChatHub for high-performance interaction.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_id(self, request):
        return get_profile_id(request.user)

    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        my_id = self._get_my_id(request)
        user_role = getattr(request.user, 'role', 'STUDENT')

        following = Connection.objects.filter(
            follower_id=my_id, follower_role=user_role,
            status__in=['ACCEPTED', 'FOLLOWING', 'FRIENDS']
        ).count()

        followers = Connection.objects.filter(
            following_id=my_id, following_role=user_role,
            status__in=['ACCEPTED', 'FOLLOWING', 'FRIENDS']
        ).count()

        friends = Connection.objects.filter(
            (Q(follower_id=my_id, follower_role=user_role) | Q(following_id=my_id, following_role=user_role)),
            status='FRIENDS'
        ).count()

        requests = Connection.objects.filter(
            following_id=my_id, following_role=user_role, status='PENDING'
        ).count()
        
        return success_response("Stats retrieved", data={
            "following_count": following,
            "followers_count": followers,
            "friends_count": friends,
            "pending_requests_count": requests,
        })

    @action(detail=False, methods=['get'])
    def discover(self, request):
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry
        from apps.identity.models import User
        search = request.query_params.get('search', '')
        my_id = self._get_my_id(request)
        user_role = getattr(request.user, 'role', 'STUDENT')
        
        connected_ids_roles = Connection.objects.filter(
            follower_id=my_id, follower_role=user_role
        ).values('following_id', 'following_role')
        
        connected_set = set((c['following_id'], c['following_role']) for c in connected_ids_roles)
        data = []

        # SuperAdmins (Visible to InstAdmins)
        if user_role in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN']:
            sa_qs = User.objects.filter(role='SUPER_ADMIN')
            if search: sa_qs = sa_qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
            for sa in sa_qs[:5]:
                 if (sa.id, 'SUPER_ADMIN') not in connected_set:
                     data.append({
                         "id": sa.id, 
                         "name": "Nexora Global Support", 
                         "role": "SUPER_ADMIN", 
                         "avatar": "🤖",
                         "is_ai_support": True
                     })

        # Students
        s_qs = StudentAcademicRegistry.objects.all()
        if search: s_qs = s_qs.filter(full_name__icontains=search)
        for s in s_qs[:10]:
            if (s.id, 'STUDENT') not in connected_set and not (my_id == s.id and user_role == 'STUDENT'):
                data.append({"id": s.id, "name": s.full_name, "role": "STUDENT", "avatar": s.full_name[0]})

        # Faculty
        f_qs = FacultyAcademicRegistry.objects.all()
        if search: f_qs = f_qs.filter(full_name__icontains=search)
        for f in f_qs[:10]:
            if (f.id, 'FACULTY') not in connected_set and not (my_id == f.id and user_role == 'FACULTY'):
                data.append({"id": f.id, "name": f.full_name, "role": "FACULTY", "avatar": f.full_name[0]})

        return success_response("Discovery list retrieved", data=data)

    @action(detail=False, methods=['get'])
    def connections(self, request):
        my_id = self._get_my_id(request)
        user_role = getattr(request.user, 'role', 'STUDENT')

        if user_role == 'SUPER_ADMIN':
            return success_response("Connections retrieved", data={"connections": []})

        # Mutual Connections
        friends_conns = Connection.objects.filter(
            (Q(follower_id=my_id, follower_role=user_role) | Q(following_id=my_id, following_role=user_role)),
            status='FRIENDS'
        )

        results = []
        for c in friends_conns:
            other_id = c.following_id if str(c.follower_id) == str(my_id) and c.follower_role == user_role else c.follower_id
            other_role = c.following_role if str(c.follower_id) == str(my_id) and c.follower_role == user_role else c.follower_role
            results.append({**resolve_profile(other_id, other_role), "connection_id": c.id})

        return success_response("Connections retrieved", data={"connections": results})

    @action(detail=False, methods=['post'])
    def connect(self, request):
        target_id = request.data.get('target_id')
        target_role = request.data.get('target_role', 'STUDENT')
        my_id = self._get_my_id(request)
        user_role = request.user.role
        
        conn, created = Connection.objects.get_or_create(
            follower_id=my_id, follower_role=user_role,
            following_id=target_id, following_role=target_role,
            defaults={'status': 'PENDING'}
        )
        return success_response("Handshake initiated.")

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Point 16: Fast Instagram-style search for connections."""
        query = request.query_params.get('q', '').strip()
        my_id = self._get_my_id(request)
        role = request.user.role
        
        if not query:
            return success_response("Search idle", data=[])

        # Security: Admins should search everyone. Regular users search connections.
        is_admin = role in ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN', 'FACULTY']
        
        connections = Connection.objects.filter(
            Q(follower_id=my_id, follower_role=role) |
            Q(following_id=my_id, following_role=role),
            status='ACCEPTED'
        )
        
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry
        
        # Broad Search logic
        students = StudentAcademicRegistry.objects.filter(
            Q(full_name__icontains=query) | Q(roll_number__icontains=query)
        ).only('id', 'full_name', 'roll_number')[:15]
        
        faculty = FacultyAcademicRegistry.objects.filter(
            Q(full_name__icontains=query)
        ).only('id', 'full_name')[:10]
        
        results = []
        for s in students:
            connected = connections.filter(Q(follower_id=s.id, follower_role='STUDENT') | Q(following_id=s.id, following_role='STUDENT')).exists()
            if is_admin or connected:
                results.append({
                    "id": s.id, "role": "STUDENT", "name": s.full_name, "sub": s.roll_number,
                    "is_connected": connected
                })
        for f in faculty:
             connected = connections.filter(Q(follower_id=f.id, follower_role='FACULTY') | Q(following_id=f.id, following_role='FACULTY')).exists()
             if is_admin or connected:
                results.append({
                    "id": f.id, "role": "FACULTY", "name": f.full_name, "sub": "Faculty",
                    "is_connected": connected
                })

        return success_response("Network scan complete", data=results)

