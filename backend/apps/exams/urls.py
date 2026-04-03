from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, QuestionBankViewSet, ExamAttemptViewSet, ExamAntiCheatLogViewSet

router = DefaultRouter()
router.register(r'', ExamViewSet) # Root of app is Exam management
router.register(r'question-bank', QuestionBankViewSet)
router.register(r'exam-attempts', ExamAttemptViewSet)
router.register(r'anti-cheat-logs', ExamAntiCheatLogViewSet)

urlpatterns = [
    # Backward-compatible aliases used by older quiz flows.
    path('exam_definitions/', ExamViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('exam_definitions/<int:pk>/', ExamViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('exam_definitions/<int:pk>/generate-ai-questions/', ExamViewSet.as_view({'post': 'generate_ai_questions'})),
    path('exam_attempts/', ExamAttemptViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('exam_attempts/<uuid:pk>/submit_answer/', ExamAttemptViewSet.as_view({'post': 'submit_answer'})),
    path('exam_attempts/<uuid:pk>/finish/', ExamAttemptViewSet.as_view({'post': 'finish'})),
    path('exam_attempts/<uuid:pk>/log_violation/', ExamAttemptViewSet.as_view({'post': 'log_violation'})),
    path('', include(router.urls)),
]
