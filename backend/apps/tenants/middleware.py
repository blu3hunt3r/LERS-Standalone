"""
Middleware for tenant isolation and context.
"""
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to set tenant context for each request.
    """
    
    def process_request(self, request):
        """
        Extract tenant from authenticated user and set in request.
        """
        if hasattr(request, 'user') and request.user.is_authenticated:
            tenant = getattr(request.user, 'tenant', None)
            request.tenant = tenant
            
            if tenant:
                logger.debug(f"Request by {request.user.email} for tenant: {tenant.code}")
        else:
            request.tenant = None
        
        return None
    
    def process_response(self, request, response):
        """
        Add tenant info to response headers for debugging.
        """
        if hasattr(request, 'tenant') and request.tenant:
            response['X-Tenant-ID'] = str(request.tenant.id)
            response['X-Tenant-Code'] = request.tenant.code
        
        return response

