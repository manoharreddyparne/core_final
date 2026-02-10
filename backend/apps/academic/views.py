# courses/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Course, Batch
from .serializers import CourseSerializer, BatchSerializer
from users.models import User


# ----------------------------
# Role-based Permission
# ----------------------------
class CourseBatchPermission(IsAuthenticated):
    """
    Custom permission:
    - Admins → full CRUD
    - Teachers & Students → read-only
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.user.role == User.Roles.ADMIN:
            return True
        if request.user.role in [User.Roles.TEACHER, User.Roles.STUDENT]:
            return view.action in ["list", "retrieve"]  # Read-only
        return False


# ----------------------------
# Course ViewSet
# ----------------------------
class CourseViewSet(viewsets.ModelViewSet):
    """
    Courses:
    - Admins → full CRUD
    - Teachers & Students → read-only
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [CourseBatchPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ----------------------------
# Batch ViewSet
# ----------------------------
class BatchViewSet(viewsets.ModelViewSet):
    """
    Batches:
    - Admins → full CRUD
    - Teachers & Students → read-only
    - Supports assigning students when creating/updating
    """
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [CourseBatchPermission]

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Roles.ADMIN:
            return Response({"detail": "Only admins can create batches."},
                            status=status.HTTP_403_FORBIDDEN)

        course_id = request.data.get("course")
        if not course_id:
            return Response({"detail": "course ID is required"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found"},
                            status=status.HTTP_404_NOT_FOUND)

        batch = Batch.objects.create(
            course=course,
            name=request.data.get("name"),
            start_date=request.data.get("start_date"),
            end_date=request.data.get("end_date")
        )

        # Optional student assignment
        student_ids = request.data.get("students", [])
        if student_ids:
            students = User.objects.filter(id__in=student_ids, role=User.Roles.STUDENT)
            batch.students.set(students)

        serializer = self.get_serializer(batch)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if request.user.role != User.Roles.ADMIN:
            return Response({"detail": "Only admins can update batches."},
                            status=status.HTTP_403_FORBIDDEN)

        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        instance.name = request.data.get('name', instance.name)
        instance.start_date = request.data.get('start_date', instance.start_date)
        instance.end_date = request.data.get('end_date', instance.end_date)
        instance.save()

        # Optional student update
        student_ids = request.data.get('students')
        if student_ids is not None:
            students = User.objects.filter(id__in=student_ids, role=User.Roles.STUDENT)
            instance.students.set(students)

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
