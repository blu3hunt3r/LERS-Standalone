"""
Serializers for authentication and user management.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from .models import User, LoginHistory, APIKey
from django.utils import timezone


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""

    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'phone',
            'role', 'role_display', 'tenant', 'tenant_name',
            'is_active', 'is_verified', 'two_factor_enabled',
            'employee_id', 'designation', 'department',
            'public_key', 'public_key_fingerprint', 'key_created_at',
            'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'full_name', 'phone',
            'password', 'password_confirm',
            'role', 'tenant', 'employee_id', 'designation', 'department'
        ]
    
    def validate(self, attrs):
        """Validate passwords match."""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Validate user credentials."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            
            if user.is_locked():
                raise serializers.ValidationError(
                    'Account is locked due to multiple failed login attempts. '
                    'Please try again later.'
                )
            
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include "email" and "password".')
        
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Validate passwords."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs
    
    def validate_old_password(self, value):
        """Validate old password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class LoginHistorySerializer(serializers.ModelSerializer):
    """Serializer for login history."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = LoginHistory
        fields = [
            'id', 'user', 'user_email', 'ip_address', 'user_agent',
            'success', 'failure_reason', 'location', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class APIKeySerializer(serializers.ModelSerializer):
    """Serializer for API keys."""
    
    class Meta:
        model = APIKey
        fields = [
            'id', 'name', 'key_prefix', 'scopes', 'is_active',
            'expires_at', 'last_used_at', 'rate_limit', 'created_at'
        ]
        read_only_fields = ['id', 'key_prefix', 'last_used_at', 'created_at']


class APIKeyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating API keys."""

    key = serializers.CharField(read_only=True)  # Return key only on creation

    class Meta:
        model = APIKey
        fields = ['name', 'scopes', 'expires_at', 'rate_limit', 'key']

    def create(self, validated_data):
        """Create API key with generated key."""
        import secrets

        # Generate secure random key
        key = f"sk_live_{secrets.token_urlsafe(32)}"
        prefix = key[:10]

        validated_data['key'] = key
        validated_data['key_prefix'] = prefix
        validated_data['user'] = self.context['request'].user

        return super().create(validated_data)


class PublicKeyUploadSerializer(serializers.Serializer):
    """Serializer for uploading public encryption key."""

    public_key = serializers.CharField(
        required=True,
        help_text='RSA public key in PEM format'
    )
    fingerprint = serializers.CharField(
        required=True,
        max_length=64,
        help_text='SHA-256 fingerprint of the public key'
    )

    def validate_public_key(self, value):
        """Validate the public key format."""
        if not value.startswith('-----BEGIN PUBLIC KEY-----'):
            raise serializers.ValidationError('Invalid PEM format for public key')
        if not value.strip().endswith('-----END PUBLIC KEY-----'):
            raise serializers.ValidationError('Invalid PEM format for public key')
        return value

    def validate_fingerprint(self, value):
        """Validate fingerprint format (64 hex chars)."""
        if len(value) != 64 or not all(c in '0123456789abcdef' for c in value.lower()):
            raise serializers.ValidationError('Fingerprint must be 64 hexadecimal characters')
        return value.lower()


class PublicKeySerializer(serializers.Serializer):
    """Serializer for returning public keys."""

    user_id = serializers.UUIDField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    public_key = serializers.CharField()
    fingerprint = serializers.CharField()
    key_created_at = serializers.DateTimeField()

