import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.identity.services.quantum_shield import QuantumShieldService
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.serializers.user_serializers import UserSerializer
from apps.identity.models import User, LoginSession
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from django.utils import timezone
from apps.identity.utils.request_utils import get_client_ip, get_location, parse_device_info

logger = logging.getLogger(__name__)

class PassportView(APIView):
    """
    The Unified Identity Passport Hub.
    GET /auth/passport/
    
    1. Reconstructs JWT from Quad-Shield cookies.
    2. Validates session state machine (JIT -> OTP -> SECURE).
    3. Issues RAM-only Access Token.
    """
    authentication_classes = [] 
    permission_classes = []

    def get(self, request):
        ip = get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "unknown")
        
        # 1. Try to reconstruct token from shield
        token_str, session_id = QuantumShieldService.reconstruct_token(request.COOKIES)
        
        if not token_str:
            return Response({
                "success": False,
                "stage": "UNAUTHENTICATED", 
                "message": "Shield empty. Identification required."
            }, status=200) # ✅ 200 to keep console clean

        try:
            # 2. Validate JWT 
            # We use UntypedToken to extract claims without global user lookup yet
            refresh = RefreshToken(token_str)
            user_id = refresh.get("user_id")
            role_claim = refresh.get("role")
            schema_claim = refresh.get("schema")
            email_claim = refresh.get("email")
            
            # --- IDENTITY RESOLUTION ---
            # Prioritize Global User, but allow isolated Tenant Users (NULL global user)
            # INSTITUTION_ADMIN and FACULTY are TENANT-ISOLATED roles usually,
            # but Institutional Admins who onboarded via Super Admin are Global Users.
            GLOBAL_ROLES = ["SUPER_ADMIN", "INSTITUTION_ADMIN", "INST_ADMIN", "ADMIN"]
            
            user = None
            # If role is explicit and IS global, look up in public User table
            is_global = bool(role_claim and role_claim in GLOBAL_ROLES)
            
            if is_global:
                 # Robust ID conversion (handles stringified claims)
                 try:
                     search_id = int(user_id)
                 except (ValueError, TypeError):
                     search_id = user_id
                 user = User.objects.filter(id=search_id).first()
            
            # 3. Validate Session Persistence
            # Match by ID + identity binding (User FK or Email)
            session_qs = LoginSession.objects.filter(id=session_id, is_active=True)
            if user:
                # For global users, allow match by FK OR email (resilience against isinstance mismatches)
                from django.db.models import Q
                session_qs = session_qs.filter(Q(user=user) | Q(tenant_email=user.email))
            else:
                # Isolated session verification
                session_qs = session_qs.filter(tenant_email=email_claim)

            session = session_qs.first()
            if not session:
                from apps.identity.utils.cookie_utils import clear_session_cookies
                resp = Response({
                    "success": False,
                    "stage": "SESSION_EXPIRED", 
                    "message": "Session rotated or invalidated."
                }, status=200)
                # ✅ Definitive cleanup: If we know the session is dead, clean the browser
                clear_session_cookies(resp)
                return resp
            
            # 4. Issue Fresh RAM-only Access Token
            # We must propagate custom claims from the refresh token to the new access token
            access_obj = refresh.access_token
            for key in ['role', 'email', 'schema', 'tenant_user_id']:
                if key in refresh:
                    access_obj[key] = refresh[key]
            
            access = str(access_obj)
            
            # ✅ Sync DB session with the NEW JTI (with Grace Period support)
            from apps.identity.utils.security import hash_token_secure
            untyped = UntypedToken(access)
            now = timezone.now()
            
            session.previous_jti = session.jti # 🔄 Grace period anchor
            session.jti = untyped.get("jti")
            session.token_hash = hash_token_secure(access)
            session.last_active = now
            session.rotated_at = now
            session.save(update_fields=["jti", "token_hash", "last_active", "previous_jti", "rotated_at"])
            
            # --- IDENTITY HYDRATION ---
            if user:
                user_data = UserSerializer(user).data
            else:
                # Isolated User (No global record)
                user_data = {
                    "id": user_id,
                    "email": email_claim,
                    "username": email_claim,
                    "role": role_claim,
                    "is_active": True
                }

            if schema_claim and role_claim:
                from django_tenants.utils import schema_context
                from apps.auip_institution.models import (
                    AdminAuthorizedAccount, 
                    FacultyAuthorizedAccount, 
                    StudentAuthorizedAccount,
                )
                from apps.identity.models.institution import Institution
                
                with schema_context(schema_claim):
                    # Determine model based on role
                    if role_claim == "INSTITUTION_ADMIN":
                        acc_model = AdminAuthorizedAccount
                    elif role_claim == "FACULTY":
                        acc_model = FacultyAuthorizedAccount
                    else:
                        acc_model = StudentAuthorizedAccount

                    # Email is the unique link for tenant accounts
                    email_to_query = user.email if user else email_claim
                    account = acc_model.objects.filter(email__iexact=email_to_query).first()
                    
                    if account:
                        user_data["role"] = role_claim
                        user_data["schema"] = schema_claim
                        user_data["first_name"] = getattr(account, "first_name", "")
                        user_data["last_name"] = getattr(account, "last_name", "")
                        
                        # Full name helper
                        full_name = f"{user_data['first_name']} {user_data['last_name']}".strip()
                        if full_name:
                            user_data["full_name"] = full_name
                        
                        if hasattr(account, 'designation'):
                            user_data["designation"] = account.designation
                        
                        institution = Institution.objects.filter(schema_name=schema_claim).first()
                        if institution:
                            user_data["institution_name"] = institution.name
                        
                        logger.debug(f"[PASSPORT] Switched to tenant context: {schema_claim} | role={role_claim}")

            data = {
                "stage": "SECURE_SESSION",
                "access": access,
                "user": user_data,
                "session_id": str(session.id)
            }
            
            user_identity_label = user.id if user else email_claim
            logger.info(f"[PASSPORT] Hydrated session {session.id} for user {user_identity_label} | Contextual Role={user_data.get('role')}")
            
            resp = success_response("Passport hydrated", data=data)
            # Re-sync role-specific marker on successful hydration
            from apps.identity.utils.cookie_utils import set_logged_in_cookie
            set_logged_in_cookie(resp, "true", role=user_data.get("role"))
            
            return resp

        except Exception as e:
            logger.warning(f"[PASSPORT] Rejection: {e}")
            from apps.identity.utils.cookie_utils import clear_session_cookies
            resp = Response({
                "success": False,
                "stage": "REJECTION", 
                "message": str(e)
            }, status=200)
            
            # 🫧 SELF-HEALING: Clear poisoned cookies on failure
            clear_session_cookies(resp)
            return resp
