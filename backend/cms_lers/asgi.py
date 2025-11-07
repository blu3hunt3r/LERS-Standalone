"""
ASGI config for CMS + LERS project.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms_lers.settings')

application = get_asgi_application()

