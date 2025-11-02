import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Merge, Search, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import entityService from '@/services/entityService'

interface MergeEntitiesModalProps {
  isOpen: boolean
  onClose: () => void
  sourceEntity: any
  onSubmit: (sourceId: string, targetId: string, reason: string) => Promise<void>
}

export default function MergeEntitiesModal({
  isOpen,
  onClose,
  sourceEntity,
  onSubmit
}: MergeEntitiesModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [reason, setReason] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && sourceEntity) {
      // Pre-fill search with source entity value
      setSearchQuery(sourceEntity.normalized_value || '')
      handleSearch(sourceEntity.normalized_value || '')
    } else {
      resetForm()
    }
  }, [isOpen, sourceEntity])

  const resetForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedTarget(null)
    setReason('')
    setIsSearching(false)
    setIsSubmitting(false)
  }

  const handleSearch = async (query: string) => {
    if (!query || query.length < 3) {
      toast.error('Search query must be at least 3 characters')
      return
    }

    setIsSearching(true)
    try {
      const results = await entityService.searchEntities({
        query,
        entity_type: sourceEntity?.entity_type,
        exclude_id: sourceEntity?.id
      })
      setSearchResults(results)
      if (results.length === 0) {
        toast.info('No matching entities found')
      }
    } catch (error) {
      toast.error('Failed to search entities')
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTarget) {
      toast.error('Please select a target entity to merge with')
      return
    }
    if (!reason || reason.length < 20) {
      toast.error('Merge reason must be at least 20 characters')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(sourceEntity.id, selectedTarget.id, reason)
      toast.success('Entities merged successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to merge entities')
      console.error('Merge error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!sourceEntity) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Merge className="h-6 w-6" />
            Merge Duplicate Entities
          </DialogTitle>
          <DialogDescription>
            Merge this entity with a duplicate to consolidate all references and evidence.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Source Entity */}
          <div className="bg-slate-50 border-l-4 border-slate-700 p-3 rounded">
            <p className="text-xs font-semibold text-gray-600 mb-1">SOURCE ENTITY (will be merged into target)</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">{sourceEntity.display_value || sourceEntity.normalized_value}</p>
              <Badge variant="secondary">{sourceEntity.entity_type}</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1">Confidence: {Math.round(sourceEntity.confidence * 100)}%</p>
          </div>

          {/* Search for Target Entity */}
          <div className="grid gap-2">
            <Label htmlFor="search">Search for Target Entity to Merge Into</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                type="text"
                placeholder="Search by value, phone, email, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery)
                  }
                }}
                disabled={isSearching || isSubmitting}
              />
              <Button
                variant="outline"
                onClick={() => handleSearch(searchQuery)}
                disabled={isSearching || isSubmitting}
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              <Label>Select Target Entity:</Label>
              {searchResults.map((entity) => (
                <div
                  key={entity.id}
                  className={`p-3 border rounded cursor-pointer transition-all ${
                    selectedTarget?.id === entity.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTarget(entity)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-gray-900">{entity.display_value || entity.normalized_value}</p>
                    <Badge variant="secondary" className="text-xs">{entity.entity_type}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    Confidence: {Math.round(entity.confidence * 100)}% • 
                    {entity.verified ? ' Verified' : ' Unverified'} • 
                    Case: {entity.case?.case_number || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Merge Reason */}
          {selectedTarget && (
            <div className="grid gap-2">
              <Label htmlFor="reason">
                Reason for Merge (min 20 characters)
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., 'Same phone number, verified through CDR cross-reference. Different formatting only.'"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedTarget || isSubmitting}>
            {isSubmitting ? 'Merging...' : 'Merge Entities'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
