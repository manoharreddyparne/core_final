"""
Custom RBAC (Role-Based Access Control) Permissions
"""

from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """
    Allows access only to users with the ADMIN role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'ADMIN'
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
    Allows access to either ADMIN or TEACHER roles.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) in ['ADMIN', 'TEACHER']
        )
