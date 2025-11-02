"""
Feature 7 (Phase 4): Query Performance Monitoring

Utilities for monitoring query performance in production.

Tools:
- Django Silk: Web-based query profiling
- pg_stat_statements: PostgreSQL query statistics
- Custom query performance tracking

Configuration:
- Add 'silk' to INSTALLED_APPS
- Add 'silk.middleware.SilkyMiddleware' to MIDDLEWARE (after Django middleware)
- Add path('silk/', include('silk.urls', namespace='silk')) to URLs

Security:
- Only enable in production with staff-only access
- Use SILKY_AUTHENTICATION and SILKY_AUTHORISATION settings
"""

import time
import logging
from functools import wraps
from typing import Callable
from django.db import connection
from django.conf import settings

logger = logging.getLogger(__name__)


class QueryPerformanceMonitor:
    """
    Monitor query performance for specific code blocks.

    Usage:
        with QueryPerformanceMonitor("dashboard_load"):
            stats = get_dashboard_stats()
    """

    def __init__(self, operation_name: str, threshold_ms: int = 100):
        """
        Args:
            operation_name: Name of operation being monitored
            threshold_ms: Log warning if queries exceed this time
        """
        self.operation_name = operation_name
        self.threshold_ms = threshold_ms
        self.start_queries = 0
        self.start_time = 0

    def __enter__(self):
        """Start monitoring."""
        self.start_queries = len(connection.queries)
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop monitoring and log results."""
        end_time = time.time()
        end_queries = len(connection.queries)

        query_count = end_queries - self.start_queries
        duration_ms = (end_time - self.start_time) * 1000

        # Log query performance
        log_level = logging.WARNING if duration_ms > self.threshold_ms else logging.DEBUG

        logger.log(
            log_level,
            f"QueryPerformance: {self.operation_name} | "
            f"Queries: {query_count} | "
            f"Time: {duration_ms:.2f}ms"
        )

        # Detailed query logging in DEBUG mode
        if settings.DEBUG and query_count > 0:
            for query in connection.queries[self.start_queries:end_queries]:
                logger.debug(
                    f"  SQL: {query['sql'][:100]}... | "
                    f"Time: {float(query['time']) * 1000:.2f}ms"
                )


def track_query_performance(operation_name: str, threshold_ms: int = 100):
    """
    Decorator to track query performance of a function.

    Args:
        operation_name: Name of operation
        threshold_ms: Warning threshold

    Example:
        @track_query_performance("get_dashboard_stats", threshold_ms=200)
        def get_dashboard_stats(tenant_id):
            # ... complex queries
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            with QueryPerformanceMonitor(operation_name, threshold_ms):
                return func(*args, **kwargs)
        return wrapper
    return decorator


def get_slow_queries(min_duration_ms: float = 100):
    """
    Get slow queries from current request.

    Args:
        min_duration_ms: Minimum duration to consider slow

    Returns:
        List of slow query dictionaries

    Note: Only works when DEBUG=True
    """
    if not settings.DEBUG:
        logger.warning("get_slow_queries only works in DEBUG mode")
        return []

    slow_queries = []
    for query in connection.queries:
        duration_ms = float(query['time']) * 1000
        if duration_ms >= min_duration_ms:
            slow_queries.append({
                'sql': query['sql'],
                'duration_ms': duration_ms,
                'stacktrace': query.get('stacktrace', [])
            })

    return sorted(slow_queries, key=lambda q: q['duration_ms'], reverse=True)


def detect_n_plus_one():
    """
    Detect potential N+1 query patterns.

    Returns:
        List of suspected N+1 patterns

    Note: Only works when DEBUG=True
    """
    if not settings.DEBUG:
        return []

    queries = connection.queries
    suspected_patterns = []

    # Look for repeated similar queries
    query_patterns = {}
    for i, query in enumerate(queries):
        # Normalize query by removing specific IDs
        import re
        normalized = re.sub(r'\d+', 'N', query['sql'])

        if normalized not in query_patterns:
            query_patterns[normalized] = []
        query_patterns[normalized].append(i)

    # Flag patterns that repeat more than 5 times
    for pattern, occurrences in query_patterns.items():
        if len(occurrences) > 5:
            suspected_patterns.append({
                'pattern': pattern[:200],
                'count': len(occurrences),
                'query_indices': occurrences,
                'total_time_ms': sum(
                    float(queries[i]['time']) * 1000
                    for i in occurrences
                )
            })

    return sorted(suspected_patterns, key=lambda p: p['count'], reverse=True)


class PerformanceReport:
    """
    Generate performance report for current request.

    Usage:
        # In view or test
        report = PerformanceReport()
        # ... execute queries
        print(report.generate())
    """

    def __init__(self):
        self.start_queries = len(connection.queries)
        self.start_time = time.time()

    def generate(self) -> dict:
        """Generate comprehensive performance report."""
        end_time = time.time()
        end_queries = len(connection.queries)

        queries = connection.queries[self.start_queries:end_queries]
        query_count = len(queries)
        total_time = sum(float(q['time']) for q in queries) * 1000

        return {
            'query_count': query_count,
            'total_time_ms': total_time,
            'duration_ms': (end_time - self.start_time) * 1000,
            'avg_query_time_ms': total_time / query_count if query_count > 0 else 0,
            'slow_queries': get_slow_queries(100),
            'suspected_n_plus_one': detect_n_plus_one(),
        }


# PostgreSQL-specific monitoring functions

def get_pg_stat_statements(limit: int = 20):
    """
    Query pg_stat_statements for slow query analysis.

    Requires: CREATE EXTENSION pg_stat_statements;

    Args:
        limit: Number of queries to return

    Returns:
        List of slow queries with statistics
    """
    from django.db import connection

    sql = """
    SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        stddev_exec_time,
        rows
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
    ORDER BY mean_exec_time DESC
    LIMIT %s;
    """

    with connection.cursor() as cursor:
        try:
            cursor.execute(sql, [limit])  # Parameterized query (SQL injection safe)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to query pg_stat_statements: {e}")
            return []


def reset_pg_stat_statements():
    """
    Reset pg_stat_statements statistics.

    Use after analyzing queries to start fresh.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        try:
            cursor.execute("SELECT pg_stat_statements_reset();")
            logger.info("pg_stat_statements reset successfully")
        except Exception as e:
            logger.error(f"Failed to reset pg_stat_statements: {e}")


# Silk configuration helpers

def configure_silk_for_production():
    """
    Return recommended Silk settings for production.

    Add these to settings.py:
        SILKY_PYTHON_PROFILER = True
        SILKY_PYTHON_PROFILER_BINARY = True
        SILKY_AUTHENTICATION = True
        SILKY_AUTHORISATION = True
        SILKY_PERMISSIONS = lambda user: user.is_staff
        SILKY_MAX_REQUEST_BODY_SIZE = 1024  # 1KB
        SILKY_MAX_RESPONSE_BODY_SIZE = 1024  # 1KB
        SILKY_INTERCEPT_PERCENT = 100  # Monitor 100% of requests
        SILKY_MAX_RECORDED_REQUESTS = 10000
        SILKY_MAX_RECORDED_REQUESTS_CHECK_PERCENT = 10
    """
    return {
        'SILKY_PYTHON_PROFILER': True,
        'SILKY_PYTHON_PROFILER_BINARY': True,
        'SILKY_AUTHENTICATION': True,
        'SILKY_AUTHORISATION': True,
        'SILKY_PERMISSIONS': lambda user: user.is_staff,
        'SILKY_MAX_REQUEST_BODY_SIZE': 1024,
        'SILKY_MAX_RESPONSE_BODY_SIZE': 1024,
        'SILKY_INTERCEPT_PERCENT': 100,
        'SILKY_MAX_RECORDED_REQUESTS': 10000,
        'SILKY_MAX_RECORDED_REQUESTS_CHECK_PERCENT': 10,
    }
