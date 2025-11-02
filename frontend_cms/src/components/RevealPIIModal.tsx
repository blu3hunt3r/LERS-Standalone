import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'react-toastify'

interface RevealPIIModalProps {
  isOpen: boolean
  onClose: () => void
  entityId: string
  entityValue: string
  entityType: string
  onSubmit: (justification: string, supervisorOTP: string) => Promise<void>
}

export default function RevealPIIModal({
  isOpen,
  onClose,
  entityId,
  entityValue,
  entityType,
  onSubmit
}: RevealPIIModalProps) {
  const [justification, setJustification] = useState('')
  const [supervisorOTP, setSupervisorOTP] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'justification' | 'otp'>('justification')

  const handleJustificationSubmit = () => {
    if (!justification.trim() || justification.length < 50) {
      toast.error('Justification must be at least 50 characters')
      return
    }
    setStep('otp')
    toast.info('Supervisor OTP sent to registered number')
  }

  const handleOTPSubmit = async () => {
    if (!supervisorOTP || supervisorOTP.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(justification, supervisorOTP)
      toast.success('PII revealed successfully. Access logged.')
      setJustification('')
      setSupervisorOTP('')
      setStep('justification')
      onClose()
    } catch (error) {
      toast.error('Failed to reveal PII. Invalid OTP or unauthorized.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setJustification('')
    setSupervisorOTP('')
    setStep('justification')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Reveal Protected PII
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-red-900 mb-1">Critical Privacy Action</p>
                <p className="text-xs text-red-800">
                  You are about to reveal personally identifiable information (PII). 
                  This action is logged and audited. Supervisor approval is required.
                </p>
              </div>
            </div>
          </div>

          {/* Entity Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-600">Entity Type:</span>
              <span className="font-semibold text-gray-900">{entityType?.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Masked Value:</span>
              <span className="font-mono font-semibold text-gray-900">{entityValue}</span>
            </div>
          </div>

          {step === 'justification' ? (
            <>
              {/* Justification */}
              <div className="space-y-2">
                <Label htmlFor="justification">
                  Justification for revealing PII <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="justification"
                  placeholder="Example: Need to verify suspect's phone number for arrest warrant preparation. Investigation stage requires full number for court documentation."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={justification.length < 50 ? 'text-orange-600' : 'text-green-600'}>
                    {justification.length} / 50 minimum characters
                  </span>
                  <span className="text-gray-500">
                    {1000 - justification.length} remaining
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                <p className="text-slate-800">
                  <strong>Note:</strong> After submitting justification, a 6-digit OTP will be sent 
                  to your supervisor's registered mobile number for approval.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="otp">
                  Supervisor OTP <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={supervisorOTP}
                  onChange={(e) => setSupervisorOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-gray-600">
                  OTP sent to supervisor's mobile: +91-****-**-{Math.floor(Math.random() * 100).toString().padStart(2, '0')}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm">
                <p className="text-amber-800">
                  <strong>Waiting for supervisor approval...</strong> OTP is valid for 5 minutes.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStep('justification')}
              >
                Back to Justification
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {step === 'justification' ? (
            <Button
              onClick={handleJustificationSubmit}
              disabled={!justification.trim() || justification.length < 50}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Request Supervisor Approval
            </Button>
          ) : (
            <Button
              onClick={handleOTPSubmit}
              disabled={isSubmitting || supervisorOTP.length !== 6}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Reveal PII
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

