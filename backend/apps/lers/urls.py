"""
URL configuration for LERS app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LERSRequestViewSet, LERSResponseViewSet, LERSTemplateViewSet,
    ProviderDataCatalogViewSet, CatalogBrowseViewSet,
    ProviderServiceProfileViewSet, CatalogUsageAnalyticsViewSet
)

router = DefaultRouter()
router.register(r'requests', LERSRequestViewSet, basename='lers-request')
router.register(r'responses', LERSResponseViewSet, basename='lers-response')
router.register(r'templates', LERSTemplateViewSet, basename='lers-template')

# Provider Data Catalog endpoints
router.register(r'provider-catalog', ProviderDataCatalogViewSet, basename='provider-catalog')
router.register(r'catalog-browse', CatalogBrowseViewSet, basename='catalog-browse')
router.register(r'provider-profiles', ProviderServiceProfileViewSet, basename='provider-profile')
router.register(r'catalog-analytics', CatalogUsageAnalyticsViewSet, basename='catalog-analytics')

urlpatterns = [
    path('', include(router.urls)),
]

