from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, QuestionBankViewSet, ExamAttemptViewSet, AntiCheatViewSet

router = DefaultRouter()
router.register(r'exam_definitions', ExamViewSet)
router.register(r'question_bank', QuestionBankViewSet)
router.register(r'exam_attempts', ExamAttemptViewSet)
router.register(r'anti_cheat', AntiCheatViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
