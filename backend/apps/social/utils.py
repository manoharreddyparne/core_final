from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry, AdminAuthorizedAccount
from apps.identity.models import LoginSession
from django_tenants.utils import schema_context
from django.utils import timezone
from datetime import timedelta

def get_profile_id(user):
    """
    Standardized ID resolution: Registry ID for students/faculty, Auth ID for admins.
    Used for connecting Social Registry with Identity User.
    """
    if not user: return None
    role = getattr(user, 'role', 'STUDENT')
    if role == "STUDENT":
        return user.academic_ref.id if hasattr(user, 'academic_ref') and user.academic_ref else user.id
    if role == "FACULTY" or role == "TEACHER":
        # Check standard academic_ref for FacultyAuthorizedAccount
        return user.academic_ref.id if hasattr(user, 'academic_ref') and user.academic_ref else user.id
    return user.id

def resolve_profile(uid, role):
    """
    Highly advanced cross-institution profile resolver.
    Connects tenant-specific academic data with global identity users.
    """
    name = "Unknown Protocol"
    avatar = None
    
    # 1. Resolve from Tenant Registry (if in institution context)
    try:
        if role == 'STUDENT':
            s = StudentAcademicRegistry.objects.filter(id=uid).first()
            if s: name = s.full_name
        elif role == 'FACULTY' or role == 'TEACHER':
            f = FacultyAcademicRegistry.objects.filter(id=uid).first()
            if f: name = f.full_name
        elif role in ('INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN'):
            a = AdminAuthorizedAccount.objects.filter(id=uid).first()
            if a: name = f"{a.first_name} {a.last_name}".strip() or a.email
    except:
        pass # Not in a tenant schema context or model missing

    # 2. Global Identity & Presence Check
    online = False
    last_seen = None
    try:
        from apps.identity.models import User
        with schema_context('public'):
            # Normalize role
            p_role = role
            if p_role == "TEACHER": p_role = "FACULTY"
            elif p_role == "INSTITUTION_ADMIN": p_role = "INST_ADMIN"

            # Find global user by tenant_id + role (this might be tricky if not unique)
            # Better: Search LoginSession for active profile
            session = LoginSession.objects.filter(tenant_user_id=uid, role=p_role).order_by('-last_active').first()
            
            if session:
                last_seen = session.last_active
                if session.is_active and session.last_active > timezone.now() - timedelta(minutes=5):
                    online = True
                
                # Try to get avatar from User object
                user = User.objects.filter(id=session.user_id).first()
                if user:
                    avatar = user.avatar_url or user.avatar_filename
                    if name == "Unknown Protocol":
                        name = f"{user.first_name} {user.last_name}".strip() or user.email

    except:
        pass

    return {
        "id": uid, 
        "role": role, 
        "name": name, 
        "avatar": avatar or (name[0] if name else "?"),
        "is_online": online,
        "last_seen": last_seen,
        "connection_id": None 
    }
