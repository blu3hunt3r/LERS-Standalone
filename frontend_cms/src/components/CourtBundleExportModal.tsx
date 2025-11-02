import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Download, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'react-toastify'

interface CourtBundleExportModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  onSubmit: (exportConfig: any) => Promise<string> // Returns download URL
}

export default function CourtBundleExportModal({
  isOpen,
  onClose,
  caseId,
  onSubmit
}: CourtBundleExportModalProps) {
  const [exportType, setExportType] = useState<'pdf' | 'zip'>('pdf')
  const [selectedItems, setSelectedItems] = useState({
    fir_copy: true,
    evidence_files: true,
    entity_list: true,
    timeline: true,
    lers_requests: true,
    lers_responses: true,
    cross_case_links: false,
    audit_trail: true,
    chain_of_custody: true,
  })
  const [isExporting, setIsExporting] = useState(false)
  const [estimatedSize, setEstimatedSize] = useState('0 MB')

  useEffect(() => {
    // Calculate estimated size based on selected items
    const itemSizes: Record<string, number> = {
      fir_copy: 0.5,
      evidence_files: 15.2,
      entity_list: 0.1,
      timeline: 0.2,
      lers_requests: 1.5,
      lers_responses: 8.7,
      cross_case_links: 0.3,
      audit_trail: 0.5,
      chain_of_custody: 0.3,
    }

    const totalSize = Object.entries(selectedItems)
      .filter(([_, included]) => included)
      .reduce((sum, [key]) => sum + (itemSizes[key] || 0), 0)

    setEstimatedSize(`${totalSize.toFixed(1)} MB`)
  }, [selectedItems])

  const handleItemToggle = (item: keyof typeof selectedItems) => {
    setSelectedItems(prev => ({ ...prev, [item]: !prev[item] }))
  }

  const handleExport = async () => {
    const selectedCount = Object.values(selectedItems).filter(Boolean).length
    if (selectedCount === 0) {
      toast.error('Please select at least one item to export')
      return
    }

    setIsExporting(true)
    try {
      const downloadUrl = await onSubmit({
        case_id: caseId,
        export_type: exportType,
        items: selectedItems,
        include_manifest: true,
        include_checksums: true
      })

      // Trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `case_${caseId}_court_bundle_${Date.now()}.${exportType}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Court bundle exported successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to export court bundle')
    } finally {
      setIsExporting(false)
    }
  }

  const items = [
    { key: 'fir_copy', label: 'FIR Copy', mandatory: true },
    { key: 'evidence_files', label: 'All Evidence Files', mandatory: false },
    { key: 'entity_list', label: 'Entity List (Suspects, Victims, Witnesses)', mandatory: true },
    { key: 'timeline', label: 'Investigation Timeline', mandatory: false },
    { key: 'lers_requests', label: 'LERS Requests (All)', mandatory: false },
    { key: 'lers_responses', label: 'LERS Responses (Parsed)', mandatory: false },
    { key: 'cross_case_links', label: 'Cross-Case Links (Privacy Masked)', mandatory: false },
    { key: 'audit_trail', label: 'Complete Audit Trail', mandatory: true },
    { key: 'chain_of_custody', label: 'Chain of Custody Records', mandatory: true },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            Export Court-Ready Bundle
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Export Type */}
          <div className="space-y-2">
            <Label htmlFor="export-type">Export Format</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as 'pdf' | 'zip')}>
              <SelectTrigger id="export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">Single PDF (Recommended for Court)</SelectItem>
                <SelectItem value="zip">ZIP Archive (All Files Separate)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-slate-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900 font-medium mb-1">Court-Ready Export</p>
                <p className="text-slate-800 text-xs">
                  This export includes SHA-256 checksums, digital signatures, and a manifest file 
                  for court submission. All PII is included (not masked).
                </p>
              </div>
            </div>
          </div>

          {/* Items to Include */}
          <div className="space-y-3">
            <Label>Items to Include</Label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      id={item.key}
                      checked={selectedItems[item.key as keyof typeof selectedItems]}
                      onCheckedChange={() => handleItemToggle(item.key as keyof typeof selectedItems)}
                      disabled={item.mandatory}
                    />
                    <Label 
                      htmlFor={item.key} 
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {item.label}
                    </Label>
                  </div>
                  {item.mandatory && (
                    <span className="text-xs text-orange-600 font-medium">Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
            <span className="text-gray-700">
              <strong>{Object.values(selectedItems).filter(Boolean).length}</strong> items selected
            </span>
            <span className="text-gray-700">
              Estimated size: <strong>{estimatedSize}</strong>
            </span>
          </div>

          {/* Verification Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-900 font-medium mb-1">Verification Included</p>
                <ul className="text-green-800 text-xs space-y-0.5">
                  <li>• SHA-256 checksums for all files</li>
                  <li>• Digital signature from case officer</li>
                  <li>• Manifest with file listing and metadata</li>
                  <li>• Tamper-evident packaging</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || Object.values(selectedItems).filter(Boolean).length === 0}
            className="bg-slate-700 hover:bg-slate-800"
          >
            {isExporting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating Bundle...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Bundle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

