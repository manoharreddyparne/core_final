# pyre-ignore-all
"""
Multi-tenancy Utilities for PostgreSQL Schema Isolation
"""

import logging
import os
from pathlib import Path
from django.conf import settings
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from contextlib import contextmanager
from apps.auip_tenant.models import Client, Domain

logger = logging.getLogger(__name__)

import time
import sys
from io import StringIO
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.management import call_command

class UnifiedProvisioningTracker:
    """
    Shared tracker for the entire provisioning lifecycle.
    Keeps timing and progress synchronized across migrations and manual seeding.
    """
    def __init__(self, schema_name, total_seeds=0):
        self.schema_name = schema_name
        self.channel_layer = get_channel_layer()
        self.start_time = time.time()
        self.last_pct = -1
        self.last_msg = ""
        self.last_phase_pct = -1
        self.last_phase_idx = -1
        self._last_raw_eta = 300
        self.phase_meta = {}
        
        # 1. DISCOVER WORKLOAD (Pure Reality)
        # Phase 0: Workspace Setup (6 steps: 3 in tasks.py + 3 in multitenancy utils)
        # Phase 1: Migrations (Calculated from disk)
        # Phase 2: Seeding (Registry + Users)
        # Phase 3: Admin Provisioning (4 steps in tasks.py)
        # Phase 4: Finalization (5 steps in tasks.py)
        
        try:
            loader = MigrationLoader(connection)
            tenant_labels = [app.split('.')[-1] for app in settings.TENANT_APPS]
            migs = [m for m in loader.disk_migrations.keys() if m[0] in tenant_labels]
            self.total_migrations = len(migs)
        except Exception as e:
            logger.warning(f"Failed to discover migrations dynamically: {e}")
            self.total_migrations = 60

        self.total_seeds = max(1, total_seeds)
        
        # Define exact Work-Unit totals for each Phase
        self.phase_totals = {
            0: 6,                     # Infrastructure & Schema Setup
            1: self.total_migrations + 1, # Migrations + Finalized step
            2: max(4, 3 + self.total_seeds), # Component Registry + User Seeds
            3: 4,                     # Identity Provisioning
            4: 5                      # Governance & Matrix Finalization
        }
        
        self.completed_units = {i: 0 for i in self.phase_totals.keys()}
        self.grand_total = sum(self.phase_totals.values())
        
        # Calculate dynamic weights for seamless UI progress flow
        self._calculate_meta()

    def _calculate_meta(self):
        self.phase_meta = {}
        current_start = 0
        for i in range(len(self.phase_totals)):
             weight = (self.phase_totals[i] / self.grand_total) * 100
             self.phase_meta[i] = {"start": current_start, "weight": weight}
             current_start += weight

    def track_work(self, phase_idx, message, units=1, **kwargs):
        """Dynamic Normalization Reporting."""
        if phase_idx not in self.completed_units:
            return # Safety for undefined phases
            
        self.completed_units[phase_idx] += units
        
        # 1. Sub-Phase Progress
        s_done = self.completed_units[phase_idx]
        s_total = self.phase_totals[phase_idx]
        
        # If we exceeded (future-proofing against changing steps in tasks.py)
        if s_done > s_total:
             self.phase_totals[phase_idx] = s_done
             self.grand_total = sum(self.phase_totals.values())
             self._calculate_meta()
             s_total = s_done

        # Phase % calculation
        is_phase_finished = any(k in message.upper() for k in ["FINALIZED", "CONFIRMED", "ESTABLISHED", "LIVE", "SUCCESS"])
        if is_phase_finished or s_done >= s_total:
            phase_pct = 100
        else:
            phase_pct = min(99, int((s_done / s_total) * 100))

        # 2. Overall Normalized Progress
        meta = self.phase_meta.get(phase_idx, {"start": 0, "weight": 0})
        progress = int(meta["start"] + ( (s_done / s_total) * meta["weight"] ))
        
        # Monotonic Guard
        if progress < self.last_pct:
            progress = self.last_pct

        # COMPLETION SIGNAL (Fixed Keyword Set)
        is_final_msg = any(keyword in message.upper() for keyword in ["LIVE", "COMPLETED", "COMPLETE", "SUCCESS", "FINISHED"])
        is_at_end = (phase_idx == 4 and (s_done >= s_total or is_final_msg))
        
        if is_at_end:
            progress = 100
            eta = 0
        else:
            progress = min(99, progress)

        # Intelligent ETA (Exponential Smoothing)
        elapsed = time.time() - self.start_time
        total_done = sum(self.completed_units.values())
        if total_done > 0:
            avg_sec = elapsed / total_done
            rem_units = max(0, self.grand_total - total_done)
            raw_eta = int(rem_units * avg_sec)
            
            # EMA Smoothing: 70% memory, 30% new measurement
            eta = int(0.7 * self._last_raw_eta + 0.3 * raw_eta)
            self._last_raw_eta = int(eta)
            
            if progress >= 100: eta = 0
        else:
            eta = 300

        # Broadcast update
        has_changed = (
            progress != self.last_pct or 
            message != self.last_msg or 
            phase_pct != self.last_phase_pct or
            phase_idx != self.last_phase_idx
        )
        
        if has_changed:
            self.last_pct = progress
            self.last_msg = message
            self.last_phase_pct = phase_pct
            self.last_phase_idx = phase_idx
            
            # BROADCAST LOGGING (For AI/Dev visibility)
            logger.info(
                f"[PROGRESS-BROADCAST] Schema: {self.schema_name} | Phase: {phase_idx} "
                f"({phase_pct}%) | Overall: {progress}% | Message: {message} | ETA: {eta}s"
            )

            if self.channel_layer:
                async_to_sync(self.channel_layer.group_send)(
                    "superadmin_updates",
                    {
                        "type": "institution_update",
                        "data": {
                            "type": "PROVISION_PROGRESS",
                            "schema_name": self.schema_name,
                            "progress": progress,
                            "phase_idx": phase_idx,
                            "phase_pct": phase_pct, # Added for granular UI feedback
                            "message": message,
                            "eta": eta,
                            "elapsed_time": int(elapsed),  # Total elapsed seconds
                            "metrics": {
                                "current": total_done,
                                "total": self.grand_total
                            },
                            "timestamp": time.time() # RESTORED: Vital for ACK loop
                        }
                    }
                )

    def complete(self, message="Synchronization Complete."):
        """Force a terminal 100% state broadcast."""
        self.last_pct = 100
        if self.channel_layer:
            async_to_sync(self.channel_layer.group_send)(
                "superadmin_updates",
                {
                    "type": "institution_update",
                    "data": {
                        "type": "PROVISION_PROGRESS",
                        "schema_name": self.schema_name,
                        "progress": 100,
                        "phase_idx": 4, # Finalization Phase
                        "phase_pct": 100,
                        "message": message,
                        "eta": 0,
                        "metrics": {"current": self.grand_total, "total": self.grand_total},
                        "timestamp": time.time()
                    }
                }
            )

class WSProgressStream(StringIO):
    """
    Custom stream to capture stdout from django-tenants' `migrate_schemas`.
    Reads each line, checks for 'Applying', and fires a WebSocket event with real %.
    """
    def __init__(self, tracker, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tracker = tracker
        self._current_migration = 0
        self._buffer = ""
    
    def write(self, s):
        super().write(s)
        
        count = s.count("Applying ")
        if count > 0:
            try:
                parts = s.split("Applying ")
                last_part = parts[-1]
                raw_msg = last_part.split("...")[0].strip()
                app_name = raw_msg.split(".")[0].replace("_", " ").title()
                msg = f"Configuring {app_name} Components..."
            except:
                msg = "Applying Updates..."

            # Phase index 1 corresponds to "Building System Structure"
            self.tracker.track_work(1, msg, units=count)
        return len(s)

def abort_provisioning_schema(schema_name):
    """
    Safely aborts a migration/provisioning process.
    Drops the schema and cleans up Institution records.
    """
    from apps.auip_tenant.models import Client, Domain
    from apps.identity.models.institution import Institution
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    layer = get_channel_layer()
    def send_abort_ws(msg, progress):
        if layer:
            async_to_sync(layer.group_send)(
                "superadmin_updates",
                {
                    "type": "institution_update",
                    "data": {
                        "type": "ABORT_PROGRESS",
                        "schema_name": schema_name,
                        "progress": progress,
                        "message": msg
                    }
                }
            )

    try:
        send_abort_ws("Stopping Setup...", 10)
        
        # 1. Reset Institution Status
        inst = Institution.objects.filter(schema_name=schema_name).first()
        if inst:
            inst.status = Institution.RegistrationStatus.ABORTED
            inst.is_setup_complete = False
            inst.save()
            send_abort_ws("Removing records...", 40)

        # 2. Cleanup Tenant & Domain
        Domain.objects.filter(domain=f"{schema_name.replace('inst_', '')}.localhost").delete()
        client = Client.objects.filter(schema_name=schema_name).first()
        if client:
            client.delete()
            send_abort_ws("Cleaning up data...", 70)

        # 3. Final Schema Drop (Manual)
        with connection.cursor() as cursor:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
            
        send_abort_ws("Setup Aborted", 100)
        return True
    except Exception as e:
        logger.error(f"[ABORT] Cleanup failed for {schema_name}: {e}")
        send_abort_ws("Recalibrating for manual override...", 0)
        return False

def get_migration_loader():
    """Shared migration loader to avoid O(N) disk re-reads."""
    from django.db import connection
    from django.db.migrations.loader import MigrationLoader
    return MigrationLoader(connection, ignore_no_migrations=True)

def get_tenant_app_labels():
    """Get labels of apps that belong to tenants."""
    return [app.split('.')[-1] for app in settings.TENANT_APPS]

def get_schema_sync_status(schema_name, loader=None):
    """
    Direct check: Is the schema missing any tenant migrations?
    """
    from django_tenants.utils import schema_context
    if not schema_name:
        return False, 0

    try:
        if loader is None:
            loader = get_migration_loader()
        
        tenant_labels = get_tenant_app_labels()
        disk_migrations = {m for m in loader.disk_migrations.keys() if m[0] in tenant_labels}

        with schema_context(schema_name):
            # We need to refresh applied migrations for This specific schema
            loader.build_graph() 
            applied_migrations = {m for m in loader.applied_migrations.keys() if m[0] in tenant_labels}
            
            unapplied = disk_migrations - applied_migrations
            return len(unapplied) > 0, len(unapplied)
    except Exception as e:
        logger.error(f"Sync check failed for {schema_name}: {e}")
        return False, 0

def get_schema_sync_status_detailed(schema_name, loader=None):
    """
    Standardized detailed check with simple naming.
    """
    from django_tenants.utils import schema_context
    if not schema_name:
        return {"is_current": True, "pending_count": 0, "pending_migrations": []}

    try:
        if loader is None:
            loader = get_migration_loader()
        
        tenant_labels = get_tenant_app_labels()
        
        # Performance optimization: Use pre-filtered disk migrations
        # disk_migrations is generally huge, filtering it once per schema is slow.
        # We try to use a cached version if provided via an extra attribute on loader.
        if not hasattr(loader, '_tenant_disk_migrations'):
            loader._tenant_disk_migrations = {m for m in loader.disk_migrations.keys() if m[0] in tenant_labels}
        
        disk_migrations = loader._tenant_disk_migrations

        with schema_context(schema_name):
            # FAST PATH: Directly query the applied migrations via recorder
            from django.db.migrations.recorder import MigrationRecorder
            recorder = MigrationRecorder(connection)
            applied_migrations = {m for m in recorder.applied_migrations().keys() if m[0] in tenant_labels}
            unapplied = disk_migrations - applied_migrations

            # DEEP CHECK: Are the physical tables for all applied migrations actually there?
            # This detects manual deletions via Supabase/SQL-CASCADE
            from django.apps import apps
            missing_tables = []
            
            # 1. Get ALL current tables in this schema
            with connection.cursor() as cursor:
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s", [schema_name])
                physical_tables = {row[0] for row in cursor.fetchall()}
            
            # 2. Check each tenant-app model's table
            for app_label in tenant_labels:
                app_config = apps.get_app_config(app_label)
                for model in app_config.get_models():
                    table_name = model._meta.db_table
                    if table_name not in physical_tables:
                        missing_tables.append({
                            "app": app_label,
                            "table": table_name,
                            "model": model._meta.object_name
                        })

            by_app = {}
            for app_label, migration_name in unapplied:
                if app_label not in by_app:
                    by_app[app_label] = []
                by_app[app_label].append(migration_name)

            pending_migrations = []
            for app_label in sorted(by_app.keys()):
                migrations = sorted(by_app[app_label])
                pending_migrations.append({
                    "app": app_label,
                    "display": app_label.replace("_", " ").title(),
                    "migrations": migrations,
                    "count": len(migrations)
                })

            is_current = len(unapplied) == 0 and len(missing_tables) == 0
            
            return {
                "is_current": is_current,
                "is_up_to_date": is_current,
                "pending_count": len(unapplied),
                "missing_updates": len(unapplied), # Alias for frontend modal
                "missing_tables_count": len(missing_tables),
                "missing_tables": missing_tables,
                "pending_migrations": pending_migrations,
                "status_code": "INCONSISTENT" if len(missing_tables) > 0 else ("UP_TO_DATE" if is_current else "OUT_OF_DATE")
            }
    except Exception as e:
        logger.error(f"Detailed sync check failed for {schema_name}: {e}")
        return {"is_current": False, "pending_count": -1, "pending_migrations": [], "error": str(e)}

def repair_missing_tables(schema_name, missing_tables_info):
    """
    Programmatically recreates missing tables, indexes, and FKs for a schema.
    Uses Django's SchemaEditor to ensure the DB state matches the Models.
    """
    from django.apps import apps
    from django_tenants.utils import schema_context
    
    results = []
    
    with schema_context(schema_name):
        with connection.schema_editor() as editor:
            for item in missing_tables_info:
                app_label = item['app']
                model_name = item['model']
                try:
                    model = apps.get_model(app_label, model_name)
                    logger.warning(f"[Schema-Repair] Recreating missing table {model._meta.db_table} in {schema_name}")
                    editor.create_model(model)
                    results.append(f"Successfully recreated {model._meta.db_table}")
                except Exception as e:
                    logger.error(f"[Schema-Repair] Failed to recreate {app_label}.{model_name}: {e}")
                    results.append(f"Failed to recreate {app_label}.{model_name}: {str(e)}")
                    
    return results

def delete_institution_data(institution_slug):
    """
    PERMANENT DELETION: Removes the schema, Client, Domain, and the Institution record itself.
    Uses raw SQL to perform a 'Zero-Trust Sweep' of all related public and tenant data.
    This avoids ORM cascade errors (like "relation exams_examattempt does not exist").
    """
    from apps.auip_tenant.models import Client, Domain
    from apps.identity.models.institution import Institution
    from apps.identity.models.core_models import User
    
    inst = Institution.objects.filter(slug=institution_slug).first()
    if not inst:
        return False, "Institution not found."
        
    inst_id = inst.id
    schema_name = inst.schema_name
    
    logger.warning(f"[HARD-WIPE] Starting permanent wipe for {institution_slug} (ID: {inst_id})")
    
    try:
        with connection.cursor() as cursor:
            # 0. OMNISCIENT SEARCH-PATH Strategy
            # This is the secret sauce: Postgres needs to 'see' the tables in other schemas
            # to fulfill FK constraints even if we are dropping the current schema.
            cursor.execute("SELECT schema_name FROM auip_tenant_client")
            all_schemas = [r[0] for r in cursor.fetchall()]
            # Build a search path containing public + all tenant schemas
            # We limit this to ensure we don't exceed Postgres string limits
            limited_schemas = all_schemas[:50] 
            path_string = ",".join(['public'] + [f'"{s}"' for s in limited_schemas])
            cursor.execute(f"SET search_path TO {path_string};")
            
            # Also try to disable triggers (requires superuser, fails silently if not)
            try:
                cursor.execute("SET session_replication_role = 'replica';")
            except Exception:
                pass

            try:
                # 1. Hard Drop Schema IMMEDIATELY
                if schema_name:
                    logger.info(f"[HARD-WIPE] Dropping schema {schema_name} CASCADE...")
                    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
                    
                    # Cleanup tenant metadata via RAW SQL
                    cursor.execute("DELETE FROM auip_tenant_domain WHERE tenant_id IN (SELECT id FROM auip_tenant_client WHERE schema_name = %s)", [schema_name])
                    cursor.execute("DELETE FROM auip_tenant_client WHERE schema_name = %s", [schema_name])

                # 2. Gather all users linked ONLY to this institution
                cursor.execute("""
                    SELECT id FROM identity_user 
                    WHERE role != 'SUPER_ADMIN' AND id IN (
                        SELECT user_id FROM identity_studentprofile WHERE institution_id = %s
                        UNION
                        SELECT user_id FROM identity_teacherprofile WHERE institution_id = %s
                        UNION
                        SELECT user_id FROM identity_institutionadmin WHERE institution_id = %s
                    )
                """, [inst_id, inst_id, inst_id])
                candidate_user_ids = [r[0] for r in cursor.fetchall()]
                
                final_user_ids = []
                for uid in candidate_user_ids:
                    cursor.execute("""
                        SELECT COUNT(*) FROM (
                            SELECT id FROM identity_studentprofile WHERE user_id = %s AND institution_id != %s
                            UNION
                            SELECT id FROM identity_teacherprofile WHERE user_id = %s AND institution_id != %s
                            UNION
                            SELECT id FROM identity_institutionadmin WHERE user_id = %s AND institution_id != %s
                        ) AS others
                    """, [uid, inst_id, uid, inst_id, uid, inst_id])
                    if cursor.fetchone()[0] == 0:
                        final_user_ids.append(uid)

                # 3. Clean up Public Profiles/Links
                cursor.execute("DELETE FROM identity_studentprofile WHERE institution_id = %s", [inst_id])
                cursor.execute("DELETE FROM identity_teacherprofile WHERE institution_id = %s", [inst_id])
                cursor.execute("DELETE FROM identity_institutionadmin WHERE institution_id = %s", [inst_id])
                cursor.execute("DELETE FROM core_students WHERE institution_id = %s", [inst_id])
                
                # 4. Wipe the Users (with a resilient fallback)
                if final_user_ids:
                    try:
                        format_ids = ','.join(['%s'] * len(final_user_ids))
                        cursor.execute(f"DELETE FROM identity_user WHERE id IN ({format_ids})", final_user_ids)
                    except Exception as u_err:
                        logger.warning(f"[HARD-WIPE] Could not delete all users ({u_err}), likely due to lingering FKs in other schemas. Continuing...")

                # 5. Final Blow: Wipe the Institution Record
                cursor.execute("DELETE FROM identity_institution WHERE id = %s", [inst_id])
                
                # 6. Verify Deletion
                cursor.execute("SELECT COUNT(*) FROM identity_institution WHERE id = %s", [inst_id])
                remaining = cursor.fetchone()[0]
                if remaining > 0:
                    logger.error(f"[HARD-WIPE] Institution record {inst_id} still exists after DELETE!")
                    return False, "Deletion appeared to succeed but record still exists. Manual intervention required."
            finally:
                # Restore triggers and search path
                try:
                    cursor.execute("SET session_replication_role = 'origin';")
                    cursor.execute("SET search_path TO public;")
                except Exception:
                    pass
        
        logger.warning(f"[HARD-WIPE] Successfully completed permanent wipe for {institution_slug}.")
        return True, "Wiped successfully."
    except Exception as e:
        logger.exception(f"[HARD-WIPE] Failure during wipe of {institution_slug}: {e}")
        return False, str(e)

def create_institution_schema(schema_name, name=None, domain=None, tracker=None):
    """
    Creates a new Tenant (Client) and Domain.
    Performs full Django migrations for the tenant schema.
    """
    if tracker is None:
        tracker = UnifiedProvisioningTracker(schema_name)

    schema_name = "".join(c for c in schema_name if c.isalnum() or c == "_").lower()
    
    client = Client.objects.filter(schema_name=schema_name).first()
    try:
        if not client:
            Client.auto_create_schema = False
            client = Client.objects.create(
                schema_name=schema_name,
                name=name or schema_name
            )
            Client.auto_create_schema = True

            final_domain = domain or f"{schema_name}.localhost"
            Domain.objects.get_or_create(
                domain=final_domain,
                defaults={"tenant": client, "is_primary": True}
            )
            logger.info(f"[Multi-Tenancy] New Client/Domain created for {schema_name}.")
        
        # --- MIGRATION ENGINE ---
        layer = get_channel_layer()
        def report(pct, msg):
            if layer:
                async_to_sync(layer.group_send)(
                    "superadmin_updates",
                    {
                        "type": "institution_update",
                        "data": {
                            "type": "PROVISION_PROGRESS",
                            "schema_name": schema_name,
                            "progress": pct,
                            "message": msg
                        }
                    }
                )

        # 1. Prepare Schema
        logger.info(f"[Multi-Tenancy] Preparing fresh schema: {schema_name}")
        tracker.track_work(0, "Preparing Secure Workspace...") # Phase 0: Securing Database
        
        original_autocommit = connection.autocommit
        connection.set_autocommit(True)
        try:
            with connection.cursor() as cursor:
                tracker.track_work(0, "Cleaning ephemeral partitions...", units=0)
                cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
                tracker.track_work(0, "Optimizing database indexes...", units=0)
                cursor.execute(f'CREATE SCHEMA "{schema_name}";')
        finally:
            connection.set_autocommit(original_autocommit)

        # 2. Run Full Migrations
        logger.info(f"[Multi-Tenancy] Triggering Full Migration for {schema_name}...")
        out_stream = WSProgressStream(tracker)
        call_command(
            'migrate_schemas', 
            tenant=True, 
            schema=schema_name, 
            verbosity=1, 
            stdout=out_stream, 
            stderr=out_stream,
            interactive=False
        )
        
        # Meta Step completion
        tracker.track_work(1, "Database Structure Finalized.")
        
        logger.info(f"[Multi-Tenancy] Full Migration completed for {schema_name}.")
        return True

    except Exception as e:
        Client.auto_create_schema = True
        logger.exception(f"[Multi-Tenancy] Critical migration failure: {e}")
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
