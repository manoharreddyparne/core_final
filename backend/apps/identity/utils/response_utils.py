#users/utils/response_utils.py
from rest_framework.response import Response
from rest_framework import status

# ---------------- SUCCESS AND ERROR ----------------
def success_response(message: str, data=None, code=status.HTTP_200_OK):
    """
    Unified success response format for frontend toasts.
    """
    return Response(
        {
            "success": True,
            "message": message,
            "data": data if data is not None else {},
        },
        status=code,
    )

def error_response(message: str, code=status.HTTP_400_BAD_REQUEST, errors=None, data=None):
    """
    Unified error response format for frontend toasts.
    """
    return Response(
        {
            "success": False,
            "message": message,
            "errors": errors or {},
            "data": data or {},
        },
        status=code,
    )

# ---------------- SHORTCUTS ----------------
def password_success(message: str, data: dict = None):
    """
    Password success shortcut — can include optional extra data (like tokens, cooldowns).
    """
    return success_response(message, data=data or {})

def password_error(message: str, errors: dict = None):
    """
    Password error shortcut — can include optional field/IP errors.
    """
    return error_response(message, errors=errors or {})
