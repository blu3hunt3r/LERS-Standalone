"""
User authentication and authorization models.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from apps.core.models import TimestampedModel, UUIDModel
import uuid


class UserManager(BaseUserManager):
    """Custom user manager."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('Email address is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, UUIDModel, TimestampedModel):
    """
    Custom User model with role-based access control.
    """
    
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'System Administrator'
        STATION_ADMIN = 'STATION_ADMIN', 'Station Administrator'
        IO = 'IO', 'Investigating Officer'
        APPROVER = 'APPROVER', 'Approver (SP/DSP)'
        ANALYST = 'ANALYST', 'Analyst'
        COMPANY_AGENT = 'COMPANY_AGENT', 'Company Agent (LERS)'
    
    # Core fields
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Role and permissions
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.IO)
    
    # Tenant relationship (police station or company)
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True
    )
    
    # Status flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    
    # Two-factor authentication
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, blank=True, null=True)
    
    # Metadata
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Employee details (for police officers)
    employee_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)

    # End-to-End Encryption keys
    public_key = models.TextField(
        blank=True,
        null=True,
        help_text='RSA public key for E2E encryption (PEM format)'
    )
    public_key_fingerprint = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text='SHA-256 fingerprint of public key for verification'
    )
    key_created_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text='When the encryption key pair was generated'
    )

    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['tenant']),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
    
    def is_locked(self):
        """Check if user account is locked."""
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False
    
    def increment_failed_login(self):
        """Increment failed login attempts."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            # Lock account for 30 minutes
            self.locked_until = timezone.now() + timezone.timedelta(minutes=30)
        self.save(update_fields=['failed_login_attempts', 'locked_until'])
    
    def reset_failed_login(self):
        """Reset failed login attempts."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['failed_login_attempts', 'locked_until'])
    
    def has_role(self, *roles):
        """Check if user has one of the specified roles."""
        return self.role in roles


class RefreshToken(UUIDModel, TimestampedModel):
    """
    Store refresh tokens for JWT authentication.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    token = models.CharField(max_length=500, unique=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'refresh_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'revoked_at']),
        ]
    
    def __str__(self):
        return f"RefreshToken for {self.user.email}"
    
    def is_valid(self):
        """Check if token is valid."""
        return (
            not self.revoked_at and
            self.expires_at > timezone.now()
        )
    
    def revoke(self):
        """Revoke the token."""
        self.revoked_at = timezone.now()
        self.save(update_fields=['revoked_at'])


class LoginHistory(UUIDModel, TimestampedModel):
    """
    Track user login history for audit purposes.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=True)
    failure_reason = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)  # Geolocation
    
    class Meta:
        db_table = 'login_history'
        ordering = ['-created_at']
        verbose_name_plural = 'Login Histories'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        status = 'Success' if self.success else 'Failed'
        return f"{self.user.email} - {status} - {self.created_at}"


class APIKey(UUIDModel, TimestampedModel):
    """
    API keys for company integrations (LERS).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=255)  # Descriptive name
    key = models.CharField(max_length=255, unique=True, db_index=True)
    key_prefix = models.CharField(max_length=10)  # For display (e.g., "sk_live_abc")
    
    # Permissions
    scopes = models.JSONField(default=list)  # List of allowed API scopes
    
    # Status
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Rate limiting
    rate_limit = models.IntegerField(default=1000)  # Requests per hour
    
    class Meta:
        db_table = 'api_keys'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['key']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.key_prefix}***)"
    
    def is_valid(self):
        """Check if API key is valid."""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True

