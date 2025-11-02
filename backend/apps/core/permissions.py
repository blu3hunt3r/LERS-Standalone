"""
Custom permission classes for role-based and attribute-based access control.
"""
from rest_framework import permissions


class IsIO(permissions.BasePermission):
    """
    Permission class for Investigating Officers.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'IO'
        )


class IsApprover(permissions.BasePermission):
    """
    Permission class for Approvers (SP/DSP).
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['APPROVER', 'SP', 'DSP']
        )


class IsCompanyAgent(permissions.BasePermission):
    """
    Permission class for Company Agents (LERS).
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'COMPANY_AGENT'
        )


class IsStationAdmin(permissions.BasePermission):
    """
    Permission class for Station Admins.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'STATION_ADMIN'
        )


class IsSameTenant(permissions.BasePermission):
    """
    Object-level permission to only allow access within same tenant.
    """
    def has_object_permission(self, request, view, obj):
        # Check if object has tenant field
        if not hasattr(obj, 'tenant'):
            return True
        
        # Check if user has tenant
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return False
        
        return obj.tenant == request.user.tenant


class IsCaseOwnerOrAssigned(permissions.BasePermission):
    """
    Permission to check if user is case owner or assigned to the case.
    """
    def has_object_permission(self, request, view, obj):
        # Check if user is the case creator
        if obj.created_by == request.user:
            return True
        
        # Check if user is assigned to the case
        if hasattr(obj, 'assigned_to') and obj.assigned_to == request.user:
            return True
        
        # Check if user is in the same tenant (station)
        if hasattr(obj, 'tenant') and hasattr(request.user, 'tenant'):
            if obj.tenant == request.user.tenant:
                # Allow read-only for same station
                return request.method in permissions.SAFE_METHODS
        
        return False


class CanApproveRequest(permissions.BasePermission):
    """
    Permission for approving LERS requests.
    """
    def has_object_permission(self, request, view, obj):
        # Must be an approver
        if request.user.role not in ['APPROVER', 'SP', 'DSP']:
            return False
        
        # Must be in same tenant
        if hasattr(obj, 'case') and hasattr(obj.case, 'tenant'):
            return obj.case.tenant == request.user.tenant
        
        return False

