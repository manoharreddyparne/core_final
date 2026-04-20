from django.db import migrations
import json

def add_health_pulse_task(apps, schema_editor):
    try:
        PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
        IntervalSchedule = apps.get_model('django_celery_beat', 'IntervalSchedule')

        # Create 1-minute interval
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=1,
            period='minutes',
        )

        # Register health pulse task
        PeriodicTask.objects.get_or_create(
            name='Ecosystem Structural Health Pulse',
            task='apps.identity.tasks.monitor_ecosystem_health_task',
            interval=schedule,
            enabled=True,
            queue='certificates'
        )
    except Exception as e:
        print(f"Skipping pulse task registration: {e}")

def remove_health_pulse_task(apps, schema_editor):
    try:
        PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
        PeriodicTask.objects.filter(name='Ecosystem Structural Health Pulse').delete()
    except:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ('identity', '0020_alter_institution_status_schemaupdatehistory'),
        ('django_celery_beat', '0001_initial'), # Ensure beat tables exist
    ]

    operations = [
        migrations.RunPython(add_health_pulse_task, reverse_code=remove_health_pulse_task),
    ]
