import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { AlertCircle, Send } from 'lucide-react'
import { toast } from 'react-toastify'

interface RequestClarificationModalProps {
  isOpen: boolean
  onClose: () => void
  lersRequestId: string
  provider: string
  onSubmit: (clarification: string) => Promise<void>
}

export default function RequestClarificationModal({
  isOpen,
  onClose,
  lersRequestId,
  provider,
  onSubmit
}: RequestClarificationModalProps) {
  const [clarification, setClarification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!clarification.trim()) {
      toast.error('Please enter your clarification request')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(clarification)
      toast.success(`Clarification sent to ${provider}`)
      setClarification('')
      onClose()
    } catch (error) {
      toast.error('Failed to send clarification')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Request Clarification from {provider}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="text-orange-800">
              <strong>Note:</strong> Clarification requests may extend the SLA timeline. 
              Be specific about what information is missing or unclear.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clarification">What clarification do you need?</Label>
            <Textarea
              id="clarification"
              placeholder="Example: The CDR data is missing tower IDs for calls after 10 PM. Please provide complete tower information for all calls."
              value={clarification}
              onChange={(e) => setClarification(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {clarification.length} / 500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !clarification.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Clarification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

