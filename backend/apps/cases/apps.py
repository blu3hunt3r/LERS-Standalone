"""
Django app configuration for cases stub app.
"""
from django.apps import AppConfig


class CasesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cases'
    verbose_name = 'Cases (Stub for LERS Standalone)'
