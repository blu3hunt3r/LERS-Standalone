"""
Views for authentication and user management.
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import logout
from django.utils import timezone
from .models import User, LoginHistory, APIKey
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    ChangePasswordSerializer, LoginHistorySerializer,
    APIKeySerializer, APIKeyCreateSerializer,
    PublicKeyUploadSerializer, PublicKeySerializer
)
from apps.core.permissions import IsStationAdmin


class RegisterView(generics.CreateAPIView):
    """
    Register a new user (requires admin approval).
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]  # Change to [IsStationAdmin] in production
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'User registered successfully. Awaiting admin approval.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """
    User login endpoint with JWT token generation.
    """
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Reset failed login attempts
        user.reset_failed_login()
        
        # Update last login IP
        user.last_login_ip = self.get_client_ip(request)
        user.save(update_fields=['last_login_ip'])
        
        # Log successful login
        LoginHistory.objects.create(
            user=user,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=True
        )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)
    
    def get_client_ip(self, request):
        """Extract client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LogoutView(generics.GenericAPIView):
    """
    Logout user and blacklist refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            logout(request)
            return Response({
                'message': 'Successfully logged out.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Invalid token or token already blacklisted.'
            }, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'tenant', 'is_active']
    search_fields = ['email', 'full_name', 'username', 'employee_id']
    
    def get_queryset(self):
        """Filter users by tenant for non-admin users."""
        user = self.request.user
        if user.role in ['ADMIN']:
            return User.objects.filter(is_deleted=False)
        elif user.tenant:
            return User.objects.filter(tenant=user.tenant, is_deleted=False)
        return User.objects.none()
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user details."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Change user password."""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsStationAdmin])
    def activate(self, request, pk=None):
        """Activate a user account."""
        user = self.get_object()
        user.is_active = True
        user.is_verified = True
        user.save(update_fields=['is_active', 'is_verified'])
        
        return Response({
            'message': f'User {user.email} activated successfully.'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsStationAdmin])
    def deactivate(self, request, pk=None):
        """Deactivate a user account."""
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])

        return Response({
            'message': f'User {user.email} deactivated successfully.'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_public_key(self, request):
        """Upload user's public encryption key for E2E encryption."""
        serializer = PublicKeyUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.public_key = serializer.validated_data['public_key']
        user.public_key_fingerprint = serializer.validated_data['fingerprint']
        user.key_created_at = timezone.now()
        user.save(update_fields=['public_key', 'public_key_fingerprint', 'key_created_at'])

        return Response({
            'message': 'Public key uploaded successfully.',
            'fingerprint': user.public_key_fingerprint,
            'created_at': user.key_created_at
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def get_public_key(self, request):
        """Get current user's public key."""
        user = request.user
        if not user.public_key:
            return Response({
                'error': 'No public key found for this user.'
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'user_id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'public_key': user.public_key,
            'fingerprint': user.public_key_fingerprint,
            'key_created_at': user.key_created_at
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def public_key(self, request, pk=None):
        """Get another user's public key (for encrypting messages to them)."""
        try:
            user = User.objects.get(pk=pk, is_active=True)
            if not user.public_key:
                return Response({
                    'error': 'No public key found for this user.'
                }, status=status.HTTP_404_NOT_FOUND)

            return Response({
                'user_id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'public_key': user.public_key,
                'fingerprint': user.public_key_fingerprint,
                'key_created_at': user.key_created_at
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found.'
            }, status=status.HTTP_404_NOT_FOUND)


class LoginHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing login history.
    """
    queryset = LoginHistory.objects.all()
    serializer_class = LoginHistorySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'success', 'ip_address']
    
    def get_queryset(self):
        """Filter login history by user or tenant."""
        user = self.request.user
        if user.role in ['ADMIN', 'STATION_ADMIN']:
            return LoginHistory.objects.all()
        return LoginHistory.objects.filter(user=user)


class APIKeyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing API keys (for LERS company integrations).
    """
    queryset = APIKey.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return APIKeyCreateSerializer
        return APIKeySerializer
    
    def get_queryset(self):
        """Filter API keys by user."""
        return APIKey.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create API key for current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke an API key."""
        api_key = self.get_object()
        api_key.is_active = False
        api_key.save(update_fields=['is_active'])
        
        return Response({
            'message': 'API key revoked successfully.'
        }, status=status.HTTP_200_OK)

