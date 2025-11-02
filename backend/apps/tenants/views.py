"""
Views for tenant management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Tenant, TenantSettings, TenantRelationship
from .serializers import (
    TenantSerializer, TenantSettingsSerializer, TenantRelationshipSerializer
)
from apps.core.permissions import IsStationAdmin


class TenantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenants (police stations and companies).
    """
    queryset = Tenant.objects.filter(is_deleted=False)
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['tenant_type', 'is_active', 'state', 'district']
    search_fields = ['name', 'code']
    
    def get_queryset(self):
        """Filter tenants based on user role."""
        user = self.request.user
        
        if user.role in ['ADMIN']:
            # Admin can see all tenants
            return Tenant.objects.filter(is_deleted=False)
        elif user.tenant:
            # Users can see their own tenant and related tenants
            return Tenant.objects.filter(
                models.Q(id=user.tenant.id) |
                models.Q(parent=user.tenant) |
                models.Q(id__in=user.tenant.relationships_from.values_list('to_tenant', flat=True)),
                is_deleted=False
            ).distinct()
        
        return Tenant.objects.none()
    
    @action(detail=True, methods=['get'])
    def hierarchy(self, request, pk=None):
        """Get tenant hierarchy tree."""
        tenant = self.get_object()
        
        def build_tree(t):
            return {
                'id': str(t.id),
                'name': t.name,
                'code': t.code,
                'tenant_type': t.tenant_type,
                'children': [build_tree(child) for child in t.children.filter(is_active=True)]
            }
        
        tree = build_tree(tenant)
        return Response(tree)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get tenant statistics."""
        tenant = self.get_object()
        
        stats = {
            'users_count': tenant.users.filter(is_active=True).count(),
            'cases_count': tenant.cases.filter(status__in=['OPEN', 'INVESTIGATION']).count(),
            'requests_count': 0,  # Will be calculated from LERS
        }
        
        return Response(stats)


class TenantSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant settings.
    """
    queryset = TenantSettings.objects.filter(is_deleted=False)
    serializer_class = TenantSettingsSerializer
    permission_classes = [IsAuthenticated, IsStationAdmin]
    
    def get_queryset(self):
        """Filter settings by tenant."""
        user = self.request.user
        
        if user.role in ['ADMIN']:
            return TenantSettings.objects.filter(is_deleted=False)
        elif user.tenant:
            return TenantSettings.objects.filter(tenant=user.tenant, is_deleted=False)
        
        return TenantSettings.objects.none()


class TenantRelationshipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant relationships.
    """
    queryset = TenantRelationship.objects.filter(is_deleted=False)
    serializer_class = TenantRelationshipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['from_tenant', 'to_tenant', 'relation_type']
    
    def get_queryset(self):
        """Filter relationships by tenant."""
        user = self.request.user
        
        if user.role in ['ADMIN']:
            return TenantRelationship.objects.filter(is_deleted=False)
        elif user.tenant:
            return TenantRelationship.objects.filter(
                models.Q(from_tenant=user.tenant) | models.Q(to_tenant=user.tenant),
                is_deleted=False
            )
        
        return TenantRelationship.objects.none()
    
    @action(detail=True, methods=['post'], permission_classes=[IsStationAdmin])
    def approve(self, request, pk=None):
        """Approve a tenant relationship."""
        relationship = self.get_object()
        relationship.approved_by = request.user
        relationship.approved_at = timezone.now()
        relationship.save()
        
        return Response({
            'message': 'Relationship approved successfully.'
        }, status=status.HTTP_200_OK)

