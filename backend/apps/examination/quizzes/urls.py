from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import QuizViewSet, QuestionViewSet, OptionViewSet

"""
URL configuration for the quizzes app.
Supports nested routes:
- /quizzes/
- /quizzes/{quiz_id}/questions/
- /quizzes/{quiz_id}/questions/{question_id}/options/
"""

# -------------------------
# Base router for quizzes
# -------------------------
router = DefaultRouter()
router.register(r'quizzes', QuizViewSet, basename='quizzes')

# -------------------------
# Nested router for questions under quizzes
# -------------------------
quiz_router = NestedDefaultRouter(router, r'quizzes', lookup='quiz')
quiz_router.register(r'questions', QuestionViewSet, basename='quiz-questions')

# -------------------------
# Nested router for options under questions
# -------------------------
question_router = NestedDefaultRouter(quiz_router, r'questions', lookup='question')
question_router.register(r'options', OptionViewSet, basename='question-options')

# -------------------------
# Include all routers
# -------------------------
urlpatterns = [
    path('', include(router.urls)),
    path('', include(quiz_router.urls)),
    path('', include(question_router.urls)),
]
