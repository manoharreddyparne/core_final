"""
Multi-tenancy Utilities for PostgreSQL Schema Isolation
"""

import logging
from django.db import connection
from contextlib import contextmanager

logger = logging.getLogger(__name__)

def create_institution_schema(schema_name):
    """
    Creates a new PostgreSQL schema for an institution.
    """
    if not schema_name:
        raise ValueError("schema_name must be provided")

    # Sanitize schema name (should be lowercase, alphanumeric, starts with letter)
    # Already handled by slugify + prefix in view, but extra safety:
    schema_name = "".join(c for c in schema_name if c.isalnum() or c == "_").lower()

    with connection.cursor() as cursor:
        try:
            # Check if schema exists
            cursor.execute(f"SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s", [schema_name])
            if cursor.fetchone():
                logger.warning(f"Schema {schema_name} already exists.")
                return False

            logger.info(f"Creating schema: {schema_name}")
            cursor.execute(f"CREATE SCHEMA {schema_name}")
            
            # TODO: Clone table structures from public schema or run migrations
            # For Sprint 1, we focus on the creation itself.
            # In a full PRO version, we'd use django-tenants or similar.
            # Here we follow the custom professional approach requested.
            
            return True
        except Exception as e:
            logger.error(f"Failed to create schema {schema_name}: {str(e)}")
            raise

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
