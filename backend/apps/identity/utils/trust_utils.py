import logging
import secrets
from datetime import datetime, timezone as dt_timezone, timedelta
from django.conf import settings
from django.utils import timezone
from apps.identity.models import RememberedDevice
from apps.identity.utils.security import hash_token
from apps.identity.utils.device_utils import get_device_hash

logger = logging.getLogger(__name__)

from apps.identity.utils.cookie_utils import REFRESH_COOKIE_SAMESITE, REFRESH_COOKIE_SECURE

DEVICE_TRUST_COOKIE = "auip_dt"
DEVICE_TRUST_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days

def get_trust_token_from_cookie(request) -> str | None:
    return request.COOKIES.get(DEVICE_TRUST_COOKIE)

def set_trust_cookie(response, trust_token: str) -> None:
    response.set_cookie(
        DEVICE_TRUST_COOKIE,
        trust_token,
        max_age=DEVICE_TRUST_COOKIE_AGE,
        httponly=True,
        secure=REFRESH_COOKIE_SECURE,
        samesite=REFRESH_COOKIE_SAMESITE,
        path="/",
    )

def is_device_trusted(request, user=None, tenant_user_id=None, tenant_schema=None, device_hash=None, role=None) -> bool:
    cookie_token = get_trust_token_from_cookie(request)
    if not cookie_token:
        return False

    hashed_cookie = hash_token(cookie_token)
    
    # 🛡️ NORMALIZATION: Support role naming variants for device trust
    admin_variants = {'ADMIN', 'INST_ADMIN', 'INSTITUTION_ADMIN'}
    faculty_variants = {'FACULTY', 'TEACHER'}
    
    role_variants = [role] if role else []
    if role and role.upper() in admin_variants:
        role_variants = list(admin_variants)
    elif role and role.upper() in faculty_variants:
        role_variants = list(faculty_variants)

    query = RememberedDevice.objects.filter(
        trusted=True,
        trust_cookie_hash=hashed_cookie,
        trusted_until__gt=timezone.now(),
        device_hash=device_hash
    )
    if role_variants:
        query = query.filter(role__in=role_variants)
    elif role:
        query = query.filter(role=role)
    
    if user:
        query = query.filter(user=user)
    elif tenant_user_id and tenant_schema:
        query = query.filter(tenant_user_id=tenant_user_id, tenant_schema=tenant_schema)
    else:
        return False
        
    return query.exists()

def trust_device(user=None, tenant_user_id=None, tenant_schema=None, tenant_email=None, device_hash=None, ip=None, user_agent=None, role=None):
    trust_token = secrets.token_hex(32)
    hashed_trust = hash_token(trust_token)
    trust_expiry = timezone.now() + timedelta(seconds=DEVICE_TRUST_COOKIE_AGE)

    common_fields = {
        "last_active": timezone.now(),
        "ip_address": ip,
        "user_agent": user_agent,
        "trusted": True,
        "trust_cookie_hash": hashed_trust,
        "trusted_until": trust_expiry
    }

    if user:
        obj, created = RememberedDevice.objects.update_or_create(
            user=user,
            device_hash=device_hash,
            role=role,
            defaults=common_fields
        )
    else:
        obj, created = RememberedDevice.objects.update_or_create(
            tenant_user_id=tenant_user_id,
            tenant_schema=tenant_schema,
            device_hash=device_hash,
            role=role,
            defaults={**common_fields, "tenant_email": tenant_email}
        )
        
    return trust_token
