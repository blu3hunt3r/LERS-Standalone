"""
Stub Case model for LERS Standalone.

This provides the minimal Case model definition required for ForeignKey
relationships in LERS, Evidence, and Notifications apps.

STANDALONE MODE: This is a stub - no actual case management functionality.
"""
from django.db import models
from django.conf import settings


class Case(models.Model):
    """
    Stub Case model for LERS Standalone.

    Contains only the minimal fields needed for ForeignKey relationships.
    In standalone mode, cases are not actively managed.
    """
    # Basic identification
    case_number = models.CharField(max_length=100, unique=True)
    ack_number = models.CharField(max_length=100, blank=True, null=True)

    # Tenant relationship
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='cases'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft delete
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'cases_case'
        ordering = ['-created_at']
        verbose_name = 'Case (Stub)'
        verbose_name_plural = 'Cases (Stub)'

    def __str__(self):
        return self.case_number


class CaseTimeline(models.Model):
    """
    Stub CaseTimeline model for conditional timeline events.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='timeline_events'
    )
    event_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='case_timeline_events'
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    # Optional foreign keys for related objects
    related_request = models.ForeignKey(
        'lers.LERSRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'cases_casetimeline'
        ordering = ['-timestamp']
        verbose_name = 'Case Timeline (Stub)'
        verbose_name_plural = 'Case Timelines (Stub)'

    def __str__(self):
        return f"{self.case.case_number} - {self.event_type}"


class CaseParticipant(models.Model):
    """
    Stub CaseParticipant model for cache invalidation signals.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    role = models.CharField(max_length=50)

    class Meta:
        db_table = 'cases_caseparticipant'
        unique_together = ['case', 'user']
        verbose_name = 'Case Participant (Stub)'
        verbose_name_plural = 'Case Participants (Stub)'
