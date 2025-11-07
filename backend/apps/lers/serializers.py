"""
Serializers for LERS (Law Enforcement Request System).
"""
from django.db import models
from rest_framework import serializers
from .models import (
    LERSRequest, LERSResponse, LERSApprovalWorkflow, LERSTemplate,
    LERSMessage, UserPresence, LERSNotification,
    ProviderDataCatalog, ProviderServiceProfile, CatalogUsageAnalytics
)


class LERSApprovalWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for approval workflow."""
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    approver_name = serializers.CharField(source='approver.full_name', read_only=True)
    
    class Meta:
        model = LERSApprovalWorkflow
        fields = [
            'id', 'request', 'approver', 'approver_name',
            'action', 'action_display', 'comments',
            'signature_hash', 'action_timestamp', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LERSResponseSerializer(serializers.ModelSerializer):
    """Serializer for LERS response."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.full_name', read_only=True)
    request_number = serializers.CharField(source='request.request_number', read_only=True)
    evidence_count = serializers.SerializerMethodField()
    evidence_files = serializers.SerializerMethodField()

    class Meta:
        model = LERSResponse
        fields = [
            'id', 'request', 'request_number', 'response_number',
            'submitted_by', 'submitted_by_name', 'submitted_at',
            'status', 'status_display', 'parsed_data',
            'signature', 'signature_verified', 'response_text',
            'remarks', 'evidence_count', 'evidence_files', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'response_number', 'created_at']

    def get_evidence_count(self, obj):
        """Get count of evidence files in response."""
        return obj.evidence_files.count()

    def get_evidence_files(self, obj):
        """Get evidence files with download URLs."""
        request = self.context.get('request')
        files = obj.evidence_files.all()

        file_list = []
        for evidence_file in files:
            # Build download URL
            download_url = None
            if request:
                download_url = request.build_absolute_uri(
                    f'/api/v1/evidence/files/{evidence_file.id}/download/'
                )

            file_list.append({
                'id': str(evidence_file.id),
                'file_name': evidence_file.file_name,
                'file_size': evidence_file.file_size,
                'file_type': evidence_file.file_type,
                'mime_type': evidence_file.mime_type,
                'sha256_hash': evidence_file.sha256_hash,
                'uploaded_at': evidence_file.created_at,
                'download_url': download_url,
                'is_encrypted': evidence_file.is_encrypted
            })

        return file_list


class LERSRequestSerializer(serializers.ModelSerializer):
    """Main serializer for LERS requests."""
    
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    case_number = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    
    # Nested relationships
    responses = LERSResponseSerializer(many=True, read_only=True)
    approval_workflow = LERSApprovalWorkflowSerializer(many=True, read_only=True)
    
    # Calculated fields
    days_until_due = serializers.SerializerMethodField()
    response_count = serializers.SerializerMethodField()
    
    class Meta:
        model = LERSRequest
        fields = [
            'id', 'request_number', 'case', 'case_number',
            'request_type', 'request_type_display', 'provider', 'provider_tenant',
            'identifiers', 'description', 'date_range_from', 'date_range_to',
            'legal_mandate_type', 'legal_mandate_file', 'court_order_number',
            'status', 'status_display', 'priority', 'priority_display',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'assigned_to_company', 'sla_due_date', 'sla_breached', 'days_until_due',
            'approved_at', 'submitted_at', 'completed_at',
            'notes', 'rejection_reason', 'metadata',
            'responses', 'approval_workflow', 'response_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'request_number', 'created_by', 'approved_by',
            'sla_breached', 'approved_at', 'submitted_at', 'completed_at',
            'created_at', 'updated_at'
        ]
    
    def get_case_number(self, obj):
        """Get case number, handling optional case."""
        return obj.case.case_number if obj.case else None

    def get_days_until_due(self, obj):
        """Calculate days until SLA due."""
        if obj.sla_due_date:
            from django.utils import timezone
            delta = obj.sla_due_date - timezone.now()
            return delta.days
        return None

    def get_response_count(self, obj):
        """Get response count."""
        return obj.responses.count()


class LERSRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for request lists."""

    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    case_number = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = LERSRequest
        fields = [
            'id', 'request_number', 'case_number', 'request_type', 'request_type_display',
            'provider', 'status', 'status_display', 'priority',
            'sla_due_date', 'sla_breached', 'days_until_due', 'created_at'
        ]

    def get_case_number(self, obj):
        """Get case number, handling optional case."""
        return obj.case.case_number if obj.case else None

    def get_days_until_due(self, obj):
        """Calculate days until SLA due."""
        if obj.sla_due_date:
            from django.utils import timezone
            delta = obj.sla_due_date - timezone.now()
            return delta.days
        return None


class LERSRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LERS requests."""

    fir_number = serializers.CharField(required=True, write_only=True, help_text="FIR number to link this request to")

    class Meta:
        model = LERSRequest
        fields = [
            'fir_number', 'request_type', 'provider', 'provider_tenant',
            'identifiers', 'description', 'date_range_from', 'date_range_to',
            'legal_mandate_type', 'legal_mandate_file', 'court_order_number',
            'priority', 'notes'
        ]

    def create(self, validated_data):
        """Create LERS request with auto-generated fields and auto-create Case from FIR number."""
        from apps.cases.models import Case
        user = self.context['request'].user

        # Extract FIR number
        fir_number = validated_data.pop('fir_number')

        # Auto-create or get Case from FIR number
        case, created = Case.objects.get_or_create(
            case_number=fir_number,
            tenant=user.tenant,
            defaults={
                'title': f'Case for {fir_number}',
                'is_deleted': False
            }
        )
        validated_data['case'] = case

        # Auto-map provider name to provider_tenant if not provided
        if not validated_data.get('provider_tenant') and validated_data.get('provider'):
            from apps.tenants.models import Tenant
            # Try to find tenant by provider name
            provider_name = validated_data['provider']
            tenant = Tenant.objects.filter(name__icontains=provider_name).first()
            if tenant:
                validated_data['provider_tenant'] = tenant

        # Create request
        lers_request = LERSRequest(**validated_data)
        lers_request.created_by = user
        lers_request.request_number = lers_request.generate_request_number()
        lers_request.sla_due_date = lers_request.calculate_sla_due_date()
        lers_request.save()

        return lers_request


class LERSApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting requests."""
    
    action = serializers.ChoiceField(choices=LERSApprovalWorkflow.Action.choices, required=True)
    comments = serializers.CharField(required=False, allow_blank=True)
    signature_hash = serializers.CharField(required=False, allow_blank=True)


class LERSResponseCreateSerializer(serializers.ModelSerializer):
    """Serializer for company response submission."""
    
    class Meta:
        model = LERSResponse
        fields = [
            'request', 'response_text', 'remarks', 'signature'
        ]
    
    def create(self, validated_data):
        """Create response with auto-generated fields."""
        user = self.context['request'].user
        request_obj = validated_data['request']
        
        # Generate response number
        response_number = f"{request_obj.request_number}-RESP-{request_obj.responses.count() + 1:02d}"
        
        response = LERSResponse.objects.create(
            response_number=response_number,
            submitted_by=user,
            **validated_data
        )
        
        # Update request status
        request_obj.status = 'RESPONSE_UPLOADED'
        request_obj.save(update_fields=['status'])

        # Create timeline event (only if linked to a case)
        if request_obj.case:
            from apps.cases.models import CaseTimeline
            CaseTimeline.objects.create(
                case=request_obj.case,
                event_type='RESPONSE_RECEIVED',
                title='LERS Response Received',
                description=f'Response received for request {request_obj.request_number}',
                actor=user,
                related_request=request_obj
            )
        
        return response


class LERSTemplateSerializer(serializers.ModelSerializer):
    """Serializer for LERS templates."""
    
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True, allow_null=True)
    
    class Meta:
        model = LERSTemplate
        fields = [
            'id', 'name', 'request_type', 'request_type_display',
            'description', 'template_fields', 'tenant', 'tenant_name',
            'is_active', 'usage_count', 'created_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at']


class LERSMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for LERS chat messages.
    Handles real-time messaging between IO and Provider.
    Supports E2E encryption.
    """

    # Related fields
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    request_number = serializers.CharField(source='request.request_number', read_only=True)

    # Display fields
    sender_type_display = serializers.CharField(source='get_sender_type_display', read_only=True)
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    time_since = serializers.SerializerMethodField()

    class Meta:
        model = LERSMessage
        fields = [
            'id', 'request', 'request_number', 'sender', 'sender_name', 'sender_email',
            'sender_type', 'sender_type_display', 'message_type', 'message_type_display',
            'message_text', 'attachments', 'read_by_receiver', 'read_at',
            # E2E encryption fields
            'is_encrypted', 'encrypted_content', 'encrypted_key',
            'encryption_algorithm', 'encryption_iv', 'encryption_auth_tag',
            'sender_key_fingerprint',
            'metadata', 'created_at', 'time_since'
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'read_at']
    
    def get_sender_name(self, obj):
        """Get sender's full name"""
        if obj.sender:
            return obj.sender.full_name or obj.sender.email
        return 'System'
    
    def get_time_since(self, obj):
        """Get human-readable time since message was sent"""
        from django.utils.timesince import timesince
        return f"{timesince(obj.created_at)} ago"


class LERSMessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new LERS messages.
    Used when sending messages via API.
    Supports E2E encryption.
    """

    class Meta:
        model = LERSMessage
        fields = [
            'request', 'sender_type', 'message_type',
            'message_text', 'attachments', 'metadata',
            # E2E encryption fields
            'is_encrypted', 'encrypted_content', 'encrypted_key',
            'encryption_algorithm', 'encryption_iv', 'encryption_auth_tag',
            'sender_key_fingerprint'
        ]

    def validate(self, data):
        """Validate message data based on encryption status"""
        is_encrypted = data.get('is_encrypted', False)

        if is_encrypted:
            # For encrypted messages, require all encryption fields
            required_fields = [
                'encrypted_content', 'encrypted_key',
                'encryption_algorithm', 'encryption_iv'
            ]
            missing_fields = [f for f in required_fields if not data.get(f)]
            if missing_fields:
                raise serializers.ValidationError(
                    f"Encrypted messages must include: {', '.join(missing_fields)}"
                )
            # message_text can be empty for encrypted messages (it's stored in encrypted_content)
        else:
            # For non-encrypted messages, require message_text
            if not data.get('message_text') or not data.get('message_text').strip():
                raise serializers.ValidationError("Message text cannot be empty")
            data['message_text'] = data['message_text'].strip()

        return data

    def validate_attachments(self, value):
        """Validate attachment structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Attachments must be a list")

        for attachment in value:
            if not isinstance(attachment, dict):
                raise serializers.ValidationError("Each attachment must be a dictionary")
            required_keys = ['url', 'filename']
            if not all(key in attachment for key in required_keys):
                raise serializers.ValidationError(
                    f"Each attachment must have: {', '.join(required_keys)}"
                )
        return value


class UserPresenceSerializer(serializers.ModelSerializer):
    """
    Serializer for user presence/online status.
    Used for real-time presence indicators in chat.
    """
    
    # User fields
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    # Display fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    time_since_last_seen = serializers.CharField(read_only=True)
    status_color = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPresence
        fields = [
            'user_id', 'user_email', 'user_name', 'status', 'status_display',
            'status_color', 'is_online', 'last_seen', 'last_online',
            'time_since_last_seen', 'socket_id', 'metadata'
        ]
        read_only_fields = ['user_id', 'last_seen', 'last_online']
    
    def get_user_name(self, obj):
        """Get user's full name"""
        return obj.user.full_name or obj.user.email
    
    def get_status_color(self, obj):
        """Get color for status indicator"""
        colors = {
            'ONLINE': 'green',
            'AWAY': 'yellow',
            'OFFLINE': 'gray'
        }
        return colors.get(obj.status, 'gray')


class LERSNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for LERS notifications.
    Handles in-app notifications with real-time delivery.
    """
    
    # User fields
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    # Request fields
    request_number = serializers.CharField(source='request.request_number', read_only=True, allow_null=True)
    
    # Display fields
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    time_since = serializers.SerializerMethodField()
    priority_color = serializers.SerializerMethodField()
    
    class Meta:
        model = LERSNotification
        fields = [
            'id', 'user', 'user_email', 'user_name', 'request', 'request_number',
            'type', 'type_display', 'title', 'message', 'icon', 'link',
            'priority', 'priority_display', 'priority_color',
            'read', 'read_at', 'delivered', 'delivered_at', 'email_sent',
            'metadata', 'created_at', 'time_since'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'read_at', 'delivered_at']
    
    def get_user_name(self, obj):
        """Get user's full name"""
        return obj.user.full_name or obj.user.email
    
    def get_time_since(self, obj):
        """Get human-readable time since notification was created"""
        from django.utils.timesince import timesince
        return f"{timesince(obj.created_at)} ago"
    
    def get_priority_color(self, obj):
        """Get color for priority badge"""
        colors = {
            'NORMAL': 'blue',
            'HIGH': 'orange',
            'URGENT': 'red'
        }
        return colors.get(obj.priority, 'blue')


class LERSNotificationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating notifications.
    Used by the notification helper service.
    """
    
    user_id = serializers.UUIDField()
    request_id = serializers.UUIDField(required=False, allow_null=True)
    type = serializers.ChoiceField(choices=LERSNotification.NotificationType.choices)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    icon = serializers.CharField(max_length=50, required=False, allow_blank=True)
    link = serializers.CharField(max_length=255, required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=LERSNotification.Priority.choices,
        default=LERSNotification.Priority.NORMAL
    )
    metadata = serializers.JSONField(required=False, default=dict)
    
    def validate(self, data):
        """Validate notification data"""
        # Ensure user exists
        from apps.authentication.models import User
        try:
            user = User.objects.get(id=data['user_id'])
            data['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError({'user_id': 'User does not exist'})
        
        # Ensure request exists if provided
        if data.get('request_id'):
            try:
                request = LERSRequest.objects.get(id=data['request_id'])
                data['request'] = request
            except LERSRequest.DoesNotExist:
                raise serializers.ValidationError({'request_id': 'LERS request does not exist'})
        
        return data
    
    def create(self, validated_data):
        """Create notification using the model's helper method"""
        user_id = validated_data.pop('user_id')
        user = validated_data.pop('user')
        request_id = validated_data.pop('request_id', None)
        request = validated_data.pop('request', None)
        
        return LERSNotification.create_notification(
            user=user,
            notification_type=validated_data['type'],
            title=validated_data['title'],
            message=validated_data['message'],
            request=request,
            priority=validated_data.get('priority', 'NORMAL'),
            link=validated_data.get('link', ''),
            icon=validated_data.get('icon', ''),
            metadata=validated_data.get('metadata', {})
        )


# =============================================================================
# Provider Data Catalog Serializers
# =============================================================================

class ProviderDataCatalogSerializer(serializers.ModelSerializer):
    """
    Serializer for Provider Data Catalog items.
    Shows what data a provider can deliver with SLA transparency.
    """
    
    provider_name = serializers.CharField(source='provider_tenant.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    output_format_display = serializers.CharField(source='get_output_format_display', read_only=True)
    sla_status = serializers.SerializerMethodField()
    performance_grade = serializers.SerializerMethodField()
    
    class Meta:
        model = ProviderDataCatalog
        fields = [
            'id', 'provider_tenant', 'provider_name',
            'name', 'description', 'category', 'category_display',
            # SLA fields (core feature)
            'sla_turnaround_hours', 'sla_business_hours_only',
            'actual_avg_turnaround_hours', 'actual_median_turnaround_hours',
            'sla_compliance_rate', 'total_requests_fulfilled',
            'sla_status', 'performance_grade',
            # Requirements
            'required_fields', 'required_legal_mandate',
            'requires_court_order', 'requires_pan_verification',
            'additional_requirements',
            # Output
            'output_format', 'output_format_display',
            'output_description', 'sample_output_file',
            # Status
            'is_active', 'is_featured',
            'notes_for_law_enforcement',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'provider_name', 'actual_avg_turnaround_hours',
            'actual_median_turnaround_hours', 'sla_compliance_rate',
            'total_requests_fulfilled', 'created_at', 'updated_at'
        ]
    
    def get_sla_status(self, obj):
        """Get SLA status display"""
        return obj.get_sla_status_display()
    
    def get_performance_grade(self, obj):
        """Calculate performance grade based on compliance"""
        if not obj.sla_compliance_rate:
            return 'NEW'
        elif obj.sla_compliance_rate >= 95:
            return 'A+'
        elif obj.sla_compliance_rate >= 90:
            return 'A'
        elif obj.sla_compliance_rate >= 85:
            return 'B+'
        elif obj.sla_compliance_rate >= 80:
            return 'B'
        elif obj.sla_compliance_rate >= 75:
            return 'C+'
        elif obj.sla_compliance_rate >= 70:
            return 'C'
        else:
            return 'D'


class ProviderDataCatalogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating catalog items."""
    
    class Meta:
        model = ProviderDataCatalog
        fields = [
            'name', 'description', 'category',
            'sla_turnaround_hours', 'sla_business_hours_only',
            'required_fields', 'required_legal_mandate',
            'requires_court_order', 'requires_pan_verification',
            'additional_requirements',
            'output_format', 'output_description', 'sample_output_file',
            'is_active', 'is_featured',
            'notes_for_law_enforcement', 'internal_notes'
        ]
    
    def validate_required_fields(self, value):
        """Validate required_fields JSON structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("required_fields must be a list")
        
        for field in value:
            if not isinstance(field, dict):
                raise serializers.ValidationError("Each field must be a dictionary")
            
            required_keys = ['field', 'label', 'type', 'required']
            missing = [k for k in required_keys if k not in field]
            if missing:
                raise serializers.ValidationError(
                    f"Field missing required keys: {missing}"
                )
        
        return value
    
    def create(self, validated_data):
        """Create catalog item for the current provider"""
        validated_data['provider_tenant'] = self.context['request'].user.tenant
        return super().create(validated_data)


class ProviderServiceProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Provider Service Profile.
    This is the "report card" shown to law enforcement.
    """
    
    provider_name = serializers.CharField(source='provider_tenant.name', read_only=True)
    performance_grade = serializers.CharField(source='get_performance_grade', read_only=True)
    catalog_items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProviderServiceProfile
        fields = [
            'id', 'provider_tenant', 'provider_name',
            # Service hours
            'service_hours', 'holidays_affect_sla',
            # Contact
            'nodal_officer_name', 'nodal_officer_designation',
            'nodal_officer_email', 'nodal_officer_phone',
            'emergency_contact',
            # Performance metrics
            'overall_sla_compliance_rate', 'performance_grade',
            'total_requests_received', 'total_requests_completed',
            'avg_response_time_hours',
            'rejection_rate', 'clarification_request_rate',
            # Certifications
            'iso_certified', 'iso_certificate_number',
            'data_security_certified', 'govt_empaneled',
            # Statement
            'service_commitment',
            'catalog_items_count',
            'metrics_last_updated',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'overall_sla_compliance_rate', 'total_requests_received',
            'total_requests_completed', 'avg_response_time_hours',
            'rejection_rate', 'clarification_request_rate',
            'metrics_last_updated', 'created_at', 'updated_at'
        ]
    
    def get_catalog_items_count(self, obj):
        """Get count of active catalog items"""
        return obj.provider_tenant.data_catalog_items.filter(is_active=True).count()


class CatalogBrowseSerializer(serializers.Serializer):
    """
    Simplified serializer for law enforcement to browse catalogs.
    Focuses on SLA transparency and ease of selection.
    """
    
    id = serializers.UUIDField()
    provider_name = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    category_display = serializers.CharField()
    
    # SLA transparency (key selling point)
    sla_hours = serializers.IntegerField()
    actual_avg_hours = serializers.FloatField()
    success_rate = serializers.FloatField()
    performance_grade = serializers.CharField()
    total_fulfilled = serializers.IntegerField()
    
    # What's needed
    requires_court_order = serializers.BooleanField()
    legal_mandate = serializers.CharField()
    
    # What you get
    output_format = serializers.CharField()
    
    # Help text
    notes = serializers.CharField()

