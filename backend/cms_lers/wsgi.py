"""
WSGI config for CMS + LERS project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms_lers.settings')

application = get_wsgi_application()

