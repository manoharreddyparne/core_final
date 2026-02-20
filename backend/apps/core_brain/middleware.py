import json
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class BehaviorTrackingMiddleware:
    """
    Middleware to capture student behavior / 'continuous operations' in the portal.
    Feeds data to the Governance Brain for profile matrix generation and policy control.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only track authenticated students in institutional context
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Check if it's a student (via role property from TenantAuth)
            if getattr(request.user, 'role', None) == 'STUDENT':
                self.log_behavior(request, response)

        return response

    def log_behavior(self, request, response):
        """
        Asynchronously log the behavior. 
        """
        try:
            # Only log API interactions for now to avoid overhead on static files
            if not request.path.startswith('/api/'):
                return

            # 🛡️ Determine the correct tenant schema from the token
            schema = None
            try:
                if hasattr(request, 'auth') and isinstance(request.auth, dict):
                    schema = request.auth.get('schema')
                
                if not schema:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    auth = JWTAuthentication()
                    result = auth.authenticate(request)
                    if result:
                        _, token = result
                        schema = token.get('schema')
            except Exception:
                pass

            if not schema or schema == 'public':
                return  # Can't determine a valid tenant schema

            from apps.governance.models import StudentBehaviorLog
            from django_tenants.utils import schema_context
            with schema_context(schema):
                # 🛡️ LOOKUP student INSIDE schema context
                student = getattr(request.user, 'academic_ref', None)
                if not student:
                    return

                event_type = 'PAGE_VIEW'
                if request.method in ['POST', 'PUT', 'PATCH']:
                    event_type = 'CLICK'
                
                # Extract target information if possible
                path_parts = request.path.strip('/').split('/')
                target_id = ""
                target_type = ""
                if len(path_parts) >= 2:
                    target_type = path_parts[1]
                    if len(path_parts) >= 3:
                        target_id = path_parts[2]

                metadata = {
                    "method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    "query_params": dict(request.GET.items()),
                }

                if '/search' in request.path and request.method == 'GET':
                     event_type = 'SEARCH'

                StudentBehaviorLog.objects.create(
                    student=student,
                    event_type=event_type,
                    target_id=target_id,
                    target_type=target_type,
                    metadata=metadata,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
            
        except Exception as e:
            logger.error(f"[BRAIN-ERROR] [Schema:{schema}] Failed to log behavior: {e}")
