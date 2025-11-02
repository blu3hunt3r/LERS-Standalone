"""
URL configuration for tenants app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, TenantSettingsViewSet, TenantRelationshipViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'settings', TenantSettingsViewSet, basename='tenant-settings')
router.register(r'relationships', TenantRelationshipViewSet, basename='tenant-relationship')

urlpatterns = [
    path('', include(router.urls)),
]

