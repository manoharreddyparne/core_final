from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Profile', {'fields': ('role', 'avatar', 'need_password_reset')}),
    )
    list_display = (
    'username',
    'email',
    'role',
    'is_active',
    'is_staff',
    'is_superuser',
    'need_password_reset'
)
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('email',)
    list_editable = ('is_active', 'need_password_reset')
