from django.apps import AppConfig


class IdentityAccessConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.identity'
    label = 'identity'
    verbose_name = 'Identity & Access Management'

    def ready(self):
        import apps.identity.signals
