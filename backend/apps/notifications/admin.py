"""
Admin configuration for notifications app.
"""
from django.contrib import admin
from .models import Notification, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for notifications."""
    
    list_display = [
        'title', 'user', 'notification_type', 'status',
        'email_sent', 'created_at'
    ]
    list_filter = ['notification_type', 'status', 'email_sent', 'created_at']
    search_fields = ['title', 'message', 'user__email']
    readonly_fields = ['sent_at', 'read_at', 'created_at']


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Admin interface for notification templates."""
    
    list_display = ['name', 'notification_type', 'is_active']
    list_filter = ['notification_type', 'is_active']
    search_fields = ['name']

