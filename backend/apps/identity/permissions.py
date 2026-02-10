"""
Custom RBAC (Role-Based Access Control) Permissions
"""

from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to global Super Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'SUPER_ADMIN'
        )

class IsInstitutionAdmin(permissions.BasePermission):
    """Allows access only to Institution-level Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'INST_ADMIN'
        )

class IsAdminRole(permissions.BasePermission):
    """Allows access to SUPER_ADMIN, INST_ADMIN, or localized ADMIN."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) in ['SUPER_ADMIN', 'INST_ADMIN', 'ADMIN']
        )


class IsTeacherRole(permissions.BasePermission):
    """
    Allows access only to users with the TEACHER role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'TEACHER'
        )


class IsStudentRole(permissions.BasePermission):
    """
    Allows access only to users with the STUDENT role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'STUDENT'
        )


class IsAdminOrTeacher(permissions.BasePermission):
    """
    Allows access to ADMIN/INST_ADMIN/SUPER_ADMIN or TEACHER roles.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) in ['SUPER_ADMIN', 'INST_ADMIN', 'ADMIN', 'TEACHER']
        )
