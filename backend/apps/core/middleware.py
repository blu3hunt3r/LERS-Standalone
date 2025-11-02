"""
Core middleware components including rate limiting.

Feature 5: Backend Rate Limiting
- Protects against brute force attacks (login, API abuse)
- Per-IP and per-user rate limits
- Configurable limits per endpoint
- Redis-based distributed rate limiting
- Automatic 429 responses with Retry-After header
"""

import logging
import time
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware using Redis cache.

    Rate Limits (per minute):
    - Authentication endpoints: 5 requests/min per IP
    - API endpoints (authenticated): 60 requests/min per user
    - API endpoints (unauthenticated): 20 requests/min per IP
    - Media files: 100 requests/min per user

    Configuration:
    Set RATE_LIMIT_ENABLED=False in settings to disable.
    """

    # Rate limit configurations
    RATE_LIMITS = {
        # Authentication endpoints (strict)
        '/api/v1/auth/login/': {'requests': 5, 'window': 60, 'key': 'ip'},
        '/api/v1/auth/register/': {'requests': 3, 'window': 60, 'key': 'ip'},
        '/api/v1/auth/token/refresh/': {'requests': 10, 'window': 60, 'key': 'ip'},

        # Evidence operations (moderate)
        '/api/v1/evidence/files/upload/': {'requests': 30, 'window': 60, 'key': 'user'},

        # Media access (high volume expected)
        '/media/': {'requests': 100, 'window': 60, 'key': 'user'},

        # General API (default limits apply)
        '/api/': {'requests': 60, 'window': 60, 'key': 'user'},
    }

    # Paths that bypass rate limiting
    WHITELIST = [
        '/health/',
        '/api/docs/',
        '/api/schema/',
        '/static/',
    ]

    def process_request(self, request):
        """
        Check rate limit before processing request.

        Returns:
            HttpResponse (429): If rate limit exceeded
            None: If rate limit not exceeded (request continues)
        """
        # Skip if rate limiting disabled
        if not getattr(settings, 'RATE_LIMIT_ENABLED', True):
            return None

        # Skip whitelisted paths
        if any(request.path.startswith(path) for path in self.WHITELIST):
            return None

        # Determine rate limit for this path
        limit_config = self._get_limit_config(request.path)

        if not limit_config:
            return None  # No limit configured for this path

        # Generate cache key
        cache_key = self._get_cache_key(request, limit_config['key'])

        # Check rate limit
        current_requests = cache.get(cache_key, 0)

        if current_requests >= limit_config['requests']:
            # Rate limit exceeded
            retry_after = self._get_retry_after(cache_key, limit_config['window'])

            logger.warning(
                f"Rate limit exceeded: {request.path} "
                f"(key={cache_key}, requests={current_requests}/{limit_config['requests']})"
            )

            return JsonResponse({
                'error': 'Too Many Requests',
                'detail': f"Rate limit exceeded. Try again in {retry_after} seconds.",
                'retry_after': retry_after,
                'limit': limit_config['requests'],
                'window': limit_config['window']
            }, status=429, headers={'Retry-After': str(retry_after)})

        # Increment request count
        if current_requests == 0:
            # First request in window - set with expiry
            cache.set(cache_key, 1, limit_config['window'])
        else:
            # Increment existing count
            cache.incr(cache_key)

        # Add rate limit headers to response (handled in process_response)
        request._rate_limit_info = {
            'limit': limit_config['requests'],
            'remaining': limit_config['requests'] - current_requests - 1,
            'reset': int(time.time()) + limit_config['window']
        }

        return None

    def process_response(self, request, response):
        """
        Add rate limit headers to response.

        Headers:
            - X-RateLimit-Limit: Max requests allowed in window
            - X-RateLimit-Remaining: Remaining requests in current window
            - X-RateLimit-Reset: Unix timestamp when window resets
        """
        if hasattr(request, '_rate_limit_info'):
            info = request._rate_limit_info
            response['X-RateLimit-Limit'] = info['limit']
            response['X-RateLimit-Remaining'] = max(0, info['remaining'])
            response['X-RateLimit-Reset'] = info['reset']

        return response

    def _get_limit_config(self, path):
        """
        Get rate limit configuration for given path.

        Args:
            path (str): Request path

        Returns:
            dict: Rate limit config or None
        """
        # Check for exact match
        if path in self.RATE_LIMITS:
            return self.RATE_LIMITS[path]

        # Check for prefix match (longest match wins)
        matching_configs = [
            (prefix, config) for prefix, config in self.RATE_LIMITS.items()
            if path.startswith(prefix)
        ]

        if matching_configs:
            # Sort by prefix length (longest first)
            matching_configs.sort(key=lambda x: len(x[0]), reverse=True)
            return matching_configs[0][1]

        return None

    def _get_cache_key(self, request, key_type):
        """
        Generate cache key for rate limiting.

        Args:
            request: Django request object
            key_type (str): 'ip' or 'user'

        Returns:
            str: Cache key
        """
        if key_type == 'user' and hasattr(request, 'user') and request.user.is_authenticated:
            identifier = f"user:{request.user.id}"
        else:
            # Fall back to IP for unauthenticated or IP-based limits
            identifier = f"ip:{self._get_client_ip(request)}"

        # Include path in key for endpoint-specific limits
        path_key = request.path.replace('/', '_')

        return f"ratelimit:{identifier}:{path_key}"

    def _get_client_ip(self, request):
        """
        Extract client IP from request.

        Args:
            request: Django request object

        Returns:
            str: Client IP address
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip

    def _get_retry_after(self, cache_key, window):
        """
        Calculate seconds until rate limit window resets.

        Args:
            cache_key (str): Cache key
            window (int): Rate limit window in seconds

        Returns:
            int: Seconds until reset
        """
        ttl = cache.ttl(cache_key) if hasattr(cache, 'ttl') else window
        return max(1, ttl if ttl else window)
