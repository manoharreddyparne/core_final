from django.contrib import admin
from .models import Course, Batch

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'description', 'created_by', 'created_at', 'updated_at')
    search_fields = ('name', 'code', 'description', 'created_by__username')
    list_filter = ('created_by', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'student_count', 'start_date', 'end_date', 'created_at', 'updated_at')
    search_fields = ('name', 'course__name', 'course__code')
    list_filter = ('course', 'start_date', 'end_date')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('students',)

    def student_count(self, obj):
        return obj.students.count()
    student_count.short_description = 'Number of Students'
