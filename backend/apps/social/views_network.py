from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db import models
from .models import Connection
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from .utils import get_profile_id, resolve_profile

class NetworkViewSet(viewsets.ViewSet):
    """
    Handles institutional professional network, connections, and discovery.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        my_id = get_profile_id(request.user)
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
            (models.Q(follower_id=my_id, follower_role=user_role) | models.Q(following_id=my_id, following_role=user_role)),
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
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
        search = request.query_params.get('search', '')
        my_id = get_profile_id(request.user)
        user_role = getattr(request.user, 'role', 'STUDENT')
        
        connected_ids_roles = Connection.objects.filter(
            follower_id=my_id, follower_role=user_role
        ).values('following_id', 'following_role')
        
        connected_set = set((c['following_id'], c['following_role']) for c in connected_ids_roles)
        data = []

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
        my_id = get_profile_id(request.user)
        user_role = request.user.role

        # Mutual Connections
        friends_conns = Connection.objects.filter(
            (models.Q(follower_id=my_id, follower_role=user_role) | models.Q(following_id=my_id, following_role=user_role)),
            status='FRIENDS'
        )

        results = []
        for c in friends_conns:
            other_id = c.following_id if int(c.follower_id) == int(my_id) and c.follower_role == user_role else c.follower_id
            other_role = c.following_role if int(c.follower_id) == int(my_id) and c.follower_role == user_role else c.follower_role
            results.append({**resolve_profile(other_id, other_role), "connection_id": c.id})

        return success_response("Connections retrieved", data={"connections": results})

    @action(detail=False, methods=['post'])
    def connect(self, request):
        target_id = request.data.get('target_id')
        target_role = request.data.get('target_role', 'STUDENT')
        my_id = get_profile_id(request.user)
        user_role = request.user.role
        
        conn, created = Connection.objects.get_or_create(
            follower_id=my_id, follower_role=user_role,
            following_id=target_id, following_role=target_role,
            defaults={'status': 'PENDING'}
        )
        return success_response("Handshake initiated.")
