"""
URL configuration for evidence app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EvidenceFileViewSet, EvidenceTagViewSet, CourtBundleViewSet

router = DefaultRouter()
router.register(r'files', EvidenceFileViewSet, basename='evidence-file')
router.register(r'tags', EvidenceTagViewSet, basename='evidence-tag')
router.register(r'bundles', CourtBundleViewSet, basename='court-bundle')

urlpatterns = [
    path('', include(router.urls)),
]

