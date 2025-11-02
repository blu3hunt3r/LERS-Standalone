"""
Cookie-based JWT Authentication Middleware

Extracts JWT access token from httpOnly cookie and sets Authorization header.
This allows existing JWT authentication to work seamlessly with cookies.

Security Benefits:
- Tokens stored in httpOnly cookies (JavaScript cannot access)
- Automatic inclusion in all requests (no manual header setting)
- Protection against XSS token theft
- SameSite cookie attribute provides CSRF protection

Flow:
1. Request arrives with access_token cookie
2. Middleware extracts token from cookie
3. Sets Authorization: Bearer <token> header
4. Existing JWTAuthentication validates token
5. Request proceeds with authenticated user
"""

import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class CookieJWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware to extract JWT access token from httpOnly cookie.

    If Authorization header is not present, checks for access_token cookie
    and sets the Authorization header for JWT authentication.

    This allows backward compatibility:
    - Supports both header-based auth (for API clients)
    - Supports cookie-based auth (for browsers)
    - Gradual migration from localStorage to cookies
    """

    def process_request(self, request):
        """
        Process incoming request to extract token from cookie.

        Args:
            request: Django HttpRequest object

        Returns:
            None (modifies request.META in place)
        """
        # Check if Authorization header already present
        # (API clients may still use header-based auth)
        if request.META.get('HTTP_AUTHORIZATION'):
            # Authorization header already set, skip cookie check
            logger.debug(
                f"Authorization header present for {request.path}, "
                f"skipping cookie check"
            )
            return

        # Check for access_token in cookies
        access_token = request.COOKIES.get('access_token')

        if access_token:
            # Set Authorization header for JWT authentication
            request.META['HTTP_AUTHORIZATION'] = f'Bearer {access_token}'

            logger.debug(
                f"Access token extracted from cookie for {request.path} "
                f"(token length: {len(access_token)})"
            )
        else:
            # No token in cookie or header
            # This is normal for public endpoints (login, register, etc.)
            logger.debug(
                f"No access token found (cookie or header) for {request.path}"
            )

        return None

    def process_response(self, request, response):
        """
        Process outgoing response (currently no modifications).

        Can be extended to:
        - Add security headers
        - Log authentication events
        - Monitor cookie usage

        Args:
            request: Django HttpRequest object
            response: Django HttpResponse object

        Returns:
            HttpResponse (unmodified for now)
        """
        return response
