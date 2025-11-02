"""
Feature 3 (Phase 4): Redis Caching Layer

Comprehensive caching utilities for performance optimization.

Cache Tiers:
- Tier 1: Session Data (already handled by Django)
- Tier 2: Frequently Accessed Data (user profiles, tenant configs)
- Tier 3: Expensive Queries (dashboard stats, counts)
- Tier 4: API Response Cache (GET requests, user-specific)

Cache Strategy:
- Short TTL for frequently changing data (2-5 minutes)
- Medium TTL for semi-static data (15 minutes - 1 hour)
- Long TTL for static data (4-24 hours)
- Automatic invalidation on model updates
"""

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class CacheTiers:
    """Cache timeout tiers (in seconds)"""
    REALTIME = 30  # 30 seconds - near real-time data
    SHORT = 120  # 2 minutes - frequently changing
    MEDIUM = 300  # 5 minutes - dashboard stats
    LONG = 900  # 15 minutes - user profiles
    VERY_LONG = 3600  # 1 hour - tenant configs
    STATIC = 86400  # 24 hours - static reference data


class CacheKeys:
    """Centralized cache key patterns"""

    # User-related
    USER_PROFILE = "user_profile:{user_id}"
    USER_PERMISSIONS = "user_perms:{user_id}"
    USER_PREFERENCES = "user_prefs:{user_id}"

    # Tenant-related
    TENANT_CONFIG = "tenant_config:{tenant_id}"
    TENANT_USERS = "tenant_users:{tenant_id}"
    TENANT_STATS = "tenant_stats:{tenant_id}"

    # Dashboard statistics
    DASHBOARD_STATS = "dashboard:{tenant_id}:{user_id}"
    CASE_COUNTS = "case_counts:{tenant_id}:{status}"
    LERS_COUNTS = "lers_counts:{tenant_id}:{status}"
    EVIDENCE_COUNTS = "evidence_counts:{tenant_id}"

    # Entity graph
    ENTITY_GRAPH = "entity_graph:{case_id}"
    ENTITY_STATS = "entity_stats:{case_id}"

    # Search results
    SEARCH_RESULTS = "search:{query_hash}"

    # API response cache
    API_RESPONSE = "api:{method}:{path}:{query_hash}:{user_id}"


def generate_cache_key(pattern: str, **kwargs) -> str:
    """
    Generate cache key from pattern and parameters.

    Args:
        pattern: Key pattern with {placeholders}
        **kwargs: Values for placeholders

    Returns:
        Formatted cache key

    Example:
        generate_cache_key(CacheKeys.USER_PROFILE, user_id=123)
        # Returns: "user_profile:123"
    """
    return pattern.format(**kwargs)


def hash_dict(data: dict) -> str:
    """
    Create consistent hash from dictionary.

    Args:
        data: Dictionary to hash

    Returns:
        MD5 hash of sorted JSON representation
    """
    json_str = json.dumps(data, sort_keys=True)
    return hashlib.md5(json_str.encode()).hexdigest()[:12]


def cached(
    key_pattern: str,
    timeout: int = CacheTiers.MEDIUM,
    key_func: Optional[Callable] = None
):
    """
    Decorator to cache function results.

    Args:
        key_pattern: Cache key pattern (can include {arg_name} placeholders)
        timeout: Cache TTL in seconds
        key_func: Optional function to generate cache key from args

    Example:
        @cached(CacheKeys.USER_PROFILE, timeout=CacheTiers.LONG)
        def get_user_profile(user_id):
            return User.objects.get(id=user_id)

        @cached("search:{query}", key_func=lambda q: {"query": q})
        def search_cases(query):
            return Case.objects.filter(title__icontains=query)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                key_data = key_func(*args, **kwargs)
                cache_key = generate_cache_key(key_pattern, **key_data)
            else:
                # Use function args/kwargs as key data
                import inspect
                sig = inspect.signature(func)
                bound_args = sig.bind(*args, **kwargs)
                bound_args.apply_defaults()
                cache_key = generate_cache_key(key_pattern, **bound_args.arguments)

            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return result

            # Cache miss - execute function
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, timeout)
            return result

        # Add method to manually invalidate cache
        wrapper.invalidate = lambda *args, **kwargs: cache.delete(
            generate_cache_key(key_pattern, **kwargs) if not key_func
            else generate_cache_key(key_pattern, **key_func(*args, **kwargs))
        )

        return wrapper
    return decorator


def cache_model_queryset(
    cache_key: str,
    queryset_func: Callable,
    timeout: int = CacheTiers.MEDIUM,
    serialize: bool = True
) -> Any:
    """
    Cache Django queryset results.

    Args:
        cache_key: Unique cache key
        queryset_func: Function that returns queryset
        timeout: Cache TTL
        serialize: Whether to serialize objects to dicts

    Returns:
        Cached or fresh queryset results

    Example:
        def get_active_cases(tenant_id):
            return cache_model_queryset(
                f"active_cases:{tenant_id}",
                lambda: Case.objects.filter(tenant_id=tenant_id, status='OPEN'),
                timeout=CacheTiers.SHORT
            )
    """
    # Try cache first
    result = cache.get(cache_key)
    if result is not None:
        logger.debug(f"QuerySet cache HIT: {cache_key}")
        return result

    # Cache miss
    logger.debug(f"QuerySet cache MISS: {cache_key}")
    queryset = queryset_func()

    if serialize:
        # Serialize to list of dicts
        result = list(queryset.values())
    else:
        # Cache queryset as-is (not recommended for large querysets)
        result = list(queryset)

    cache.set(cache_key, result, timeout)
    return result


def invalidate_pattern(pattern: str):
    """
    Invalidate all cache keys matching pattern.

    Warning: This is expensive - only use for critical invalidations.
    Consider using specific key invalidation instead.

    Args:
        pattern: Pattern to match (e.g., "dashboard:*")

    Example:
        invalidate_pattern("dashboard:123:*")  # Clear all dashboard caches for tenant 123
    """
    logger.warning(f"Pattern invalidation: {pattern} (expensive operation)")
    # Note: Requires django-redis with scan_iter support
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection("default")
        keys = redis_conn.keys(f"{settings.CACHES['default'].get('KEY_PREFIX', 'cms')}:{pattern}")
        if keys:
            redis_conn.delete(*keys)
            logger.info(f"Invalidated {len(keys)} keys matching {pattern}")
    except Exception as e:
        logger.error(f"Pattern invalidation failed: {e}")


def invalidate_tenant_cache(tenant_id: int):
    """
    Invalidate all caches for a tenant.

    Args:
        tenant_id: Tenant ID

    Use Case: When tenant configuration changes
    """
    patterns = [
        f"tenant_*:{tenant_id}",
        f"dashboard:{tenant_id}:*",
        f"case_counts:{tenant_id}:*",
        f"lers_counts:{tenant_id}:*",
        f"evidence_counts:{tenant_id}",
    ]
    for pattern in patterns:
        invalidate_pattern(pattern)


def invalidate_user_cache(user_id: int):
    """
    Invalidate all caches for a user.

    Args:
        user_id: User ID

    Use Case: When user profile/permissions change
    """
    patterns = [
        f"user_*:{user_id}",
        f"dashboard:*:{user_id}",
    ]
    for pattern in patterns:
        invalidate_pattern(pattern)


def invalidate_case_cache(case_id: int, tenant_id: int):
    """
    Invalidate case-related caches.

    Args:
        case_id: Case ID
        tenant_id: Tenant ID

    Use Case: When case is created/updated/deleted
    """
    # Specific keys
    cache.delete_many([
        f"entity_graph:{case_id}",
        f"entity_stats:{case_id}",
    ])

    # Tenant aggregates
    invalidate_pattern(f"dashboard:{tenant_id}:*")
    invalidate_pattern(f"case_counts:{tenant_id}:*")


def warm_cache(func: Callable, *args, **kwargs):
    """
    Pre-warm cache by executing function and storing result.

    Args:
        func: Cached function to warm
        *args, **kwargs: Arguments to pass to function

    Use Case: Pre-load frequently accessed data during off-peak hours

    Example:
        # In management command or celery task
        warm_cache(get_dashboard_stats, tenant_id=123, user_id=456)
    """
    try:
        result = func(*args, **kwargs)
        logger.info(f"Cache warmed: {func.__name__} with args={args}, kwargs={kwargs}")
        return result
    except Exception as e:
        logger.error(f"Cache warming failed for {func.__name__}: {e}")
        return None


class CacheStats:
    """Track cache hit/miss rates"""

    @staticmethod
    def get_stats() -> dict:
        """
        Get cache statistics.

        Returns:
            Dictionary with hit rate, memory usage, etc.

        Note: Requires django-redis
        """
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            info = redis_conn.info()

            return {
                'hits': info.get('keyspace_hits', 0),
                'misses': info.get('keyspace_misses', 0),
                'hit_rate': info.get('keyspace_hits', 0) / max(
                    info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1
                ),
                'memory_used': info.get('used_memory_human'),
                'keys_count': redis_conn.dbsize(),
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {}


# Convenience functions for common cache operations

def cache_get_or_set(key: str, func: Callable, timeout: int = CacheTiers.MEDIUM) -> Any:
    """
    Get from cache or set if missing (one-liner).

    Args:
        key: Cache key
        func: Function to execute if cache miss
        timeout: TTL

    Returns:
        Cached or fresh value

    Example:
        user = cache_get_or_set(
            f"user:{user_id}",
            lambda: User.objects.get(id=user_id),
            CacheTiers.LONG
        )
    """
    result = cache.get(key)
    if result is None:
        result = func()
        cache.set(key, result, timeout)
    return result


def cache_increment(key: str, delta: int = 1, default: int = 0, timeout: int = 3600) -> int:
    """
    Atomic increment with default value if key doesn't exist.

    Args:
        key: Cache key
        delta: Increment amount
        default: Default value if key doesn't exist
        timeout: TTL for new keys

    Returns:
        New value after increment

    Example:
        # Track API request count
        count = cache_increment(f"api_requests:{user_id}", delta=1)
    """
    try:
        return cache.incr(key, delta)
    except ValueError:
        # Key doesn't exist
        cache.set(key, default + delta, timeout)
        return default + delta
