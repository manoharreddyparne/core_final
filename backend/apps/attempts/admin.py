from django.contrib import admin
from .models import Attempt, Answer

@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'quiz', 'score', 'completed', 'started_at', 'ended_at')
    list_filter = ('completed', 'quiz')
    search_fields = ('user__username', 'user__email', 'quiz__title')
    readonly_fields = ('started_at', 'ended_at', 'score')
    ordering = ('-started_at',)

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('id', 'attempt', 'question', 'selected_option', 'is_correct')
    list_filter = ('is_correct',)
    search_fields = ('attempt__user__username', 'question__text')
    ordering = ('id',)
