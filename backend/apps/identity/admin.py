"""
Admin interface for Core Student model
"""

from django.contrib import admin
from apps.identity.models.core_models import CoreStudent


@admin.register(CoreStudent)
class CoreStudentAdmin(admin.ModelAdmin):
    """Admin interface for Core Students"""
    
    list_display = [
        'stu_ref',
        'roll_number',
        'full_name',
        'department',
        'batch_year',
        'cgpa',
        'status',
        'is_eligible_for_placement',
        'seeded_at',
    ]
    
    list_filter = [
        'status',
        'department',
        'batch_year',
        'current_semester',
        'is_eligible_for_placement',
    ]
    
    search_fields = [
        'stu_ref',
        'roll_number',
        'full_name',
        'official_email',
    ]
    
    readonly_fields = [
        'stu_ref',  # Cannot change after creation
        'seeded_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Identity', {
            'fields': ('stu_ref', 'roll_number', 'full_name')
        }),
        ('Academic Details', {
            'fields': (
                'department',
                'batch_year',
                'current_semester',
            )
        }),
        ('Performance Metrics', {
            'fields': (
                'cgpa',
                'tenth_percentage',
                'twelfth_percentage',
                'attendance_percentage',
            )
        }),
        ('Contact', {
            'fields': ('official_email',)
        }),
        ('Status', {
            'fields': (
                'status',
                'is_eligible_for_placement',
                'placement_eligibility_reason',
            )
        }),
        ('Metadata', {
            'fields': (
                'seeded_by',
                'seeded_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Make stu_ref readonly only for existing objects"""
        if obj:  # Editing existing object
            return self.readonly_fields
        return ['seeded_at', 'updated_at']  # Creating new object
    
    def save_model(self, request, obj, form, change):
        """Auto-populate seeded_by on creation"""
        if not change:  # Creating new object
            obj.seeded_by = request.user.email or request.user.username
        super().save_model(request, obj, form, change)
