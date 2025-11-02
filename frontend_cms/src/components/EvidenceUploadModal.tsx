/**
 * Evidence Upload Modal Component
 * Handles file upload with drag-drop, validation, and chain-of-custody metadata
 */
import { useState, useRef, DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload, X, File, FileText, Image, Video, FileArchive,
  AlertCircle, CheckCircle, Loader2
} from 'lucide-react'
import { toast } from 'react-toastify'

interface EvidenceUploadModalProps {
  caseId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'video/mp4',
  'video/quicktime',
  'application/zip',
  'application/x-zip-compressed',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const EvidenceUploadModal = ({ caseId, open, onClose, onSuccess }: EvidenceUploadModalProps) => {
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [collectedBy, setCollectedBy] = useState('')
  const [collectedDate, setCollectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-slate-700" />
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5 text-slate-700" />
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />
    if (fileType.includes('zip')) return <FileArchive className="h-5 w-5 text-yellow-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${formatFileSize(MAX_FILE_SIZE)}`
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'File type not supported'
    }
    
    return null
  }

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const validFiles: File[] = []
    
    fileArray.forEach(file => {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })
    
    setFiles(prev => [...prev, ...validFiles])
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    if (!purpose.trim()) {
      toast.error('Please specify the purpose of evidence')
      return
    }

    try {
      setUploading(true)

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('case', caseId)
        formData.append('evidence_type', 'DOCUMENT') // Default type
        formData.append('purpose', purpose)
        
        if (collectedBy) formData.append('collected_by', collectedBy)
        if (collectedDate) formData.append('collected_date', collectedDate)
        if (notes) formData.append('notes', notes)

        // Make API call
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/evidence/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }

      toast.success(`Successfully uploaded ${files.length} file(s)`)
      
      // Invalidate evidence query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['evidence', caseId] })
      
      // Reset form
      setFiles([])
      setPurpose('')
      setCollectedBy('')
      setCollectedDate('')
      setNotes('')
      
      if (onSuccess) {
        onSuccess()
      }
      
      onClose()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload evidence')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    if (!uploading) {
      setFiles([])
      setPurpose('')
      setCollectedBy('')
      setCollectedDate('')
      setNotes('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Evidence</DialogTitle>
          <DialogDescription>
            Upload evidence files for this case. All files will be hashed and logged for chain-of-custody.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-slate-500 bg-slate-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-700 hover:text-slate-800 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supported: PDF, Images (JPG, PNG), Videos (MP4), Excel, Word, ZIP
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              accept={ALLOWED_TYPES.join(',')}
            />
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Selected Files ({files.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 p-1 hover:bg-gray-100 rounded"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chain of Custody Metadata */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-900">Chain of Custody Information</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose / Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="e.g., Bank transaction evidence, WhatsApp chat screenshots"
                disabled={uploading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collected By
                </label>
                <input
                  type="text"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Officer name"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Date
                </label>
                <input
                  type="date"
                  value={collectedDate}
                  onChange={(e) => setCollectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={uploading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                rows={3}
                placeholder="Any additional information about this evidence..."
                disabled={uploading}
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-slate-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-800">
              <p className="font-medium mb-1">Security & Integrity</p>
              <p>
                All uploaded files will be automatically hashed (SHA-256) and stored securely.
                Chain-of-custody metadata will be logged for audit purposes.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="bg-slate-700 hover:bg-slate-800"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EvidenceUploadModal

