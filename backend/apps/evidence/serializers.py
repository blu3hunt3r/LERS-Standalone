"""
Serializers for evidence management.
"""
from rest_framework import serializers
from .models import EvidenceFile, ChainOfCustody, EvidenceTag, CourtBundle


class ChainOfCustodySerializer(serializers.ModelSerializer):
    """Serializer for chain of custody records."""
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    
    class Meta:
        model = ChainOfCustody
        fields = [
            'id', 'evidence', 'action', 'action_display',
            'actor', 'actor_name', 'description', 'ip_address',
            'user_agent', 'file_hash_at_action', 'integrity_verified',
            'metadata', 'action_timestamp', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EvidenceFileSerializer(serializers.ModelSerializer):
    """Serializer for evidence files."""
    
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    
    # Chain of custody
    custody_records = ChainOfCustodySerializer(many=True, read_only=True)
    custody_count = serializers.SerializerMethodField()
    
    class Meta:
        model = EvidenceFile
        fields = [
            'id', 'case', 'case_number',
            'file_name', 'file_type', 'file_type_display',
            'mime_type', 'file_size', 'storage_path',
            'sha256_hash', 'md5_hash', 'source', 'source_display',
            'uploaded_by', 'uploaded_by_name', 'description', 'tags',
            'parsed', 'parser_version', 'parser_output', 'parser_confidence',
            'lers_response', 'is_encrypted', 'encryption_algorithm',
            'legal_hold', 'retention_until', 'custody_records', 'custody_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'storage_path', 'sha256_hash', 'md5_hash',
            'file_size', 'is_encrypted', 'encryption_algorithm',
            'uploaded_by', 'created_at', 'updated_at'
        ]
    
    def get_custody_count(self, obj):
        """Get custody record count."""
        return obj.custody_records.count()


class EvidenceFileListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for evidence lists."""
    
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = EvidenceFile
        fields = [
            'id', 'file_name', 'file_type', 'file_type_display',
            'file_size', 'uploaded_by_name', 'parsed',
            'legal_hold', 'created_at'
        ]


class EvidenceUploadSerializer(serializers.Serializer):
    """Serializer for evidence file upload."""
    
    case = serializers.UUIDField(required=True)
    file = serializers.FileField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    source = serializers.ChoiceField(
        choices=EvidenceFile.Source.choices,
        default=EvidenceFile.Source.MANUAL_UPLOAD
    )
    
    def validate_file(self, value):
        """Validate uploaded file."""
        # Check file size (max 500MB)
        max_size = 500 * 1024 * 1024  # 500MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed size of {max_size / (1024*1024)}MB"
            )
        return value


class EvidenceTagSerializer(serializers.ModelSerializer):
    """Serializer for evidence tags."""
    
    class Meta:
        model = EvidenceTag
        fields = ['id', 'name', 'description', 'color', 'tenant', 'created_at']
        read_only_fields = ['id', 'tenant', 'created_at']


class CourtBundleSerializer(serializers.ModelSerializer):
    """Serializer for court bundles."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    evidence_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CourtBundle
        fields = [
            'id', 'case', 'case_number', 'bundle_name', 'description',
            'status', 'status_display', 'bundle_path', 'bundle_size',
            'bundle_hash', 'manifest', 'manifest_signature',
            'created_by', 'created_by_name', 'court_name',
            'case_reference', 'evidence_count', 'generated_at',
            'expires_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'bundle_path', 'bundle_size', 'bundle_hash',
            'manifest', 'manifest_signature', 'created_by',
            'generated_at', 'created_at'
        ]
    
    def get_evidence_count(self, obj):
        """Get evidence file count."""
        return obj.evidence_files.count()


class CourtBundleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating court bundles."""
    
    evidence_file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=True
    )
    
    class Meta:
        model = CourtBundle
        fields = [
            'case', 'bundle_name', 'description',
            'court_name', 'case_reference', 'evidence_file_ids'
        ]
    
    def create(self, validated_data):
        """Create court bundle with evidence files."""
        evidence_file_ids = validated_data.pop('evidence_file_ids')
        
        # Create bundle
        bundle = CourtBundle.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )
        
        # Add evidence files
        bundle.evidence_files.set(evidence_file_ids)
        
        # Trigger async task to generate bundle
        from .tasks import generate_court_bundle
        generate_court_bundle.delay(str(bundle.id))
        
        return bundle

