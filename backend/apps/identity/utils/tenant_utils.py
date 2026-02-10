from apps.identity.models.institution import InstitutionAdmin

def get_user_institution(user):
    """
    Returns the Institution associated with the user.
    Supports SuperAdmins (can be None) and InstAdmins.
    """
    if user.role == "SUPER_ADMIN":
        return None
    
    try:
        return user.institution_admin_profile.institution
    except (AttributeError, InstitutionAdmin.DoesNotExist):
        return None
