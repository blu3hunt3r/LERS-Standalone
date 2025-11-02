import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Send, CheckCircle, AlertCircle, Clock, Building, FileText,
  Loader2, Shield, Calendar
} from 'lucide-react'
import { toast } from 'react-toastify'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { lersService } from '@/services/lersService'
import { formatDate } from '@/lib/utils'

interface SmartLERSRequestModalProps {
  open: boolean
  onClose: () => void
  entityData: {
    entity_id: string
    entity_hash: string
    entity_type: string
    entity_value: string
    case_id: string
  }
  smartAction: {
    provider_id: string
    provider_name: string
    request_type: string
    display_name: string
    description: string
    integration_type: string
    sla_hours: number
    sla_display: string
    expected_format: string
    auto_fillable: boolean
    icon: string
    required_documents: string[]
  }
}

export default function SmartLERSRequestModal({
  open,
  onClose,
  entityData,
  smartAction
}: SmartLERSRequestModalProps) {
  const queryClient = useQueryClient()
  const [prefilledData, setPrefilledData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
    end: new Date().toISOString().split('T')[0] // today
  })

  // Fetch pre-filled data when modal opens
  useEffect(() => {
    if (open && entityData && smartAction) {
      fetchPrefilledData()
    }
  }, [open, entityData, smartAction])

  const fetchPrefilledData = async () => {
    setLoading(true)
    try {
      const data = await lersService.smartCreateFromEntity({
        entity_hash: entityData.entity_hash,
        entity_type: entityData.entity_type,
        case_id: entityData.case_id,
        request_type: smartAction.request_type,
        provider_id: smartAction.provider_id
      })
      setPrefilledData(data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load request data')
    } finally {
      setLoading(false)
    }
  }

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      // Create the actual LERS request
      return lersService.createRequest({
        case: entityData.case_id,
        provider: smartAction.provider_name,
        request_type: smartAction.request_type,
        description: `${smartAction.description}\n\nDate Range: ${dateRange.start} to ${dateRange.end}\n\n${additionalNotes}`,
        priority: prefilledData?.priority || 'MEDIUM',
        legal_mandate: prefilledData?.legal_mandate || `Court Order for Case #${prefilledData?.case_number}`,
        data_requested: {
          entity_hash: entityData.entity_hash,
          entity_type: entityData.entity_type,
          date_range: dateRange,
          request_type: smartAction.request_type
        }
      })
    },
    onSuccess: (data) => {
      toast.success(
        `✅ Request sent to ${smartAction.provider_name}! Expected response: ${smartAction.sla_display}`,
        { autoClose: 5000 }
      )
      queryClient.invalidateQueries({ queryKey: ['lersRequestsForCase', entityData.case_id] })
      queryClient.invalidateQueries({ queryKey: ['lersRequests'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create request')
    }
  })

  const handleSubmit = () => {
    if (!prefilledData?.can_send) {
      toast.error('Cannot send request - missing required documents')
      return
    }
    createRequestMutation.mutate()
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{smartAction.icon}</span>
            {smartAction.display_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-slate-700 mb-4" />
            <p className="text-gray-600">Preparing request...</p>
          </div>
        ) : prefilledData ? (
          <div className="space-y-4 py-4">
            {/* Provider Info Card */}
            <Card className="border-l-4 border-slate-700 bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5 text-slate-700" />
                  Provider Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-600">Provider</p>
                    <p className="font-semibold">{prefilledData.provider}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Integration Type</p>
                    <Badge variant="outline" className="mt-1">
                      {smartAction.icon} {prefilledData.integration_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">SLA</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold">{smartAction.sla_display}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600">Expected Format</p>
                    <Badge variant="secondary" className="mt-1">
                      {prefilledData.expected_format}
                    </Badge>
                  </div>
                </div>
                {prefilledData.provider_info?.contact_email && (
                  <p className="text-xs text-gray-600 mt-2">
                    Contact: {prefilledData.provider_info.contact_email}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Case Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                  Case Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-600">Case Number</p>
                    <p className="font-semibold">{prefilledData.case_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">FIR Number</p>
                    <p className="font-semibold">{prefilledData.fir_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Priority</p>
                    <Badge className={
                      prefilledData.priority === 'CRITICAL' ? 'bg-red-500' :
                      prefilledData.priority === 'HIGH' ? 'bg-orange-500' :
                      prefilledData.priority === 'MEDIUM' ? 'bg-slate-600' : 'bg-gray-500'
                    }>
                      {prefilledData.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">Entity Type</p>
                    <Badge variant="outline">{entityData.entity_type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Checklist */}
            <Card className={prefilledData.can_send ? 'border-l-4 border-green-600' : 'border-l-4 border-orange-600'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Compliance Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prefilledData.compliance && prefilledData.compliance.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    {item.met ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.met ? 'text-green-700' : 'text-orange-700'}`}>
                        {item.requirement}
                      </p>
                      <p className="text-xs text-gray-600">{item.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Date Range Picker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-700" />
                  Date Range (Auto-set to 6 months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Additional Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any specific requirements or notes for this request..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {prefilledData.can_send ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Ready to send
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    Missing required documents
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={createRequestMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-slate-700 hover:bg-slate-800"
                  onClick={handleSubmit}
                  disabled={!prefilledData.can_send || createRequestMutation.isPending}
                >
                  {createRequestMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Expected Timeline */}
            {prefilledData.can_send && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm text-slate-800">
                  <strong>Expected Response:</strong> {smartAction.sla_display} (by {formatDate(prefilledData.sla_due_date)})
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Failed to load request data
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

