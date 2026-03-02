# apps/academic/views/_permissions.py
# Shared permission classes + DRY mixin for academic ViewSets
# ─────────────────────────────────────────────────────────────────────────────
from rest_framework import permissions


class IsTenantFacultyOrAdmin(permissions.BasePermission):
    """Faculty and Admins can write. Students are completely denied."""
    WRITE_ACTIONS = [
        'create', 'update', 'partial_update', 'destroy',
        'mark_bulk', 'bulk_enter', 'bulk_enroll'
    ]

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', '')
        if role in ('INST_ADMIN', 'INSTITUTION_ADMIN', 'FACULTY'):
            return True
        if role == 'STUDENT':
            return getattr(view, 'action', None) not in self.WRITE_ACTIONS
        return False


class IsTenantFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', '') == 'FACULTY'


class AdminWriteAuthReadMixin:
    """
    DRY mixin: Admin can write, any authenticated user can read.
    Replaces the repeated get_permissions() pattern across 8 ViewSets.
    """
    WRITE_ACTIONS = ['create', 'update', 'partial_update', 'destroy']

    def get_permissions(self):
        from apps.auip_institution.permissions import IsTenantAdmin
        if self.action in self.WRITE_ACTIONS:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]
