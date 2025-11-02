from django.apps import AppConfig


class LersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.lers'
    verbose_name = 'Law Enforcement Request System (LERS)'
    
    def ready(self):
        import apps.lers.signals

