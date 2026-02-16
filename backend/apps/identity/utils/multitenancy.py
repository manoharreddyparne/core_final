"""
Multi-tenancy Utilities for PostgreSQL Schema Isolation
"""

import logging
from django.db import connection
from contextlib import contextmanager

logger = logging.getLogger(__name__)

from apps.auip_tenant.models import Client, Domain

def create_institution_schema(schema_name, name=None, domain=None):
    """
    Creates a new Tenant (Client) and Domain using django-tenants.
    This triggers automatic schema creation and migration of all TENANT_APPS.
    """
    if not schema_name:
        raise ValueError("schema_name must be provided")

    # Sanitize schema_name
    schema_name = "".join(c for c in schema_name if c.isalnum() or c == "_").lower()
    
    # Use Client.objects to trigger django-tenants management
    # This creates the schema and runs migrations for all TENANT_APPS (AcademicRegistry, etc.)
    client, created = Client.objects.get_or_create(
        schema_name=schema_name,
        defaults={'name': name or schema_name}
    )

    if created:
        logger.info(f"[Multi-Tenancy] New Client record created for schema: {schema_name}")
        # Create a domain record for this tenant
        # Note: If no domain is provided, we use a subdomain-like string based on name
        final_domain = domain or f"{schema_name}.localhost"
        Domain.objects.get_or_create(
            domain=final_domain,
            tenant=client,
            defaults={'is_primary': True}
        )
        logger.info(f"[Multi-Tenancy] Domain {final_domain} assigned to {schema_name}")
    else:
        logger.warning(f"[Multi-Tenancy] Client with schema {schema_name} already exists.")

    return created


@contextmanager
def schema_context(schema_name):
    """
    Context manager to switch search_path to the institution's schema.
    Usage:
        with schema_context('inst_mit'):
            # perform DB ops
    """
    with connection.cursor() as cursor:
        # Save original search path
        cursor.execute("SHOW search_path")
        old_path = cursor.fetchone()[0]
        
        try:
            # Set new search path (include public for shared tables)
            logger.debug(f"Switching search_path to: {schema_name}, public")
            cursor.execute(f"SET search_path TO {schema_name}, public")
            yield
        finally:
            # Restore original search path
            cursor.execute(f"SET search_path TO {old_path}")
