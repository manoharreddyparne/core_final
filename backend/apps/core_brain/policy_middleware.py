from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)

class GovernancePolicyMiddleware:
    """
    Intercepts requests to check if the student is permitted to perform 
    the action based on Governance Brain policies and their Intelligence Profile.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            if getattr(request.user, 'role', None) == 'STUDENT':
                error = self.check_policies(request)
                if error:
                    return error

        return self.get_response(request)

    def check_policies(self, request):
        """
        Check if the current request is blocked by any active policies.
        Example: Block placement application if readiness score < 40.
        """
        # Define paths that require specific feature allowance
        restricted_paths = {
            '/api/placement/applications/': 'allow_placement',
            '/api/intelligence/assistant/': 'allow_ai_assistant',
        }

        path = request.path
        policy_key = None
        for r_path, p_key in restricted_paths.items():
            if path.startswith(r_path):
                policy_key = p_key
                break
        
        if policy_key:
            # 🛡️ Determine schema from token context (NOT request.tenant which could be 'public')
            schema = None
            try:
                if hasattr(request, 'auth') and isinstance(request.auth, dict):
                    schema = request.auth.get('schema')
                
                if not schema:
                    # Fallback if request.auth not yet set
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    auth = JWTAuthentication()
                    result = auth.authenticate(request)
                    if result:
                        _, token = result
                        schema = token.get('schema')
            except Exception:
                pass

            # IF no schema is found in token, but it's a tenant path, we can't proceed safely
            if not schema or schema == 'public':
                return None # Or block? For now, allow to avoid lockouts

            from django_tenants.utils import schema_context
            try:
                with schema_context(schema):
                    # 🛡️ Lookup student INSIDE schema context
                    student = getattr(request.user, 'academic_ref', None)
                    if student:
                        from apps.governance.models import StudentIntelligenceProfile
                        intel_profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
                        
                        # Check if the specific control is explicitly disabled
                        if intel_profile.active_controls.get(policy_key) is False:
                            # Provide a helpful AI-driven reason if available
                            reason = intel_profile.active_controls.get(f"{policy_key}_reason", "This feature is currently restricted by the Governance Brain.")
                            
                            return JsonResponse({
                                "status": "error",
                                "code": "POLICY_RESTRICTED",
                                "message": reason,
                                "behavior_score": intel_profile.behavior_score,
                                "readiness_score": intel_profile.readiness_score
                            }, status=403)
            except Exception as e:
                logger.error(f"[GOVERNANCE-POLICY-ERROR] [Schema:{schema}] {e}")
                return None
        
        return None
