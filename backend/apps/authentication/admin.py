"""
Admin configuration for authentication app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, RefreshToken, LoginHistory, APIKey


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""
    
    list_display = ['email', 'full_name', 'role', 'tenant', 'is_active', 'is_verified', 'created_at']
    list_filter = ['role', 'is_active', 'is_verified', 'tenant', 'created_at']
    search_fields = ['email', 'full_name', 'username', 'employee_id']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'phone', 'employee_id', 'designation', 'department')}),
        ('Permissions', {'fields': ('role', 'tenant', 'is_active', 'is_staff', 'is_superuser', 'is_verified')}),
        ('Security', {'fields': ('two_factor_enabled', 'failed_login_attempts', 'locked_until')}),
        ('Metadata', {'fields': ('last_login', 'last_login_ip', 'created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'full_name', 'role', 'tenant', 'password1', 'password2'),
        }),
    )


@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    """Admin interface for RefreshToken model."""
    
    list_display = ['user', 'token_short', 'expires_at', 'revoked_at', 'created_at']
    list_filter = ['revoked_at', 'created_at']
    search_fields = ['user__email', 'token']
    readonly_fields = ['created_at', 'updated_at']
    
    def token_short(self, obj):
        """Display shortened token."""
        return f"{obj.token[:20]}..." if obj.token else ""
    token_short.short_description = 'Token'


@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    """Admin interface for LoginHistory model."""
    
    list_display = ['user', 'ip_address', 'success', 'location', 'created_at']
    list_filter = ['success', 'created_at']
    search_fields = ['user__email', 'ip_address']
    readonly_fields = ['created_at']


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    """Admin interface for APIKey model."""
    
    list_display = ['name', 'user', 'key_prefix', 'is_active', 'expires_at', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'user__email', 'key']
    readonly_fields = ['key', 'key_prefix', 'created_at', 'updated_at', 'last_used_at']

