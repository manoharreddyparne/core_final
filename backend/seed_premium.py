import os
import django
import sys

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django_tenants.utils import schema_context
from apps.auip_tenant.models import Client
from apps.auip_institution.models import (
    StudentAcademicRegistry, 
    FacultyAcademicRegistry
)
from apps.social.models import Connection, ChatSession, ChatMessage, SocialPost
from django.utils import timezone
import uuid

def seed_premium_network():
    schema_name = "inst_mallareddy_university"
    with schema_context(schema_name):
        print(f">> Operating in {schema_name}")
        
        # 1. Resolve Identities
        student = StudentAcademicRegistry.objects.filter(roll_number='2211CS010446').first()
        faculty = FacultyAcademicRegistry.objects.filter(employee_id='FAC001').first()
        
        if not student or not faculty:
            print("!! Student or Faculty not found.")
            return

        print(f"++ Found Student: {student.full_name}")
        print(f"++ Found Faculty: {faculty.full_name}")

        # 2. Create Mutual Connection (Premium Connection)
        conn, created = Connection.objects.update_or_create(
            follower_id=student.id,
            follower_role='STUDENT',
            following_id=faculty.id,
            following_role='FACULTY',
            defaults={'status': 'FRIENDS'}
        )
        # Bilateral
        Connection.objects.update_or_create(
            follower_id=faculty.id,
            follower_role='FACULTY',
            following_id=student.id,
            following_role='STUDENT',
            defaults={'status': 'FRIENDS'}
        )
        print(">> Established Bilateral Premium Connection.")

        # 3. Create active Chat Session
        chat_session, created = ChatSession.objects.get_or_create(
            participants=[
                {'id': student.id, 'role': 'STUDENT', 'name': student.full_name},
                {'id': faculty.id, 'role': 'FACULTY', 'name': faculty.full_name}
            ],
            defaults={
                'last_message_at': timezone.now()
            }
        )
        
        if created:
            ChatMessage.objects.create(
                session=chat_session,
                sender_id=faculty.id,
                sender_role='FACULTY',
                content="Hello Manohar! I saw your recent research on AI. Great progress, let's collaborate on the next phase."
            )
            print(f">> Initiated Premium Collaboration Chat. (Session: {chat_session.session_id})")

        # 4. Create High-Quality Social Posts
        SocialPost.objects.get_or_create(
            author_id=faculty.id,
            author_role='FACULTY',
            author_name=faculty.full_name,
            content="🚀 Exciting news from our AI & Robotics lab! We've just integrated the AUIP Intelligence Matrix into our core research pipeline. The efficiency gains in semantic search are staggering.",
            defaults={'likes_count': 12, 'comments_count': 3}
        )
        
        SocialPost.objects.get_or_create(
            author_id=student.id,
            author_role='STUDENT',
            author_name=student.full_name,
            content="Just finished setting up my local development environment for the AUIP platform. The isolated institutional architectures are truly state-of-the-art. #DeveloperExperience #AUIP",
            defaults={'likes_count': 8, 'comments_count': 1}
        )
        print(">> Seeded Premium Social Activity.")

if __name__ == "__main__":
    seed_premium_network()
