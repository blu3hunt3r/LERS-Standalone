"""
Feature 3 (Phase 4): Cache Invalidation Signals

Automatic cache invalidation when models are created/updated/deleted.

Signal Handlers:
- Case created/updated → Invalidate dashboard stats, case counts
- Evidence uploaded → Invalidate evidence counts, case stats
- LERS request status changed → Invalidate LERS counts, dashboard
- User profile updated → Invalidate user cache
- Tenant settings changed → Invalidate tenant cache

This ensures cache consistency without manual invalidation.
"""

from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.core.cache import cache
import logging

from apps.cases.models import Case, CaseParticipant, CaseTimeline
from apps.evidence.models import EvidenceFile
from apps.lers.models import LERSRequest
from apps.authentication.models import User
from apps.tenants.models import Tenant
from apps.entities.models import ExtractedEntity

from .cache import (
    invalidate_case_cache,
    invalidate_tenant_cache,
    invalidate_user_cache,
    CacheKeys,
    generate_cache_key
)

logger = logging.getLogger(__name__)


# ============================================================================
# CASE SIGNALS
# ============================================================================

@receiver([post_save, post_delete], sender=Case)
def invalidate_case_caches(sender, instance, **kwargs):
    """
    Invalidate caches when case is created/updated/deleted.

    Invalidates:
    - Dashboard stats for tenant
    - Case counts by status
    - Entity graph for case
    """
    logger.debug(f"Invalidating caches for case {instance.case_number}")

    # Invalidate case-specific caches
    invalidate_case_cache(instance.id, instance.tenant_id)

    # Invalidate tenant aggregates
    cache.delete_many([
        generate_cache_key(CacheKeys.TENANT_STATS, tenant_id=instance.tenant_id),
        generate_cache_key(CacheKeys.CASE_COUNTS, tenant_id=instance.tenant_id, status='ALL'),
        generate_cache_key(CacheKeys.CASE_COUNTS, tenant_id=instance.tenant_id, status=instance.status),
    ])

    # Invalidate assigned user's dashboard
    if instance.assigned_to_id:
        cache.delete(generate_cache_key(
            CacheKeys.DASHBOARD_STATS,
            tenant_id=instance.tenant_id,
            user_id=instance.assigned_to_id
        ))


@receiver([post_save, post_delete], sender=CaseParticipant)
def invalidate_case_participant_cache(sender, instance, **kwargs):
    """Invalidate case cache when participants change."""
    cache.delete(f"case_details:{instance.case_id}")


@receiver(post_save, sender=CaseTimeline)
def invalidate_case_timeline_cache(sender, instance, **kwargs):
    """Invalidate case timeline cache."""
    cache.delete(f"case_timeline:{instance.case_id}")


# ============================================================================
# EVIDENCE SIGNALS
# ============================================================================

@receiver([post_save, post_delete], sender=EvidenceFile)
def invalidate_evidence_caches(sender, instance, **kwargs):
    """
    Invalidate caches when evidence is uploaded/deleted.

    Invalidates:
    - Evidence counts for tenant
    - Case details (evidence count changed)
    - Dashboard stats
    """
    logger.debug(f"Invalidating evidence caches for case {instance.case_id}")

    cache.delete_many([
        generate_cache_key(CacheKeys.EVIDENCE_COUNTS, tenant_id=instance.case.tenant_id),
        f"case_details:{instance.case_id}",
        f"evidence_list:{instance.case_id}",
    ])

    # Invalidate tenant dashboard
    cache.delete(generate_cache_key(
        CacheKeys.TENANT_STATS,
        tenant_id=instance.case.tenant_id
    ))


# ============================================================================
# LERS SIGNALS
# ============================================================================

@receiver([post_save, post_delete], sender=LERSRequest)
def invalidate_lers_caches(sender, instance, **kwargs):
    """
    Invalidate caches when LERS request changes.

    Invalidates:
    - LERS counts by status
    - Case details (LERS count changed)
    - Dashboard stats
    - Provider dashboard (for company agents)
    """
    logger.debug(f"Invalidating LERS caches for request {instance.request_number}")

    cache.delete_many([
        generate_cache_key(CacheKeys.LERS_COUNTS, tenant_id=instance.case.tenant_id, status='ALL'),
        generate_cache_key(CacheKeys.LERS_COUNTS, tenant_id=instance.case.tenant_id, status=instance.status),
        f"case_details:{instance.case_id}",
        f"lers_list:{instance.case_id}",
    ])

    # Invalidate provider dashboard if applicable
    if instance.provider_tenant_id:
        cache.delete(generate_cache_key(
            CacheKeys.TENANT_STATS,
            tenant_id=instance.provider_tenant_id
        ))

    # Invalidate creator's dashboard
    if instance.created_by_id:
        cache.delete(generate_cache_key(
            CacheKeys.DASHBOARD_STATS,
            tenant_id=instance.case.tenant_id,
            user_id=instance.created_by_id
        ))


# ============================================================================
# ENTITY SIGNALS
# ============================================================================

@receiver([post_save, post_delete], sender=ExtractedEntity)
def invalidate_entity_caches(sender, instance, **kwargs):
    """
    Invalidate caches when entities are extracted/updated.

    Invalidates:
    - Entity graph for case
    - Entity statistics
    - Case details
    """
    logger.debug(f"Invalidating entity caches for case {instance.case_id}")

    cache.delete_many([
        generate_cache_key(CacheKeys.ENTITY_GRAPH, case_id=instance.case_id),
        generate_cache_key(CacheKeys.ENTITY_STATS, case_id=instance.case_id),
        f"case_details:{instance.case_id}",
    ])


# ============================================================================
# USER SIGNALS
# ============================================================================

@receiver(post_save, sender=User)
def invalidate_user_caches_on_save(sender, instance, **kwargs):
    """
    Invalidate user caches when profile is updated.

    Invalidates:
    - User profile
    - User permissions
    - User preferences
    - Tenant user list
    """
    logger.debug(f"Invalidating user caches for user {instance.id}")

    invalidate_user_cache(instance.id)

    # Invalidate tenant user list
    if instance.tenant_id:
        cache.delete(generate_cache_key(
            CacheKeys.TENANT_USERS,
            tenant_id=instance.tenant_id
        ))


# ============================================================================
# TENANT SIGNALS
# ============================================================================

@receiver(post_save, sender=Tenant)
def invalidate_tenant_caches_on_save(sender, instance, **kwargs):
    """
    Invalidate tenant caches when settings change.

    Invalidates:
    - Tenant configuration
    - All tenant-related statistics
    - All user dashboards for tenant
    """
    logger.debug(f"Invalidating tenant caches for tenant {instance.id}")

    invalidate_tenant_cache(instance.id)


# ============================================================================
# BULK INVALIDATION UTILITIES
# ============================================================================

def invalidate_all_dashboard_caches():
    """
    Invalidate all dashboard caches.

    Use Case: After major data import or system maintenance.
    Warning: Expensive operation - use sparingly.
    """
    from .cache import invalidate_pattern
    logger.warning("Invalidating ALL dashboard caches (expensive)")
    invalidate_pattern("dashboard:*")
    invalidate_pattern("*_counts:*")
    invalidate_pattern("tenant_stats:*")


def invalidate_case_related_caches(case_id: int):
    """
    Invalidate all caches related to a specific case.

    Args:
        case_id: Case ID

    Use Case: Manual cache invalidation via management command.
    """
    from apps.cases.models import Case
    try:
        case = Case.objects.get(id=case_id)
        invalidate_case_cache(case_id, case.tenant_id)
        logger.info(f"Invalidated all caches for case {case.case_number}")
    except Case.DoesNotExist:
        logger.error(f"Case {case_id} not found for cache invalidation")


# ============================================================================
# SIGNAL REGISTRATION
# ============================================================================

def register_cache_signals():
    """
    Register all cache invalidation signals.

    Call this in apps.py ready() method if signals are not auto-discovered.
    """
    logger.info("Cache invalidation signals registered")


# Example: Selective signal disabling during bulk operations
from contextlib import contextmanager

@contextmanager
def disable_cache_signals():
    """
    Temporarily disable cache signals for bulk operations.

    Usage:
        with disable_cache_signals():
            # Bulk create cases without triggering cache invalidation
            Case.objects.bulk_create(cases)
        # Manually invalidate cache once after bulk operation
        invalidate_all_dashboard_caches()
    """
    from django.db.models import signals

    # Disconnect signals
    signals.post_save.disconnect(invalidate_case_caches, sender=Case)
    signals.post_save.disconnect(invalidate_evidence_caches, sender=EvidenceFile)
    signals.post_save.disconnect(invalidate_lers_caches, sender=LERSRequest)

    logger.info("Cache signals temporarily disabled")

    try:
        yield
    finally:
        # Reconnect signals
        signals.post_save.connect(invalidate_case_caches, sender=Case)
        signals.post_save.connect(invalidate_evidence_caches, sender=EvidenceFile)
        signals.post_save.connect(invalidate_lers_caches, sender=LERSRequest)

        logger.info("Cache signals re-enabled")
