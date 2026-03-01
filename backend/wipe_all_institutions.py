import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.local')
django.setup()

from apps.auip_tenant.models import Client, Domain
from apps.identity.models import Institution
from django.db import connection

print('=== WIPING SCHEMAS FROM POSTGRESQL ===')
schemas_to_drop = [
    'inst_test', 'inst_mallareddy_university', 'inst_andhra_university',
    'inst_testing', 'inst_testing_2', 'testing_clone', 'inst_testing_3'
]
with connection.cursor() as cursor:
    for schema in schemas_to_drop:
        cursor.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE;')
        print(f'  Dropped schema: {schema}')

print()
print('=== DELETING DOMAINS ===')
deleted = Domain.objects.exclude(domain__in=['localhost', '127.0.0.1']).delete()
print(f'  Deleted: {deleted}')

print()
print('=== DELETING CLIENTS (keeping public) ===')
deleted = Client.objects.exclude(schema_name='public').delete()
print(f'  Deleted: {deleted}')

print()
print('=== DELETING ALL INSTITUTION RECORDS ===')
deleted = Institution.objects.all().delete()
print(f'  Deleted: {deleted}')

print()
print('=== VERIFICATION ===')
print(f'Clients remaining: {Client.objects.count()}')
print(f'Domains remaining: {Domain.objects.count()}')
print(f'Institutions remaining: {Institution.objects.count()}')
print()
print('WIPE COMPLETE. Database is clean.')
