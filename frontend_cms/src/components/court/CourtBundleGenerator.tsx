import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

interface EvidenceItem {
  id: string
  name: string
  type: string
  uploaded_at: string
  size: number
  included: boolean
}

interface CourtBundleGeneratorProps {
  caseId: string
  caseNumber: string
  evidenceFiles: EvidenceItem[]
  onGenerate: (selectedFiles: string[], options: BundleOptions) => void
}

interface BundleOptions {
  include_timeline: boolean
  include_participants: boolean
  include_audit_log: boolean
  include_chain_of_custody: boolean
  include_65b_certificate: boolean
  digital_signature: boolean
  password_protect: boolean
  format: 'PDF' | 'ZIP'
}

export const CourtBundleGenerator: React.FC<CourtBundleGeneratorProps> = ({
  caseId,
  caseNumber,
  evidenceFiles,
  onGenerate
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(evidenceFiles.map(f => f.id))
  )
  
  const [options, setOptions] = useState<BundleOptions>({
    include_timeline: true,
    include_participants: true,
    include_audit_log: true,
    include_chain_of_custody: true,
    include_65b_certificate: true,
    digital_signature: true,
    password_protect: false,
    format: 'ZIP'
  })

  const [generating, setGenerating] = useState(false)

  const toggleFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const toggleAll = () => {
    if (selectedFiles.size === evidenceFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(evidenceFiles.map(f => f.id)))
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerate(Array.from(selectedFiles), options)
    } finally {
      setGenerating(false)
    }
  }

  const totalSize = evidenceFiles
    .filter(f => selectedFiles.has(f.id))
    .reduce((sum, f) => sum + f.size, 0)

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📦</span>
            <span>Generate Court Bundle</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-700">{evidenceFiles.length}</p>
              <p className="text-sm text-gray-600">Total Files</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{selectedFiles.size}</p>
              <p className="text-sm text-gray-600">Selected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">{formatSize(totalSize)}</p>
              <p className="text-sm text-gray-600">Bundle Size</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Evidence Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Select Evidence</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {selectedFiles.size === evidenceFiles.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {evidenceFiles.map(file => (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all',
                    selectedFiles.has(file.id)
                      ? 'border-primary bg-slate-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => toggleFile(file.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFile(file.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatSize(file.size)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bundle Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bundle Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Include Options */}
            <div>
              <p className="font-medium text-sm mb-2">Include in Bundle:</p>
              <div className="space-y-2">
                {[
                  { key: 'include_timeline', label: 'Case Timeline', icon: '📅' },
                  { key: 'include_participants', label: 'Participants List', icon: '👥' },
                  { key: 'include_audit_log', label: 'Audit Log', icon: '📋' },
                  { key: 'include_chain_of_custody', label: 'Chain of Custody', icon: '🔐' },
                  { key: 'include_65b_certificate', label: 'Section 65B Certificate', icon: '📜' }
                ].map(option => (
                  <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options[option.key as keyof BundleOptions] as boolean}
                      onChange={(e) => setOptions({
                        ...options,
                        [option.key]: e.target.checked
                      })}
                    />
                    <span className="text-sm">
                      {option.icon} {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Security Options */}
            <div className="border-t pt-4">
              <p className="font-medium text-sm mb-2">Security:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.digital_signature}
                    onChange={(e) => setOptions({
                      ...options,
                      digital_signature: e.target.checked
                    })}
                  />
                  <span className="text-sm">✍️ Digital Signature</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.password_protect}
                    onChange={(e) => setOptions({
                      ...options,
                      password_protect: e.target.checked
                    })}
                  />
                  <span className="text-sm">🔒 Password Protect</span>
                </label>
              </div>
            </div>

            {/* Format Selection */}
            <div className="border-t pt-4">
              <p className="font-medium text-sm mb-2">Export Format:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOptions({ ...options, format: 'PDF' })}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                    options.format === 'PDF'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => setOptions({ ...options, format: 'ZIP' })}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                    options.format === 'ZIP'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  📦 ZIP
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview & Generate */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Ready to Generate</h3>
              <p className="text-sm text-gray-600 mt-1">
                Bundle will include {selectedFiles.size} evidence file(s) and {
                  Object.values(options).filter((v, i) => i < 5 && v).length
                } additional document(s)
              </p>
              <div className="flex gap-2 mt-2">
                {options.digital_signature && (
                  <Badge variant="success" className="text-xs">✍️ Digitally Signed</Badge>
                )}
                {options.password_protect && (
                  <Badge variant="warning" className="text-xs">🔒 Password Protected</Badge>
                )}
                {options.include_65b_certificate && (
                  <Badge variant="info" className="text-xs">📜 Section 65B Compliant</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg">
                Preview
              </Button>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={selectedFiles.size === 0 || generating}
              >
                {generating ? (
                  <>
                    <span className="animate-spin mr-2">⚙️</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📦</span>
                    Generate Bundle
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Disclaimer */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <span className="text-2xl">⚖️</span>
            <div className="text-sm">
              <p className="font-semibold text-yellow-900 mb-1">Legal Notice</p>
              <p className="text-yellow-800">
                This court bundle is generated for official legal proceedings under Indian Evidence Act.
                Ensure all evidence is authentic and chain of custody is maintained. Digital signatures
                and Section 65B certificates are generated automatically for compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

