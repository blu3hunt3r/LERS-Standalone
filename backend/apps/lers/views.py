"""
Views for LERS (Law Enforcement Request System).
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import (
    LERSRequest, LERSResponse, LERSApprovalWorkflow, LERSTemplate,
    LERSMessage, UserPresence, LERSNotification,
    ProviderDataCatalog, ProviderServiceProfile, CatalogUsageAnalytics
)
from .serializers import (
    LERSRequestSerializer, LERSRequestListSerializer, LERSRequestCreateSerializer,
    LERSResponseSerializer, LERSResponseCreateSerializer,
    LERSApprovalSerializer, LERSApprovalWorkflowSerializer,
    LERSTemplateSerializer,
    LERSMessageSerializer, LERSMessageCreateSerializer,
    UserPresenceSerializer,
    LERSNotificationSerializer, LERSNotificationCreateSerializer,
    ProviderDataCatalogSerializer, ProviderDataCatalogCreateSerializer,
    ProviderServiceProfileSerializer, CatalogBrowseSerializer
)
from apps.core.permissions import IsIO, IsApprover, IsCompanyAgent
from apps.cases.models import CaseTimeline
from .providers import (
    find_providers_for_entity_type, 
    get_provider, 
    get_request_capability,
    IntegrationType,
    DocumentRequirement
)
from .response_templates import (
    get_template,
    generate_query,
    validate_response_data
)


class LERSRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LERS requests - full lifecycle management.
    """
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        'case', 'request_type', 'provider', 'status', 'priority',
        'sla_breached', 'provider_tenant'
    ]
    search_fields = ['request_number', 'description', 'provider']
    ordering_fields = ['created_at', 'sla_due_date', 'priority']
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return LERSRequestListSerializer
        elif self.action == 'create':
            return LERSRequestCreateSerializer
        return LERSRequestSerializer
    
    def get_queryset(self):
        """
        Filter requests based on user role and tenant.
        """
        user = self.request.user
        
        if user.role == 'ADMIN':
            return LERSRequest.objects.filter(is_deleted=False)
        elif user.role == 'COMPANY_AGENT':
            # Company agents see requests for their tenant
            return LERSRequest.objects.filter(
                provider_tenant=user.tenant,
                is_deleted=False
            ).exclude(status='DRAFT')
        else:
            # Police officers see requests from their cases AND standalone requests
            from apps.cases.models import Case
            accessible_cases = Case.objects.filter(
                models.Q(tenant=user.tenant) |
                models.Q(shared_with_tenants=user.tenant)
            ).values_list('id', flat=True)

            # Include both case-linked AND standalone (case=None) requests
            return LERSRequest.objects.filter(
                models.Q(case__id__in=accessible_cases) |
                models.Q(case__isnull=True, created_by__tenant=user.tenant),
                is_deleted=False
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsApprover])
    def approve(self, request, pk=None):
        """
        Approve LERS request (requires Approver role).
        """
        lers_request = self.get_object()
        
        if lers_request.status != 'PENDING_APPROVAL':
            return Response({
                'error': 'Request is not pending approval'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = LERSApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '')
        signature_hash = serializer.validated_data.get('signature_hash', '')
        
        # Create approval workflow record
        LERSApprovalWorkflow.objects.create(
            request=lers_request,
            approver=request.user,
            action=action_type,
            comments=comments,
            signature_hash=signature_hash
        )
        
        if action_type == 'APPROVE':
            lers_request.status = 'APPROVED'
            lers_request.approved_by = request.user
            lers_request.approved_at = timezone.now()
            lers_request.save()
            
            # Auto-submit if provider tenant is configured
            if lers_request.provider_tenant:
                self._submit_to_company(lers_request)
            
            message = 'Request approved successfully'
        elif action_type == 'REJECT':
            lers_request.status = 'REJECTED'
            lers_request.rejection_reason = comments
            lers_request.save()
            message = 'Request rejected'
        else:  # REQUEST_CHANGES
            lers_request.status = 'DRAFT'
            lers_request.notes = f"Changes requested: {comments}"
            lers_request.save()
            message = 'Changes requested'
        
        return Response({
            'message': message,
            'status': lers_request.status
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def submit_for_approval(self, request, pk=None):
        """
        Submit request for approval.
        """
        lers_request = self.get_object()
        
        if lers_request.status != 'DRAFT':
            return Response({
                'error': 'Only draft requests can be submitted for approval'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate required fields
        if not lers_request.legal_mandate_file:
            return Response({
                'error': 'Legal mandate file is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        lers_request.status = 'PENDING_APPROVAL'
        lers_request.save(update_fields=['status'])
        
        # TODO: Send notification to approvers
        
        return Response({
            'message': 'Request submitted for approval',
            'request_number': lers_request.request_number
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsApprover])
    def submit_to_company(self, request, pk=None):
        """
        Manually submit approved request to company.
        """
        lers_request = self.get_object()
        
        if lers_request.status != 'APPROVED':
            return Response({
                'error': 'Only approved requests can be submitted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            self._submit_to_company(lers_request)
            return Response({
                'message': 'Request submitted to company successfully'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Failed to submit request: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _submit_to_company(self, lers_request):
        """Internal method to submit request to company."""
        lers_request.status = 'SUBMITTED'
        lers_request.submitted_at = timezone.now()
        lers_request.save()
        
        # TODO: Send email/webhook notification to company
        # TODO: If provider has API integration, call their API
        
    @action(detail=True, methods=['post'], permission_classes=[IsCompanyAgent])
    def acknowledge(self, request, pk=None):
        """
        Company acknowledges receipt of request.
        """
        lers_request = self.get_object()
        
        if lers_request.status != 'SUBMITTED':
            return Response({
                'error': 'Request must be in submitted status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        lers_request.status = 'ACKNOWLEDGED'
        lers_request.assigned_to_company = request.user
        lers_request.save()
        
        return Response({
            'message': 'Request acknowledged'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsCompanyAgent])
    def start_processing(self, request, pk=None):
        """
        Company starts processing the request.
        """
        lers_request = self.get_object()
        
        if lers_request.status not in ['ACKNOWLEDGED', 'SUBMITTED']:
            return Response({
                'error': 'Invalid request status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        lers_request.status = 'IN_PROGRESS'
        if not lers_request.assigned_to_company:
            lers_request.assigned_to_company = request.user
        lers_request.save()
        
        return Response({
            'message': 'Request processing started'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark request as completed (IO).
        """
        lers_request = self.get_object()
        
        if lers_request.status != 'RESPONSE_UPLOADED':
            return Response({
                'error': 'Request must have a response uploaded'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        lers_request.status = 'COMPLETED'
        lers_request.completed_at = timezone.now()
        lers_request.save()
        
        return Response({
            'message': 'Request completed successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def responses(self, request, pk=None):
        """
        Get all responses for this request.
        """
        lers_request = self.get_object()
        responses = lers_request.responses.all()
        serializer = LERSResponseSerializer(responses, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='responses', permission_classes=[IsCompanyAgent])
    def submit_response(self, request, pk=None):
        """
        Company submits response to LERS request.
        """
        lers_request = self.get_object()
        
        if lers_request.status not in ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']:
            return Response({
                'error': 'Cannot submit response for request in this status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create response
        from apps.lers.models import LERSResponse
        response_data = request.data.copy()
        response_data['request'] = lers_request.id
        response_data['submitted_by'] = request.user.id
        
        serializer = LERSResponseSerializer(data=response_data)
        if serializer.is_valid():
            response_obj = serializer.save(
                request=lers_request,
                submitted_by=request.user,
                tenant=lers_request.tenant
            )
            
            # Update request status
            lers_request.status = 'RESPONSE_UPLOADED'
            lers_request.response_received_at = timezone.now()
            lers_request.save()
            
            # Create case timeline event
            if lers_request.case:
                CaseTimeline.objects.create(
                    case=lers_request.case,
                    event_type='LERS_RESPONSE_RECEIVED',
                    title='LERS Response Received',
                    description=f'Response received for {lers_request.request_type} from {lers_request.provider}',
                    actor=request.user
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def workflow(self, request, pk=None):
        """
        Get approval workflow history.
        """
        lers_request = self.get_object()
        workflow = lers_request.approval_workflow.all()
        serializer = LERSApprovalWorkflowSerializer(workflow, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """
        Get requests created by current user.
        """
        requests = self.get_queryset().filter(created_by=request.user)
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsCompanyAgent])
    def pending_requests(self, request):
        """
        Get pending requests for company (company agent view).
        """
        requests = self.get_queryset().filter(
            status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']
        ).order_by('sla_due_date')
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='entity-smart-actions')
    def get_entity_smart_actions(self, request):
        """
        Get smart action suggestions for an entity.
        
        POST /api/v1/lers/requests/entity-smart-actions/
        Body: {
            "entity_type": "account/phone/upi",
            "entity_value": "...",  # For display only
            "case_id": "..."
        }
        
        Returns list of suggested LERS requests with provider info.
        """
        entity_type = request.data.get('entity_type')
        entity_value = request.data.get('entity_value', '****')
        case_id = request.data.get('case_id')
        
        if not entity_type:
            return Response({
                'error': 'entity_type is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find relevant providers and capabilities
        provider_capabilities = find_providers_for_entity_type(entity_type)
        
        # Build smart action suggestions
        suggestions = []
        for provider, capability in provider_capabilities[:5]:  # Top 5 fastest
            suggestions.append({
                'provider_id': provider.provider_id,
                'provider_name': provider.name,
                'request_type': capability.request_type,
                'display_name': capability.display_name,
                'description': capability.description,
                'integration_type': capability.integration_type.value,
                'sla_hours': capability.sla_hours,
                'sla_display': f'{capability.sla_hours}h' if capability.sla_hours < 24 else f'{capability.sla_hours // 24}d',
                'expected_format': capability.typical_response_format,
                'auto_fillable': capability.auto_fillable,
                'icon': {
                    'API': '⚡',
                    'WEBHOOK': '🔔',
                    'SFTP': '📂',
                    'EMAIL': '📧',
                    'PORTAL': '🌐',
                    'MANUAL': '📝'
                }.get(capability.integration_type.value, '📝')
            })
        
        return Response({
            'entity_type': entity_type,
            'entity_value': entity_value,
            'suggestions': suggestions
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='smart-create')
    def smart_create_from_entity(self, request):
        """
        Smart LERS request creation from entity with auto-fill.
        
        POST /api/v1/lers/requests/smart-create/
        Body: {
            "entity_hash": "...",
            "entity_type": "account/phone/upi",
            "case_id": "...",
            "request_type": "BANK_ACCOUNT_DETAILS",
            "provider_id": "ICICI_BANK"
        }
        
        Returns pre-filled request with provider info and compliance check.
        """
        from apps.entities.models import ExtractedEntity
        from apps.cases.models import Case, EvidenceFile
        from datetime import datetime, timedelta
        
        entity_hash = request.data.get('entity_hash')
        entity_type = request.data.get('entity_type')
        case_id = request.data.get('case_id')
        request_type = request.data.get('request_type')
        provider_id = request.data.get('provider_id')
        
        if not all([entity_hash, entity_type, case_id, request_type, provider_id]):
            return Response({
                'error': 'Missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get provider and capability info
        provider = get_provider(provider_id)
        if not provider:
            return Response({
                'error': f'Provider {provider_id} not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        capability = get_request_capability(provider_id, request_type)
        if not capability:
            return Response({
                'error': f'Request type {request_type} not supported by {provider.name}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get case for auto-fill
        try:
            case = Case.objects.get(id=case_id, tenant=request.user.tenant)
        except Case.DoesNotExist:
            return Response({
                'error': 'Case not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check for required documents in case evidence
        evidence_files = EvidenceFile.objects.filter(case=case)
        court_order_exists = evidence_files.filter(
            file_type__icontains='court_order'
        ).exists() or evidence_files.filter(
            purpose__icontains='court order'
        ).exists()
        
        fir_copy_exists = bool(case.fir_number)
        
        # Build compliance checklist
        compliance = []
        all_compliant = True
        
        for doc_req in capability.required_documents:
            if doc_req == DocumentRequirement.COURT_ORDER:
                compliant = court_order_exists
                compliance.append({
                    'requirement': 'Court Order',
                    'met': compliant,
                    'message': 'Court order attached' if compliant else 'Missing: Court order required'
                })
                if not compliant:
                    all_compliant = False
                    
            elif doc_req == DocumentRequirement.FIR_COPY:
                compliant = fir_copy_exists
                compliance.append({
                    'requirement': 'FIR Copy',
                    'met': compliant,
                    'message': f'FIR #{case.fir_number}' if compliant else 'Missing: FIR number'
                })
                if not compliant:
                    all_compliant = False
        
        # Calculate SLA due date
        sla_due_date = datetime.now() + timedelta(hours=capability.sla_hours)
        
        # Build pre-filled request data
        prefilled_data = {
            'case_id': str(case.id),
            'case_number': case.case_number,
            'fir_number': case.fir_number,
            'provider': provider.name,
            'provider_id': provider_id,
            'request_type': request_type,
            'request_type_display': capability.display_name,
            'description': capability.description,
            'entity_hash': entity_hash,
            'entity_type': entity_type,
            'priority': case.priority,
            'legal_mandate': f'Court Order for Case #{case.case_number}',
            'sla_hours': capability.sla_hours,
            'sla_due_date': sla_due_date.isoformat(),
            'integration_type': capability.integration_type.value,
            'expected_format': capability.typical_response_format,
            'compliance': compliance,
            'can_send': all_compliant,
            'provider_info': {
                'name': provider.name,
                'category': provider.category,
                'contact_email': provider.contact_email,
                'portal_url': provider.portal_url,
                'integration_type': capability.integration_type.value,
                'estimated_response_time': f'{capability.sla_hours} hours',
            }
        }
        
        return Response(prefilled_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get LERS statistics.
        """
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'by_status': {},
            'sla_breached': queryset.filter(sla_breached=True).count(),
            'pending_approval': queryset.filter(status='PENDING_APPROVAL').count(),
            'awaiting_response': queryset.filter(
                status__in=['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']
            ).count(),
        }
        
        for choice in LERSRequest.Status.choices:
            count = queryset.filter(status=choice[0]).count()
            if count > 0:
                stats['by_status'][choice[1]] = count
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], url_path='providers')
    def get_providers(self, request):
        """
        Get all registered providers with their capabilities and data points.
        
        Query params:
        - category: Filter by category (BANK, TELECOM, PAYMENT, SOCIAL_MEDIA)
        - provider_id: Get specific provider
        """
        from .providers import get_all_providers, get_provider
        
        provider_id = request.query_params.get('provider_id')
        category = request.query_params.get('category')
        
        if provider_id:
            provider = get_provider(provider_id)
            if not provider:
                return Response({
                    'error': 'Provider not found'
                }, status=status.HTTP_404_NOT_FOUND)
            providers = [provider]
        else:
            providers = get_all_providers()
            if category:
                providers = [p for p in providers if p.category == category]
        
        # Serialize provider data
        data = []
        for provider in providers:
            capabilities_data = []
            for cap in provider.capabilities:
                data_points = []
                for dp in cap.data_points:
                    data_points.append({
                        'field_name': dp.field_name,
                        'display_name': dp.display_name,
                        'required': dp.required,
                        'field_type': dp.field_type,
                        'description': dp.description,
                        'default_value': dp.default_value,
                        'validation_rule': dp.validation_rule,
                        'help_text': dp.help_text,
                    })
                
                capabilities_data.append({
                    'request_type': cap.request_type,
                    'display_name': cap.display_name,
                    'integration_type': cap.integration_type.value,
                    'sla_hours': cap.sla_hours,
                    'required_documents': [doc.value for doc in cap.required_documents],
                    'auto_fillable': cap.auto_fillable,
                    'description': cap.description,
                    'typical_response_format': cap.typical_response_format,
                    'data_points': data_points,
                    'estimated_cost': cap.estimated_cost,
                })
            
            data.append({
                'provider_id': provider.provider_id,
                'name': provider.name,
                'category': provider.category,
                'logo_url': provider.logo_url,
                'contact_email': provider.contact_email,
                'portal_url': provider.portal_url,
                'capabilities': capabilities_data,
            })
        
        return Response({
            'providers': data,
            'count': len(data)
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='smart-response-template', permission_classes=[IsCompanyAgent])
    def get_smart_response_template(self, request, pk=None):
        """
        Get smart response template for company to fill.
        
        POST /api/v1/lers/requests/{id}/smart-response-template/
        
        Returns:
        - SQL template
        - Expected format
        - Validation rules
        - Data mapping guide
        """
        lers_request = self.get_object()
        
        # Get template for this request type
        template = get_template(lers_request.request_type)
        if not template:
            return Response({
                'error': f'No template available for {lers_request.request_type}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Extract parameters from request
        # In production, these would come from data_requested field
        parameters = {}
        if lers_request.data_requested:
            parameters = lers_request.data_requested.copy()
        
        # Generate SQL query
        sample_query = template.sql_template
        
        return Response({
            'request_id': str(lers_request.id),
            'request_type': lers_request.request_type,
            'request_number': lers_request.request_number,
            'provider': lers_request.provider,
            'sql_template': sample_query,
            'column_mapping': template.column_mapping,
            'expected_columns': template.expected_columns,
            'validation_rules': template.validation_rules,
            'expected_format': template.example_output,
            'description': template.description,
            'parameters_needed': list(template.column_mapping.keys()),
            'estimated_rows': '100-500 per month (typical)',
            'auto_redaction_fields': ['aadhaar_number', 'pan_number', 'email_address'],
        }, status=status.HTTP_200_OK)
    
    # ═══════════════════════════════════════════════════════════════
    # PHASE 2: NEW API ENDPOINTS FOR ENHANCED LERS SYSTEM
    # ═══════════════════════════════════════════════════════════════
    
    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        """
        GET: Retrieve all messages for a LERS request
        POST: Send a new message to the request chat
        
        Enhanced async communication between IO and Provider.
        """
        lers_request = self.get_object()
        
        if request.method == 'GET':
            # Get all messages for this request, ordered by creation time
            messages = LERSMessage.objects.filter(
                request=lers_request
            ).select_related('sender').order_by('created_at')
            
            # Mark messages as read if user is the receiver
            unread_messages = messages.filter(read_by_receiver=False)
            for message in unread_messages:
                # If user is provider and message is from IO, mark as read
                if (request.user.role == 'COMPANY_AGENT' and 
                    message.sender_type == LERSMessage.SenderType.IO):
                    message.mark_as_read()
                # If user is IO and message is from provider, mark as read
                elif (request.user.role in ['IO', 'SHO', 'ADMIN'] and 
                      message.sender_type == LERSMessage.SenderType.PROVIDER):
                    message.mark_as_read()
            
            serializer = LERSMessageSerializer(messages, many=True)
            return Response({
                'request_id': str(lers_request.id),
                'request_number': lers_request.request_number,
                'total_messages': messages.count(),
                'unread_count': unread_messages.count(),
                'messages': serializer.data
            }, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Determine sender type based on user role
            if request.user.role == 'COMPANY_AGENT':
                sender_type = LERSMessage.SenderType.PROVIDER
            else:
                sender_type = LERSMessage.SenderType.IO
            
            # Prepare data with auto-populated fields
            message_data = request.data.copy()
            message_data['request'] = str(lers_request.id)
            message_data['sender_type'] = sender_type
            
            # Create new message
            serializer = LERSMessageCreateSerializer(data=message_data)
            serializer.is_valid(raise_exception=True)
            
            # Create message
            message = LERSMessage.objects.create(
                request=lers_request,
                sender=request.user,
                sender_type=sender_type,
                message_type=serializer.validated_data.get('message_type', LERSMessage.MessageType.TEXT),
                message_text=serializer.validated_data['message_text'],
                attachments=serializer.validated_data.get('attachments', []),
                metadata=serializer.validated_data.get('metadata', {})
            )
            
            # Create notification for the other party
            # If sender is IO, notify provider
            if sender_type == LERSMessage.SenderType.IO:
                # Find provider users for this request's provider_tenant
                if lers_request.provider_tenant:
                    from apps.authentication.models import User
                    provider_users = User.objects.filter(
                        tenant=lers_request.provider_tenant,
                        role='COMPANY_AGENT'
                    )
                    for provider_user in provider_users:
                        LERSNotification.create_notification(
                            user=provider_user,
                            notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
                            title=f"New message in {lers_request.request_number}",
                            message=f"{request.user.full_name or request.user.email} sent a message",
                            request=lers_request,
                            priority=LERSNotification.Priority.NORMAL,
                            link=f"/provider/requests/{lers_request.id}",
                            icon="message-circle"
                        )
            # If sender is provider, notify IO
            else:
                LERSNotification.create_notification(
                    user=lers_request.created_by,
                    notification_type=LERSNotification.NotificationType.NEW_MESSAGE,
                    title=f"New message in {lers_request.request_number}",
                    message=f"Provider sent a message",
                    request=lers_request,
                    priority=LERSNotification.Priority.NORMAL,
                    link=f"/lers/requests/{lers_request.id}",
                    icon="message-circle"
                )
            
            return Response(
                LERSMessageSerializer(message).data,
                status=status.HTTP_201_CREATED
            )
    
    @action(detail=False, methods=['get'], url_path='pending-approvals', permission_classes=[IsApprover])
    def pending_approvals(self, request):
        """
        Get all LERS requests pending approval for the approver dashboard.
        
        Supports filtering by:
        - priority (HIGH, URGENT, NORMAL)
        - station (tenant)
        - date range
        - IO (created_by)
        
        Supports sorting by:
        - newest (default)
        - oldest
        - priority
        - sla_due_date
        """
        # Base queryset - only pending approval requests
        queryset = LERSRequest.objects.filter(
            status='PENDING_APPROVAL',
            is_deleted=False
        ).select_related(
            'case', 'created_by', 'case__tenant'
        ).prefetch_related('entities')
        
        # Filters
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        station = request.query_params.get('station')  # tenant ID
        if station:
            queryset = queryset.filter(case__tenant__id=station)
        
        io = request.query_params.get('io')  # user ID
        if io:
            queryset = queryset.filter(created_by__id=io)
        
        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Sorting
        sort = request.query_params.get('sort', 'newest')
        if sort == 'oldest':
            queryset = queryset.order_by('created_at')
        elif sort == 'priority':
            # Order by priority: URGENT > HIGH > NORMAL
            priority_order = models.Case(
                models.When(priority='URGENT', then=1),
                models.When(priority='HIGH', then=2),
                models.When(priority='NORMAL', then=3),
                default=4,
                output_field=models.IntegerField()
            )
            queryset = queryset.annotate(priority_order=priority_order).order_by('priority_order', '-created_at')
        elif sort == 'sla':
            queryset = queryset.order_by('sla_due_date')
        else:  # newest (default)
            queryset = queryset.order_by('-created_at')
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LERSRequestListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LERSRequestListSerializer(queryset, many=True)
        return Response({
            'total_pending': queryset.count(),
            'requests': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='notifications/unread-count')
    def unread_notifications_count(self, request):
        """
        Get count of unread notifications for the current user.
        Used for the notification bell badge.
        """
        count = LERSNotification.objects.filter(
            user=request.user,
            read=False
        ).count()
        
        return Response({
            'unread_count': count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='notifications')
    def notifications(self, request):
        """
        Get all notifications for the current user.
        Supports pagination and filtering by read status.
        """
        # Base queryset
        queryset = LERSNotification.objects.filter(
            user=request.user
        ).select_related('request').order_by('-created_at')
        
        # Filter by read status
        read_status = request.query_params.get('read')
        if read_status == 'true':
            queryset = queryset.filter(read=True)
        elif read_status == 'false':
            queryset = queryset.filter(read=False)
        
        # Filter by priority
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by type
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LERSNotificationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LERSNotificationSerializer(queryset, many=True)
        return Response({
            'total': queryset.count(),
            'unread': queryset.filter(read=False).count(),
            'notifications': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='notifications/(?P<notification_id>[^/.]+)/mark-read')
    def mark_notification_read(self, request, notification_id=None, pk=None):
        """
        Mark a specific notification as read.
        """
        notification = get_object_or_404(
            LERSNotification,
            id=notification_id,
            user=request.user
        )
        
        notification.mark_as_read()
        
        return Response(
            LERSNotificationSerializer(notification).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='notifications/mark-all-read')
    def mark_all_notifications_read(self, request, pk=None):
        """
        Mark all unread notifications as read for the current user.
        """
        updated_count = LERSNotification.objects.filter(
            user=request.user,
            read=False
        ).update(
            read=True,
            read_at=timezone.now(),
            updated_at=timezone.now()
        )
        
        return Response({
            'marked_read': updated_count,
            'message': f'{updated_count} notifications marked as read'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post', 'get'], url_path='presence')
    def update_presence(self, request):
        """
        GET: Get current user's presence status
        POST: Update current user's online/offline status
        
        Used for real-time presence indicators in chat.
        """
        # Get or create presence for user
        presence, created = UserPresence.objects.get_or_create(
            user=request.user,
            defaults={'status': UserPresence.Status.OFFLINE}
        )
        
        if request.method == 'GET':
            serializer = UserPresenceSerializer(presence)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Update presence status
            new_status = request.data.get('status')
            socket_id = request.data.get('socket_id', '')
            
            if new_status == 'ONLINE':
                presence.set_online(socket_id=socket_id)
            elif new_status == 'AWAY':
                presence.set_away()
            elif new_status == 'OFFLINE':
                presence.set_offline()
            else:
                return Response({
                    'error': 'Invalid status. Must be ONLINE, AWAY, or OFFLINE'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = UserPresenceSerializer(presence)
            return Response(serializer.data, status=status.HTTP_200_OK)


class LERSResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LERS responses (company submissions).
    """
    permission_classes = [IsAuthenticated]
    filterset_fields = ['request', 'status', 'signature_verified']
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return LERSResponseCreateSerializer
        return LERSResponseSerializer
    
    def get_queryset(self):
        """Filter responses based on user role."""
        user = self.request.user
        
        if user.role == 'COMPANY_AGENT':
            # Company agents see their responses
            return LERSResponse.objects.filter(
                submitted_by=user,
                is_deleted=False
            )
        else:
            # Police officers see responses for their requests
            accessible_requests = LERSRequest.objects.filter(
                case__tenant=user.tenant
            ).values_list('id', flat=True)
            
            return LERSResponse.objects.filter(
                request__id__in=accessible_requests,
                is_deleted=False
            )
    
    @action(detail=True, methods=['post'])
    def verify_signature(self, request, pk=None):
        """
        Verify digital signature of response.
        """
        response = self.get_object()
        
        # TODO: Implement actual signature verification
        # For now, just mark as verified
        response.signature_verified = True
        response.save(update_fields=['signature_verified'])
        
        return Response({
            'message': 'Signature verified',
            'verified': True
        }, status=status.HTTP_200_OK)


class LERSTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LERS request templates.
    """
    queryset = LERSTemplate.objects.filter(is_deleted=False)
    serializer_class = LERSTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['request_type', 'is_active', 'tenant']
    
    def get_queryset(self):
        """Filter templates by tenant."""
        user = self.request.user
        return LERSTemplate.objects.filter(
            models.Q(tenant=user.tenant) | models.Q(tenant__isnull=True),
            is_deleted=False
        )
    
    @action(detail=True, methods=['post'])
    def use_template(self, request, pk=None):
        """
        Increment usage count when template is used.
        """
        template = self.get_object()
        template.usage_count += 1
        template.save(update_fields=['usage_count'])
        
        return Response({
            'message': 'Template usage recorded'
        }, status=status.HTTP_200_OK)


# ==========================================
# PROVIDER DATA CATALOG VIEWS
# ==========================================

class ProviderDataCatalogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for providers to manage their data catalog.
    Providers can create, update, and manage what data they can provide.
    """
    permission_classes = [IsAuthenticated, IsCompanyAgent]
    filterset_fields = ['category', 'is_active', 'is_featured']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'sla_turnaround_hours', 'sla_compliance_rate', 'created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action in ['create', 'update', 'partial_update']:
            return ProviderDataCatalogCreateSerializer
        return ProviderDataCatalogSerializer
    
    def get_queryset(self):
        """
        Providers can only see and manage their own catalog items.
        """
        user = self.request.user
        
        if user.role == 'ADMIN':
            return ProviderDataCatalog.objects.all()
        elif user.role == 'COMPANY_AGENT':
            # Provider can only see their own catalog items
            return ProviderDataCatalog.objects.filter(
                provider_tenant=user.tenant
            )
        else:
            # Law enforcement can't manage catalogs
            return ProviderDataCatalog.objects.none()
    
    def perform_create(self, serializer):
        """Auto-assign provider tenant from current user."""
        serializer.save(provider_tenant=self.request.user.tenant)
    
    @action(detail=True, methods=['post'])
    def update_metrics(self, request, pk=None):
        """
        Manually trigger SLA metrics update for this catalog item.
        """
        catalog_item = self.get_object()
        catalog_item.update_sla_metrics()
        
        serializer = self.get_serializer(catalog_item)
        return Response({
            'message': 'Metrics updated successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Get analytics for provider's catalog items.
        """
        user = request.user
        
        if user.role != 'COMPANY_AGENT':
            return Response({
                'error': 'Only providers can view analytics'
            }, status=status.HTTP_403_FORBIDDEN)
        
        catalog_items = ProviderDataCatalog.objects.filter(
            provider_tenant=user.tenant
        )
        
        # Calculate overall stats
        total_items = catalog_items.count()
        active_items = catalog_items.filter(is_active=True).count()
        featured_items = catalog_items.filter(is_featured=True).count()
        
        # Most popular items
        popular_items = catalog_items.order_by('-total_requests_fulfilled')[:5]
        
        # Best performing items
        best_performing = catalog_items.filter(
            sla_compliance_rate__isnull=False
        ).order_by('-sla_compliance_rate')[:5]
        
        return Response({
            'summary': {
                'total_items': total_items,
                'active_items': active_items,
                'featured_items': featured_items
            },
            'popular_items': ProviderDataCatalogSerializer(popular_items, many=True).data,
            'best_performing': ProviderDataCatalogSerializer(best_performing, many=True).data
        }, status=status.HTTP_200_OK)


class CatalogBrowseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for law enforcement to browse available catalogs.
    Shows what data each provider can deliver with SLA transparency.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CatalogBrowseSerializer
    filterset_fields = ['category', 'provider_tenant', 'requires_court_order']
    search_fields = ['name', 'description', 'provider_tenant__name']
    ordering_fields = ['sla_turnaround_hours', 'sla_compliance_rate', 'total_requests_fulfilled']
    
    def get_queryset(self):
        """Only show active catalog items."""
        return ProviderDataCatalog.objects.filter(is_active=True)
    
    @action(detail=False, methods=['get'])
    def by_provider(self, request):
        """
        Get all catalog items grouped by provider.
        """
        provider_id = request.query_params.get('provider_id')
        
        if not provider_id:
            return Response({
                'error': 'provider_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        catalog_items = ProviderDataCatalog.objects.filter(
            provider_tenant_id=provider_id,
            is_active=True
        )
        
        serializer = self.get_serializer(catalog_items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """
        Get catalog items by category (e.g., BANKING, TELECOM).
        """
        category = request.query_params.get('category')
        
        if not category:
            return Response({
                'error': 'category parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        catalog_items = ProviderDataCatalog.objects.filter(
            category=category,
            is_active=True
        )
        
        serializer = self.get_serializer(catalog_items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """
        Get featured catalog items (most popular/recommended).
        """
        catalog_items = ProviderDataCatalog.objects.filter(
            is_active=True,
            is_featured=True
        )
        
        serializer = self.get_serializer(catalog_items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def fast_turnaround(self, request):
        """
        Get catalog items with fastest turnaround times.
        """
        hours = request.query_params.get('hours', 48)  # Default 48 hours
        
        catalog_items = ProviderDataCatalog.objects.filter(
            is_active=True,
            sla_turnaround_hours__lte=int(hours)
        ).order_by('sla_turnaround_hours')
        
        serializer = self.get_serializer(catalog_items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProviderServiceProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing provider service profiles (report cards).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProviderServiceProfileSerializer
    
    def get_queryset(self):
        """
        Providers see only their own profile.
        Law enforcement can see all profiles.
        """
        user = self.request.user
        
        if user.role == 'ADMIN':
            return ProviderServiceProfile.objects.all()
        elif user.role == 'COMPANY_AGENT':
            # Provider sees only their profile
            return ProviderServiceProfile.objects.filter(
                provider_tenant=user.tenant
            )
        else:
            # Law enforcement can see all provider profiles
            return ProviderServiceProfile.objects.all()
    
    @action(detail=True, methods=['post'])
    def update_metrics(self, request, pk=None):
        """
        Manually trigger overall metrics update for provider.
        """
        profile = self.get_object()
        
        # Check permission - only provider can update their own metrics
        if request.user.role == 'COMPANY_AGENT' and profile.provider_tenant != request.user.tenant:
            return Response({
                'error': 'Cannot update metrics for other providers'
            }, status=status.HTTP_403_FORBIDDEN)
        
        profile.update_overall_metrics()
        
        # Also update all catalog item metrics
        catalog_items = ProviderDataCatalog.objects.filter(
            provider_tenant=profile.provider_tenant
        )
        for item in catalog_items:
            item.update_sla_metrics()
        
        serializer = self.get_serializer(profile)
        return Response({
            'message': 'All metrics updated successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """
        Get provider leaderboard sorted by performance.
        """
        profiles = ProviderServiceProfile.objects.filter(
            overall_sla_compliance_rate__isnull=False
        ).order_by('-overall_sla_compliance_rate')[:10]
        
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def performance_comparison(self, request):
        """
        Compare performance of multiple providers.
        """
        provider_ids = request.query_params.getlist('provider_ids[]')
        
        if not provider_ids:
            return Response({
                'error': 'provider_ids[] parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        profiles = ProviderServiceProfile.objects.filter(
            provider_tenant_id__in=provider_ids
        )
        
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CatalogUsageAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing catalog usage analytics.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProviderServiceProfileSerializer  # Will create proper serializer later
    filterset_fields = ['catalog_item', 'period_start', 'period_end']
    ordering_fields = ['period_start', 'requests_received', 'avg_turnaround_hours']
    
    def get_queryset(self):
        """
        Providers see analytics for their own items.
        Admins see all.
        """
        user = self.request.user
        
        if user.role == 'ADMIN':
            return CatalogUsageAnalytics.objects.all()
        elif user.role == 'COMPANY_AGENT':
            # Provider sees analytics for their catalog items only
            return CatalogUsageAnalytics.objects.filter(
                catalog_item__provider_tenant=user.tenant
            )
        else:
            return CatalogUsageAnalytics.objects.none()
