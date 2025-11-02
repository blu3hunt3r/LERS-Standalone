import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { toast } from 'react-toastify'

interface EscalateRequestModalProps {
  isOpen: boolean
  onClose: () => void
  lersRequestId: string
  provider: string
  onSubmit: (reason: string, escalationLevel: string) => Promise<void>
}

export default function EscalateRequestModal({
  isOpen,
  onClose,
  lersRequestId,
  provider,
  onSubmit
}: EscalateRequestModalProps) {
  const [reason, setReason] = useState('')
  const [escalationLevel, setEscalationLevel] = useState('SUPERVISOR')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for escalation')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(reason, escalationLevel)
      toast.success(`Request escalated to ${escalationLevel}`)
      setReason('')
      setEscalationLevel('SUPERVISOR')
      onClose()
    } catch (error) {
      toast.error('Failed to escalate request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Escalate Request to {provider}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <p className="text-red-800">
              <strong>Warning:</strong> Escalation will notify senior officials and may impact 
              provider relationships. Use only when necessary.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalation-level">Escalation Level</Label>
            <Select value={escalationLevel} onValueChange={setEscalationLevel}>
              <SelectTrigger id="escalation-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="NODAL_OFFICER">Nodal Officer</SelectItem>
                <SelectItem value="SENIOR_MANAGEMENT">Senior Management</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Escalation</Label>
            <Textarea
              id="reason"
              placeholder="Example: SLA breached by 48 hours with no response. Critical case with ₹10L fraud. Immediate action required."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {reason.length} / 1000 characters
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
            disabled={isSubmitting || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Escalating...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Escalate Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

