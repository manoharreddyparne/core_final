from django.apps import AppConfig


class IdentityAccessConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.identity_access'
    label = 'identity_access'
    verbose_name = 'Identity & Access Management'
