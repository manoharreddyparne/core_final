# myproject/utils.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

def custom_exception_handler(exc, context):
    # Default DRF exception response
    response = exception_handler(exc, context)

    # Handle JWT errors
    if isinstance(exc, (TokenError, InvalidToken)):
        return Response(
            {"detail": "Invalid or expired token."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # If DRF already created a response, return it
    if response is not None:
        return response

    # Fallback JSON error
    return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
