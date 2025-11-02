"""
Middleware for automatic audit logging.
"""
import logging
from .models import AuditLog

logger = logging.getLogger(__name__)


class AuditMiddleware:
    """
    Middleware to log API requests automatically.
    """
    
    # Sensitive paths to log
    AUDIT_PATHS = [
        '/api/v1/cases/',
        '/api/v1/evidence/',
        '/api/v1/lers/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log certain actions
        if request.user.is_authenticated and self._should_audit(request):
            try:
                self._create_audit_log(request, response)
            except Exception as e:
                logger.error(f"Failed to create audit log: {str(e)}")
        
        return response
    
    def _should_audit(self, request):
        """Check if request should be audited."""
        for path in self.AUDIT_PATHS:
            if request.path.startswith(path):
                return True
        return False
    
    def _create_audit_log(self, request, response):
        """Create audit log entry."""
        # Determine action from HTTP method
        action_map = {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE',
            'GET': 'VIEW'
        }
        
        action = action_map.get(request.method, 'VIEW')
        
        # Extract resource details from path
        path_parts = request.path.split('/')
        resource_type = path_parts[3] if len(path_parts) > 3 else 'unknown'
        resource_id = path_parts[4] if len(path_parts) > 4 else ''
        
        # Create log
        AuditLog.objects.create(
            user=request.user,
            tenant=getattr(request.user, 'tenant', None),
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"{action} {resource_type}",
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
    
    def _get_client_ip(self, request):
        """Extract client IP."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

