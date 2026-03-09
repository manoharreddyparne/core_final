from django.db import models
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import StudentProject, ProjectLike, ProjectFeedback
from .serializers import StudentProjectSerializer, ProjectFeedbackSerializer
from apps.auip_institution.models import StudentAcademicRegistry

from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication

class StudentProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling project uploads, listing, and engagement.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    queryset = StudentProject.objects.all()
    serializer_class = StudentProjectSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'title', 'description', 'abstract', 'group_name', 'batch_id', 
        'student__full_name', 'student__roll_number', 'category',
        'keywords', 'co_authors', 'research_area', 'department__name'
    ]

    ordering_fields = ['created_at', 'views_count', 'likes_count']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return StudentProject.objects.filter(is_approved=True)
            
        role = getattr(user, 'role', 'STUDENT')
        if role in ['FACULTY', 'TEACHER', 'ADMIN', 'INST_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']:
            return StudentProject.objects.all()
            
        # Students see approved projects + their own unapproved ones
        try:
            # academic_ref is a StudentAcademicRegistry object
            student_ref = getattr(user, 'academic_ref', None)
            if student_ref:
                return StudentProject.objects.filter(models.Q(is_approved=True) | models.Q(student=student_ref))
        except:
            pass
            
        return StudentProject.objects.filter(is_approved=True)

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        user = self.request.user
        
        user_role = getattr(user, 'role', 'NO_ROLE')
        if callable(user_role):
            user_role = user_role()
        
        user_role_str = str(user_role).upper()
        user_class = user.__class__.__name__
        
        # Check if the user is a student
        is_student = (user_role_str == 'STUDENT') or (user_class == 'StudentAuthorizedAccount')
        
        if is_student:
            # Try to find the academic registry
            academic_ref = getattr(user, 'academic_ref', None)
            
            if not academic_ref:
                if user_class == 'StudentAuthorizedAccount':
                    registry_ref = getattr(user, 'registry_ref', None)
                    if registry_ref:
                        roll = getattr(registry_ref, 'identifier', None)
                        if roll:
                            academic_ref = StudentAcademicRegistry.objects.filter(roll_number=roll).first()
                
                if not academic_ref:
                    user_email = getattr(user, 'email', None)
                    if user_email:
                        academic_ref = StudentAcademicRegistry.objects.filter(
                            models.Q(official_email=user_email) | models.Q(personal_email=user_email)
                        ).first()
            
            if academic_ref:
                project = serializer.save(student=academic_ref)
                self._notify_faculty_on_upload(project, user)
            else:
                raise drf_serializers.ValidationError({"detail": "Your academic record (registry) was not found. Please ensure your roll number/email matches the institution records."})
        else:
            raise drf_serializers.ValidationError({"detail": f"Only students can upload projects. Your current role is: {user_role_str}"})

    def _notify_faculty_on_upload(self, project, student_user):
        """Notify all faculty members about a new project upload requiring review."""
        try:
            from apps.notifications.models import Notification
            from apps.identity.models import User
            from django_tenants.utils import schema_context
            
            # Find faculty in public schema (LoginSession is also in public)
            # Notification recipient is a ForeignKey to User
            with schema_context('public'):
                from django.db.models import Q
                faculty_users = list(User.objects.filter(Q(role='FACULTY') | Q(role='TEACHER')))
                
            for faculty in faculty_users:
                Notification.objects.create(
                    recipient_id=faculty.id,
                    title="New Project Pending Review",
                    message=f"Student {student_user.first_name} uploaded '{project.title}'. Please review and approve.",
                    notification_type='COMMUNICATION',
                    link_url=f"/showcase-hub?review={project.id}"
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send faculty notification: {e}")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object_or_404(self.get_queryset(), pk=kwargs.get('pk'))
        instance.views_count += 1
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Faculty or Admin approves a project."""
        user = request.user
        role = getattr(user, 'role', 'STUDENT')
        if role not in ['FACULTY', 'TEACHER', 'ADMIN', 'INST_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']:
            return Response({"detail": "Only faculty or admins can approve projects."}, status=status.HTTP_403_FORBIDDEN)
            
        project = self.get_object()
        project.is_approved = True
        project.approved_by_id = user.id
        project.save()

        # Create a feedback entry as well if a comment is provided
        comment = request.data.get('comment', 'Project approved.')
        ProjectFeedback.objects.create(
            project=project,
            faculty_id=user.id,
            faculty_name=f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or user.email,
            comment=comment,
            status='VERIFIED'
        )

        # Notify Student
        self._notify_student_on_event(project, "Project Approved", f"Your project '{project.title}' has been approved.")
        
        return Response({"status": "approved", "is_approved": True})

    @action(detail=True, methods=['post'])
    def feedback(self, request, pk=None):
        """Faculty provides feedback (comments + status)."""
        user = request.user
        role = getattr(user, 'role', 'STUDENT')
        if role not in ['FACULTY', 'TEACHER', 'ADMIN', 'INST_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']:
            return Response({"detail": "Only faculty can provide feedback."}, status=status.HTTP_403_FORBIDDEN)

        project = self.get_object()
        serializer = ProjectFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        status_val = serializer.validated_data.get('status', 'PENDING')
        comment = serializer.validated_data.get('comment')

        feedback = serializer.save(
            project=project,
            faculty_id=user.id,
            faculty_name=f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or user.email
        )

        # Sync approval if status is VERIFIED or EXCELLENT
        if status_val in ['VERIFIED', 'EXCELLENT']:
            project.is_approved = True
            project.approved_by_id = user.id
            project.save()

        # Notify Student
        self._notify_student_on_event(project, f"New Feedback: {status_val.replace('_', ' ').title()}", f"Faculty provided feedback on '{project.title}': {comment[:100]}...")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _notify_student_on_event(self, project, title, message):
        """Notify the student owner of the project."""
        try:
            from apps.notifications.models import Notification
            from apps.identity.models import User
            from django_tenants.utils import schema_context
            
            # Find the Global User ID for recipient
            email = project.student.official_email or project.student.personal_email
            
            with schema_context('public'):
                student_user = User.objects.filter(email=email).first()
                
            if student_user:
                Notification.objects.create(
                    recipient_id=student_user.id,
                    title=title,
                    message=message,
                    notification_type='COMMUNICATION',
                    link_url=f"/research?project={project.id}"
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send student notification: {e}")


    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        project = self.get_object_or_404(StudentProject, pk=pk)
        user = request.user
        user_id = getattr(user, 'pk', None)
        user_role = getattr(user, 'role', 'STUDENT')

        like, created = ProjectLike.objects.get_or_create(
            project=project,
            user_id=user_id,
            user_role=user_role
        )

        if not created:
            like.delete()
            project.likes_count -= 1
            project.save()
            return Response({'status': 'unliked', 'likes_count': project.likes_count})
        
        project.likes_count += 1
        project.save()
        return Response({'status': 'liked', 'likes_count': project.likes_count})

    def get_object_or_404(self, queryset, **kwargs):
        return get_object_or_404(queryset, **kwargs)
