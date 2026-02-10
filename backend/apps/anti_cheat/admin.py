from django.contrib import admin
from .models import AntiCheatLog

@admin.register(AntiCheatLog)
class AntiCheatLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'quiz', 'event_type', 'created_at')
    list_filter = ('event_type', 'quiz', 'user', 'created_at')
    search_fields = ('user__username', 'quiz__title', 'event_type')
    readonly_fields = ('created_at', 'details')
    ordering = ('-created_at',)
