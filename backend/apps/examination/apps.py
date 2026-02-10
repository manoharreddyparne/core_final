from django.apps import AppConfig


class ExaminationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.examination'
    label = 'examination'
    verbose_name = 'Examination Service'
