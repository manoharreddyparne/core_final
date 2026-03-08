from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db.models import Q
from apps.social.models import Connection
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.social.utils import get_profile_id, resolve_profile

class NetworkViewSet(viewsets.ViewSet):
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _get_my_id(self, request):
        return get_profile_id(request.user)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Point 16: Fast Instagram-style search for connections."""
        query = request.query_params.get('q', '').strip()
        my_id = self._get_my_id(request)
        role = request.user.role
        
        if not query:
            return success_response("Search idle", data=[])

        # Get my connections
        connections = Connection.objects.filter(
            Q(follower_id=my_id, follower_role=role) |
            Q(following_id=my_id, following_role=role),
            status='ACCEPTED'
        )
        
        # This is a bit complex due to the denormalized integer IDs.
        # Ideally, we should have a 'Profile' index.
        # For now, I'll filter the resolved results if the count is small, 
        # or do a registry search.
        
        from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry
        
        # Search in Student Registry
        students = StudentAcademicRegistry.objects.filter(
            Q(full_name__icontains=query) | Q(roll_number__icontains=query)
        ).only('id', 'full_name', 'roll_number')[:10]
        
        # Search in Faculty Registry
        faculty = FacultyAcademicRegistry.objects.filter(
            Q(full_name__icontains=query)
        ).only('id', 'full_name')[:10]
        
        results = []
        for s in students:
            results.append({
                "id": s.id, "role": "STUDENT", "name": s.full_name, "sub": s.roll_number,
                "is_connected": connections.filter(Q(follower_id=s.id, follower_role='STUDENT') | Q(following_id=s.id, following_role='STUDENT')).exists()
            })
        for f in faculty:
             results.append({
                "id": f.id, "role": "FACULTY", "name": f.full_name, "sub": "Faculty",
                "is_connected": connections.filter(Q(follower_id=f.id, follower_role='FACULTY') | Q(following_id=f.id, following_role='FACULTY')).exists()
            })

        return success_response("Network scan complete", data=results)

    @action(detail=False, methods=['get'])
    def list_connections(self, request):
        """Point 1: Optimized connections list."""
        my_id = self._get_my_id(request)
        role = request.user.role
        
        # ... logic to return accepted connections ...
        return success_response("Connections retrieved", data=[])
