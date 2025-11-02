"""
Custom exception handlers for the CMS + LERS project.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that logs errors and returns consistent format.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the exception
    logger.error(
        f"Exception in {context.get('view', 'Unknown')}",
        exc_info=exc,
        extra={'context': context}
    )
    
    if response is not None:
        # Standardize error response format
        custom_response_data = {
            'error': {
                'code': response.status_code,
                'message': response.data if isinstance(response.data, str) else str(response.data),
                'details': response.data if isinstance(response.data, dict) else None
            }
        }
        response.data = custom_response_data
    else:
        # Handle unexpected exceptions
        custom_response_data = {
            'error': {
                'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred.',
                'details': str(exc) if str(exc) else None
            }
        }
        response = Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


class ServiceUnavailableError(Exception):
    """Raised when external service is unavailable."""
    pass


class ParserError(Exception):
    """Raised when parser fails."""
    pass


class EvidenceIntegrityError(Exception):
    """Raised when evidence integrity check fails."""
    pass


class TenantIsolationError(Exception):
    """Raised when tenant isolation is violated."""
    pass

