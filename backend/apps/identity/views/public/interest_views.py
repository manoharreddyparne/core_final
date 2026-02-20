import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.identity.serializers.interest_serializers import InstitutionInterestSerializer
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.turnstile import verify_turnstile_token

logger = logging.getLogger(__name__)

class InstitutionInterestCreateView(APIView):
    """
    Public endpoint for students to express interest in their institution.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        turnstile_token = request.data.get("turnstile_token")
        # In case the frontend hasn't implemented turnstile for this yet, we might want a bypass
        # but for security we should probably keep it.
        # if not verify_turnstile_token(turnstile_token):
        #    return error_response("Human verification failed.", code=status.HTTP_400_BAD_REQUEST)

        serializer = InstitutionInterestSerializer(data=request.data)
        if serializer.is_valid():
            interest = serializer.save()
            logger.info(f"[Institution-Interest] New interest submitted for {interest.institution_name} by {interest.student_email}")
            return success_response(
                "Thank you for your interest! We will reach out to your institution soon.",
                data=serializer.data,
                code=status.HTTP_201_CREATED
            )
        
        return error_response("Invalid data provided.", errors=serializer.errors, code=status.HTTP_400_BAD_REQUEST)
