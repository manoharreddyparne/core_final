from rest_framework import permissions

class IsTenantAdmin(permissions.BasePermission):
    """
    Allocates access to Institutional Admins (AuthorizedAccount).
    Accepts both 'INSTITUTION_ADMIN' (tenant model property) and 'ADMIN'.
    """
    def has_permission(self, request, view):
        # request.user is AuthorizedAccount instance (set by TenantAuthentication)
        role = getattr(request.user, 'role', None)
        return bool(
            request.user and
            request.user.is_authenticated and
            role in ('INSTITUTION_ADMIN', 'ADMIN')
        )

class IsTenantStudent(permissions.BasePermission):
    """
    Allocates access to Activated Students.
    """
    def has_permission(self, request, view):
        role = getattr(request.user, 'role', None)
        return bool(
            request.user and
            request.user.is_authenticated and
            role == 'STUDENT'
        )

class IsTenantFaculty(permissions.BasePermission):
    """
    Allocates access to Activated Faculty.
    """
    def has_permission(self, request, view):
        role = getattr(request.user, 'role', None)
        return bool(
            request.user and
            request.user.is_authenticated and
            role == 'FACULTY'
        )
