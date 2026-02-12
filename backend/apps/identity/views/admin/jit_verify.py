from rest_framework import generics, status
from rest_framework.response import Response
from apps.identity.utils.jit_admin import verify_jit_admin_ticket

class VerifyAdminTicketView(generics.GenericAPIView):
    """
    Validation endpoint for JIT admin tickets.
    """
    def post(self, request, *args, **kwargs):
        ticket = request.data.get("ticket")
        if not ticket:
            return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
        
        is_valid = verify_jit_admin_ticket(ticket)
        return Response({"valid": is_valid}, status=status.HTTP_200_OK if is_valid else status.HTTP_403_FORBIDDEN)
