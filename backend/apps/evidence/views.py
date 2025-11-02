"""
Views for evidence management.
"""
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, Http404
from django.db import models
import magic
import hashlib
from .models import EvidenceFile, ChainOfCustody, EvidenceTag, CourtBundle
from .serializers import (
    EvidenceFileSerializer, EvidenceFileListSerializer,
    EvidenceUploadSerializer, ChainOfCustodySerializer,
    EvidenceTagSerializer, CourtBundleSerializer,
    CourtBundleCreateSerializer
)
from .storage import get_evidence_vault
from apps.core.permissions import IsCaseOwnerOrAssigned


class EvidenceFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for evidence file management.
    """
    permission_classes = [IsAuthenticated]
    filterset_fields = ['case', 'file_type', 'source', 'parsed', 'legal_hold']
    search_fields = ['file_name', 'description']
    ordering_fields = ['created_at', 'file_size']
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return EvidenceFileListSerializer
        elif self.action == 'upload':
            return EvidenceUploadSerializer
        return EvidenceFileSerializer
    
    def get_queryset(self):
        """Filter evidence by accessible cases."""
        user = self.request.user
        
        # Get accessible cases
        from apps.cases.models import Case
        accessible_cases = Case.objects.filter(
            models.Q(tenant=user.tenant) |
            models.Q(shared_with_tenants=user.tenant)
        ).values_list('id', flat=True)
        
        return EvidenceFile.objects.filter(
            case__id__in=accessible_cases,
            is_deleted=False
        ).select_related('case', 'uploaded_by')
    
    @action(detail=False, methods=['post'], parser_classes=[parsers.MultiPartParser])
    def upload(self, request):
        """
        Upload evidence file.
        """
        serializer = EvidenceUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get data
        case_id = serializer.validated_data['case']
        uploaded_file = serializer.validated_data['file']
        description = serializer.validated_data.get('description', '')
        tags = serializer.validated_data.get('tags', [])
        source = serializer.validated_data['source']
        
        # Verify case access
        from apps.cases.models import Case
        try:
            case = Case.objects.get(id=case_id, tenant=request.user.tenant)
        except Case.DoesNotExist:
            return Response({
                'error': 'Case not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Read file content
            file_content = uploaded_file.read()
            
            # Detect MIME type
            mime_type = magic.from_buffer(file_content, mime=True)
            
            # Upload to vault with encryption
            storage_metadata = get_evidence_vault().upload_evidence(
                file_content=file_content,
                file_name=uploaded_file.name,
                case_id=case_id,
                user_id=request.user.id,
                encrypt=True
            )
            
            # Determine file type
            file_type = self._get_file_type(mime_type)
            
            # Create evidence record
            evidence = EvidenceFile.objects.create(
                case=case,
                file_name=uploaded_file.name,
                file_type=file_type,
                mime_type=mime_type,
                file_size=storage_metadata['file_size'],
                storage_path=storage_metadata['storage_path'],
                sha256_hash=storage_metadata['sha256_hash'],
                source=source,
                uploaded_by=request.user,
                description=description,
                tags=tags,
                is_encrypted=storage_metadata['is_encrypted'],
                encryption_algorithm='AES-256-GCM',
                encryption_key_id=storage_metadata['encryption_key_id']
            )
            
            # Create chain of custody record
            ChainOfCustody.objects.create(
                evidence=evidence,
                action='UPLOADED',
                actor=request.user,
                description=f'Evidence uploaded: {uploaded_file.name}',
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                file_hash_at_action=storage_metadata['sha256_hash'],
                integrity_verified=True
            )
            
            # Create timeline event
            from apps.cases.models import CaseTimeline
            CaseTimeline.objects.create(
                case=case,
                event_type='EVIDENCE_ADDED',
                title='Evidence Added',
                description=f'Evidence file uploaded: {uploaded_file.name}',
                actor=request.user,
                related_evidence=evidence
            )
            
            # AUTO-TRIGGER: Process file for entity extraction
            try:
                from apps.investigation.parsers.auto_trigger import process_uploaded_file
                processing_result = process_uploaded_file(evidence)
                
                if processing_result.get('parser_ran'):
                    # Add processing info to response
                    response_data = EvidenceFileSerializer(evidence).data
                    response_data['auto_processing'] = processing_result
                    
                    return Response(response_data, status=status.HTTP_201_CREATED)
            except Exception as e:
                # Don't fail the upload if auto-processing fails
                print(f"Auto-processing error: {str(e)}")
            
            return Response(
                EvidenceFileSerializer(evidence).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response({
                'error': f'Upload failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download evidence file (with decryption).
        """
        evidence = self.get_object()
        
        # Check legal hold
        if evidence.legal_hold:
            return Response({
                'error': 'Evidence is under legal hold and cannot be downloaded'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Download from vault
            file_content = get_evidence_vault().download_evidence(
                storage_path=evidence.storage_path,
                decrypt=evidence.is_encrypted
            )
            
            # Create chain of custody record
            ChainOfCustody.objects.create(
                evidence=evidence,
                action='DOWNLOADED',
                actor=request.user,
                description=f'Evidence downloaded by {request.user.full_name}',
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                file_hash_at_action=evidence.sha256_hash
            )
            
            # Return file
            response = FileResponse(file_content, content_type=evidence.mime_type)
            response['Content-Disposition'] = f'attachment; filename="{evidence.file_name}"'
            response['Content-Length'] = len(file_content)
            
            return response
            
        except Exception as e:
            return Response({
                'error': f'Download failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def verify_integrity(self, request, pk=None):
        """
        Verify integrity of evidence file.
        """
        evidence = self.get_object()
        
        try:
            is_valid = get_evidence_vault().verify_integrity(
                storage_path=evidence.storage_path,
                expected_hash=evidence.sha256_hash
            )
            
            # Create custody record
            ChainOfCustody.objects.create(
                evidence=evidence,
                action='VERIFIED',
                actor=request.user,
                description='Integrity verification performed',
                ip_address=self._get_client_ip(request),
                file_hash_at_action=evidence.sha256_hash,
                integrity_verified=is_valid
            )
            
            return Response({
                'integrity_verified': is_valid,
                'message': 'Integrity verified successfully' if is_valid else 'Integrity verification failed'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Verification failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def custody_chain(self, request, pk=None):
        """
        Get chain of custody for evidence.
        """
        evidence = self.get_object()
        custody_records = evidence.custody_records.all()
        serializer = ChainOfCustodySerializer(custody_records, many=True)
        return Response(serializer.data)
    
    def _get_file_type(self, mime_type):
        """Determine file type from MIME type."""
        if mime_type.startswith('image/'):
            return 'IMAGE'
        elif mime_type.startswith('video/'):
            return 'VIDEO'
        elif mime_type.startswith('audio/'):
            return 'AUDIO'
        elif mime_type in ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return 'DOCUMENT'
        elif mime_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']:
            return 'SPREADSHEET'
        elif mime_type in ['application/zip', 'application/x-rar-compressed']:
            return 'ARCHIVE'
        else:
            return 'OTHER'
    
    def _get_client_ip(self, request):
        """Extract client IP."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EvidenceTagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for evidence tags.
    """
    queryset = EvidenceTag.objects.filter(is_deleted=False)
    serializer_class = EvidenceTagSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['tenant']
    
    def get_queryset(self):
        """Filter tags by tenant."""
        user = self.request.user
        if user.tenant:
            return EvidenceTag.objects.filter(tenant=user.tenant, is_deleted=False)
        return EvidenceTag.objects.none()
    
    def perform_create(self, serializer):
        """Create tag with current tenant."""
        serializer.save(tenant=self.request.user.tenant)


class CourtBundleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for court bundle management.
    """
    permission_classes = [IsAuthenticated]
    filterset_fields = ['case', 'status']
    search_fields = ['bundle_name', 'description']
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return CourtBundleCreateSerializer
        return CourtBundleSerializer
    
    def get_queryset(self):
        """Filter bundles by accessible cases."""
        user = self.request.user
        
        from apps.cases.models import Case
        accessible_cases = Case.objects.filter(
            models.Q(tenant=user.tenant) |
            models.Q(shared_with_tenants=user.tenant)
        ).values_list('id', flat=True)
        
        return CourtBundle.objects.filter(
            case__id__in=accessible_cases,
            is_deleted=False
        )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download court bundle.
        """
        bundle = self.get_object()
        
        if bundle.status != 'READY':
            return Response({
                'error': 'Bundle is not ready for download'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Download bundle from storage
            file_content = get_evidence_vault().download_evidence(
                storage_path=bundle.bundle_path,
                decrypt=False  # Bundles are not encrypted
            )
            
            response = FileResponse(file_content, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{bundle.bundle_name}.zip"'
            response['Content-Length'] = bundle.bundle_size
            
            return response
            
        except Exception as e:
            return Response({
                'error': f'Download failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

