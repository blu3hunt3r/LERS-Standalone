"""
URL configuration for authentication app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView,
    UserViewSet, LoginHistoryViewSet, APIKeyViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'login-history', LoginHistoryViewSet, basename='login-history')
router.register(r'api-keys', APIKeyViewSet, basename='api-key')

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Router URLs
    path('', include(router.urls)),
]

