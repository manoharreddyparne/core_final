"""
Public Institution Registration View
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils.text import slugify
from apps.identity.models.institution import Institution
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.turnstile import verify_turnstile_token

logger = logging.getLogger(__name__)

class InstitutionRegistrationView(APIView):
    """
    Public endpoint for institutions to apply for registration.
    Initial status is PENDING.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        turnstile_token = request.data.get("turnstile_token")
        if not verify_turnstile_token(turnstile_token):
            logger.warning(f"[Institution-Registration] Rejected: Invalid Turnstile token")
            return error_response("Human verification failed.", code=status.HTTP_400_BAD_REQUEST)

        data = request.data
        name = data.get("name")
        domain = data.get("domain")
        contact_email = data.get("contact_email")

        if not name or not domain or not contact_email:
            return error_response("Name, domain, and contact email are required.", 
                                 code=status.HTTP_400_BAD_REQUEST)

        if Institution.objects.filter(name=name).exists():
            return error_response("An institution with this name already exists.", 
                                 code=status.HTTP_400_BAD_REQUEST)

        if Institution.objects.filter(domain=domain).exists():
            return error_response("An institution with this domain already exists.", 
                                 code=status.HTTP_400_BAD_REQUEST)

        try:
            slug = slugify(name)
            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Institution.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            institution = Institution.objects.create(
                name=name,
                slug=slug,
                domain=domain,
                contact_email=contact_email,
                address=data.get("address", ""),
                contact_number=data.get("contact_number", ""),
                student_count_estimate=data.get("student_count_estimate", 0),
                registration_data=data,  # Store full request data
                status=Institution.RegistrationStatus.PENDING
            )

            logger.info(f"[Institution-Registration] New application from {name} ({domain})")
            
            # TODO: Trigger Email notification to Super Admin
            
            return success_response(
                "Registration application submitted successfully.",
                data={"slug": institution.slug},
                code=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.error(f"[Institution-Registration] Error: {str(e)}", exc_info=True)
            return error_response(
                "An error occurred while processing your registration.",
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

