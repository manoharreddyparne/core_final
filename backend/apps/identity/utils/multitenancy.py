"""
Multi-tenancy Utilities for PostgreSQL Schema Isolation
"""

import logging
from django.db import connection
from contextlib import contextmanager
from apps.auip_tenant.models import Client, Domain

logger = logging.getLogger(__name__)

import sys
from io import StringIO
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.management import call_command

class WSProgressStream(StringIO):
    """
    Custom stream to capture stdout from django-tenants' `migrate_schemas`.
    Reads each line, checks for 'Applying', and fires a WebSocket event with real %.
    """
    def __init__(self, schema_name, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.schema_name = schema_name
        self._channel_layer = get_channel_layer()
        self._total_migrations = 100  # Updated estimate for AUIP v2.x
        self._current_migration = 0
    
    def write(self, s):
        super().write(s)
        if "Applying " in s and "..." in s:
            self._current_migration += 1
            # Give it a max of 95% to leave room for final operations
            pct = min(int((self._current_migration / self._total_migrations) * 95), 95)
            
            # Extract the exact migration name: "  Applying auth.0001_initial..." 
            try:
                msg = s.strip().split("Applying ")[1].replace("...", "")
            except:
                msg = s.strip()

            if self._channel_layer:
                async_to_sync(self._channel_layer.group_send)(
                    "superadmin_updates",
                    {
                        "type": "institution_update",
                        "data": {
                            "type": "PROVISION_PROGRESS",
                            "schema_name": self.schema_name,
                            "progress": pct,
                            "message": f"Migrating {msg}"
                        }
                    }
                )

def create_institution_schema(schema_name, name=None, domain=None):
    """
    Creates a new Tenant (Client) and Domain.
    Manually triggers schema migration so we can stream progress over WebSockets.
    """
    if not schema_name:
        raise ValueError("schema_name must be provided")

    schema_name = "".join(c for c in schema_name if c.isalnum() or c == "_").lower()
    
    if Client.objects.filter(schema_name=schema_name).exists():
        logger.warning(f"[Multi-Tenancy] Client with schema {schema_name} already exists.")
        return False

    try:
        # Disable automatic sync blocking to intercept it
        Client.auto_create_schema = False
        client = Client.objects.create(
            schema_name=schema_name,
            name=name or schema_name
        )
        Client.auto_create_schema = True

        # Manually create the schema namespace since we disabled the autogenerator!
        with connection.cursor() as cursor:
            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}";')

        final_domain = domain or f"{schema_name}.localhost"
        Domain.objects.create(
            domain=final_domain,
            tenant=client,
            is_primary=True
        )

        logger.info(f"[Multi-Tenancy] Domain {final_domain} assigned. Triggering WS manual migrations...")
        
        # Manually run the massive tenant migration with our WS tracker
        # Flag: --tenant tells it to run only TENANT_APPS into the new schema
        # Flag: -s / --schema targets just this one schema (not all tenants)
        # verbosity=2 ensures every "Applying X..." line is printed to our stream
        out_stream = WSProgressStream(schema_name)
        call_command('migrate_schemas', tenant=True, schema=schema_name, verbosity=2, stdout=out_stream, stderr=out_stream)

        # Send final 100% complete ping
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                "superadmin_updates",
                {
                    "type": "institution_update",
                    "data": {
                        "type": "PROVISION_PROGRESS",
                        "schema_name": schema_name,
                        "progress": 100,
                        "message": "Schema Migration Complete"
                    }
                }
            )

        return True

    except Exception as e:
        Client.auto_create_schema = True
        logger.exception("[Multi-Tenancy] Failed to generate schema")
        raise e


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
