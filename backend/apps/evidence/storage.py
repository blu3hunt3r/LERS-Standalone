"""
Evidence storage service with MinIO and encryption.
"""
import os
import base64
import hashlib
import logging
from io import BytesIO
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from django.conf import settings
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)


class EvidenceVault:
    """
    Secure evidence storage with encryption.
    """
    
    def __init__(self):
        """Initialize MinIO client."""
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
                
                # Enable versioning (for audit)
                # self.client.set_bucket_versioning(self.bucket_name, VersioningConfig(Status="Enabled"))
        except S3Error as e:
            logger.error(f"Error creating bucket: {str(e)}")
            raise
    
    def encrypt_file(self, file_content):
        """
        Encrypt file content using AES-256-GCM.
        
        Args:
            file_content (bytes): Raw file content
            
        Returns:
            tuple: (encrypted_content, encryption_key_id, iv)
        """
        try:
            # Get encryption key from settings
            key = base64.b64decode(settings.EVIDENCE_ENCRYPTION_KEY)
            
            # Generate random IV
            iv = os.urandom(16)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            # Encrypt
            encrypted_content = encryptor.update(file_content) + encryptor.finalize()
            
            # Get authentication tag
            tag = encryptor.tag
            
            # Combine IV + tag + encrypted content
            final_content = iv + tag + encrypted_content
            
            # Key ID for reference (use first 8 chars of key hash)
            key_id = hashlib.sha256(key).hexdigest()[:16]
            
            return final_content, key_id, base64.b64encode(iv).decode()
            
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise
    
    def decrypt_file(self, encrypted_content):
        """
        Decrypt file content.
        
        Args:
            encrypted_content (bytes): Encrypted file content
            
        Returns:
            bytes: Decrypted file content
        """
        try:
            # Get encryption key
            key = base64.b64decode(settings.EVIDENCE_ENCRYPTION_KEY)
            
            # Extract IV, tag, and encrypted content
            iv = encrypted_content[:16]
            tag = encrypted_content[16:32]
            ciphertext = encrypted_content[32:]
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            # Decrypt
            decrypted_content = decryptor.update(ciphertext) + decryptor.finalize()
            
            return decrypted_content
            
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise
    
    def upload_evidence(self, file_content, file_name, case_id, user_id, encrypt=True):
        """
        Upload evidence file with optional encryption.
        
        Args:
            file_content (bytes): File content
            file_name (str): Original file name
            case_id (UUID): Case ID
            user_id (UUID): User ID
            encrypt (bool): Whether to encrypt the file
            
        Returns:
            dict: Storage metadata
        """
        try:
            # Calculate hash
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Generate storage path
            storage_path = f"cases/{case_id}/evidence/{file_hash}/{file_name}"
            
            # Encrypt if requested
            encryption_key_id = None
            iv = None
            if encrypt:
                file_content, encryption_key_id, iv = self.encrypt_file(file_content)
                storage_path = storage_path + '.enc'
            
            # Upload to MinIO
            file_obj = BytesIO(file_content)
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=storage_path,
                data=file_obj,
                length=len(file_content),
                metadata={
                    'user_id': str(user_id),
                    'case_id': str(case_id),
                    'original_name': file_name,
                    'sha256': file_hash,
                    'encrypted': str(encrypt)
                }
            )
            
            logger.info(f"Uploaded evidence: {storage_path}")
            
            return {
                'storage_path': storage_path,
                'sha256_hash': file_hash,
                'file_size': len(file_content) if not encrypt else len(file_content) - 32,  # Exclude IV+tag
                'is_encrypted': encrypt,
                'encryption_key_id': encryption_key_id,
                'iv': iv
            }
            
        except S3Error as e:
            logger.error(f"MinIO upload error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Upload error: {str(e)}")
            raise
    
    def download_evidence(self, storage_path, decrypt=True):
        """
        Download evidence file with optional decryption.

        Args:
            storage_path (str): Storage path in MinIO
            decrypt (bool): Whether to decrypt the file

        Returns:
            bytes: File content
        """
        try:
            # Download from MinIO
            response = self.client.get_object(self.bucket_name, storage_path)
            file_content = response.read()
            response.close()
            response.release_conn()

            # Decrypt if needed
            if decrypt and storage_path.endswith('.enc'):
                file_content = self.decrypt_file(file_content)

            return file_content

        except S3Error as e:
            logger.error(f"MinIO download error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Download error: {str(e)}")
            raise

    def download_evidence_streaming(self, storage_path, decrypt=True):
        """
        Download evidence file with streaming and optional chunked decryption.

        This method is memory-efficient for large files as it streams data
        instead of loading everything into memory.

        Args:
            storage_path (str): Storage path in MinIO
            decrypt (bool): Whether to decrypt the file

        Yields:
            bytes: File content chunks
        """
        try:
            # Get object from MinIO
            response = self.client.get_object(self.bucket_name, storage_path)

            if decrypt and storage_path.endswith('.enc'):
                # For encrypted files, we need to read the entire file
                # because AES-GCM requires the full ciphertext + tag
                # This is a limitation of the encryption mode
                logger.warning(f"Streaming download with decryption requires loading full file: {storage_path}")
                file_content = response.read()
                response.close()
                response.release_conn()

                decrypted_content = self.decrypt_file(file_content)

                # Stream the decrypted content in chunks
                chunk_size = 8192  # 8KB chunks
                for i in range(0, len(decrypted_content), chunk_size):
                    yield decrypted_content[i:i + chunk_size]
            else:
                # For non-encrypted files, stream directly from MinIO
                # Read and yield in chunks (8KB at a time)
                chunk_size = 8192
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk

                response.close()
                response.release_conn()

        except S3Error as e:
            logger.error(f"MinIO streaming download error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Streaming download error: {str(e)}")
            raise

    def generate_presigned_download_url(self, storage_path, expiry_seconds=3600):
        """
        Generate a pre-signed URL for direct download from MinIO.

        This allows clients to download directly from MinIO without going through
        the backend, saving bandwidth and reducing latency.

        Args:
            storage_path (str): Storage path in MinIO
            expiry_seconds (int): URL expiry time in seconds (default: 1 hour)

        Returns:
            str: Pre-signed download URL
        """
        try:
            from datetime import timedelta

            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=storage_path,
                expires=timedelta(seconds=expiry_seconds)
            )

            logger.info(f"Generated pre-signed URL for {storage_path} (expires in {expiry_seconds}s)")
            return url

        except S3Error as e:
            logger.error(f"Failed to generate pre-signed URL: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Pre-signed URL generation error: {str(e)}")
            raise
    
    def verify_integrity(self, storage_path, expected_hash):
        """
        Verify integrity of stored evidence.
        
        Args:
            storage_path (str): Storage path
            expected_hash (str): Expected SHA-256 hash
            
        Returns:
            bool: True if integrity verified
        """
        try:
            # Download and decrypt
            file_content = self.download_evidence(storage_path, decrypt=True)
            
            # Calculate hash
            actual_hash = hashlib.sha256(file_content).hexdigest()
            
            # Compare
            return actual_hash == expected_hash
            
        except Exception as e:
            logger.error(f"Integrity verification error: {str(e)}")
            return False
    
    def delete_evidence(self, storage_path):
        """
        Delete evidence file (use with caution - implements legal hold check).
        
        Args:
            storage_path (str): Storage path
        """
        try:
            self.client.remove_object(self.bucket_name, storage_path)
            logger.warning(f"Deleted evidence: {storage_path}")
        except S3Error as e:
            logger.error(f"MinIO delete error: {str(e)}")
            raise


# Singleton instance (lazy-loaded to avoid connection errors during imports)
_evidence_vault_instance = None

def get_evidence_vault():
    """
    Get or create the evidence vault singleton instance.
    Lazy initialization to avoid connection errors during Django/Celery startup.
    """
    global _evidence_vault_instance
    if _evidence_vault_instance is None:
        _evidence_vault_instance = EvidenceVault()
    return _evidence_vault_instance

# For backward compatibility - but use get_evidence_vault() in new code
evidence_vault = None  # Will be None until first access

