import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { lersService } from '../services/lersService'
import { caseService } from '../services/caseService'
import { toast } from 'react-toastify'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Building2, ArrowLeft, Send, X } from 'lucide-react'

const REQUEST_TYPES = [
  { value: 'BANK_TX_HISTORY', label: 'Bank Transaction History', icon: '💰', description: 'Bank transaction records and statements' },
  { value: 'BANK_ACCOUNT_DETAILS', label: 'Bank Account Details', icon: '🏦', description: 'Account holder information and KYC' },
  { value: 'CDR', label: 'Call Detail Records (CDR)', icon: '📞', description: 'Call records, SMS logs, tower data' },
  { value: 'SIM_DETAILS', label: 'SIM Card Details', icon: '📱', description: 'SIM registration and user details' },
  { value: 'UPI_TX', label: 'UPI Transaction History', icon: '💸', description: 'UPI payment history and details' },
  { value: 'WALLET_DETAILS', label: 'Wallet Details', icon: '👛', description: 'Digital wallet transactions and KYC' },
  { value: 'ECOMMERCE_ORDER', label: 'E-commerce Order Details', icon: '🛒', description: 'Orders, deliveries, seller data' },
  { value: 'SOCIAL_PROFILE', label: 'Social Media Profile', icon: '💬', description: 'Posts, messages, profile data' },
  { value: 'IP_LOGS', label: 'IP Access Logs', icon: '🌐', description: 'IP addresses, login history, session data' },
  { value: 'DEVICE_INFO', label: 'Device Information', icon: '📲', description: 'IMEI, device ID, hardware information' },
  { value: 'KYC_DOCUMENTS', label: 'KYC Documents', icon: '👤', description: 'User identification and verification documents' },
  { value: 'OTHER', label: 'Other', icon: '📋', description: 'Other data types' },
]

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
]

const PROVIDERS = [
  { value: 'phonepe', name: 'PhonePe', category: 'Payment' },
  { value: 'paytm', name: 'Paytm', category: 'Payment' },
  { value: 'googlepay', name: 'Google Pay', category: 'Payment' },
  { value: 'airtel', name: 'Airtel', category: 'Telecom' },
  { value: 'jio', name: 'Jio', category: 'Telecom' },
  { value: 'vodafone', name: 'Vodafone', category: 'Telecom' },
  { value: 'facebook', name: 'Facebook/Meta', category: 'Social' },
  { value: 'instagram', name: 'Instagram', category: 'Social' },
  { value: 'whatsapp', name: 'WhatsApp', category: 'Social' },
  { value: 'amazon', name: 'Amazon', category: 'E-commerce' },
  { value: 'flipkart', name: 'Flipkart', category: 'E-commerce' },
  { value: 'other', name: 'Other Provider', category: 'Other' },
]

export default function CreateLERSRequestPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    case_id: '',
    request_type: 'BANK_TX_HISTORY',
    priority: 'NORMAL',
    provider: 'PhonePe',
    description: '',
    legal_mandate_type: 'Section 91 CrPC',
    identifiers: {},
    date_range_from: '',
    date_range_to: '',
    notes: '',
  })

  // Fetch available cases
  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => caseService.getCases({ limit: 100 })
  })

  const createMutation = useMutation({
    mutationFn: lersService.createRequest,
    onSuccess: (data) => {
      toast.success('LERS Request created successfully! 🎉')
      navigate('/requests')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to create request'
      toast.error(message)
      console.error('Create LERS request error:', error)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData: any = {
      case: formData.case_id,
      request_type: formData.request_type,
      priority: formData.priority,
      provider: formData.provider,
      description: formData.description,
      legal_mandate_type: formData.legal_mandate_type,
      identifiers: formData.identifiers,
    }

    if (formData.date_range_from) {
      submitData.date_range_from = formData.date_range_from
    }
    if (formData.date_range_to) {
      submitData.date_range_to = formData.date_range_to
    }
    if (formData.notes) {
      submitData.notes = formData.notes
    }

    console.log('Submitting LERS request:', submitData)
    createMutation.mutate(submitData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const selectedRequestType = REQUEST_TYPES.find(t => t.value === formData.request_type)
  const selectedProvider = PROVIDERS.find(p => p.name === formData.provider)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 py-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-gray-900">Create LERS Request</h1>
              <p className="text-sm text-gray-600 mt-1">Submit a new legal data request to service providers</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Requests
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Case Selection */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <span className="text-slate-700">📁</span> Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Case <span className="text-red-500">*</span>
                </label>
                {casesLoading ? (
                  <div className="text-sm text-gray-500">Loading cases...</div>
                ) : (
                  <select
                    name="case_id"
                    required
                    value={formData.case_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a case...</option>
                    {casesData?.results.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Choose the case for which you need data from the provider
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Request Type & Provider */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <span className="text-slate-700">📋</span> Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {REQUEST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, request_type: type.value })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.request_type === type.value
                          ? 'border-slate-500 bg-slate-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Provider <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="provider"
                    required
                    value={formData.provider}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <optgroup label="Payment Providers">
                      {PROVIDERS.filter(p => p.category === 'Payment').map(p => (
                        <option key={p.value} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Telecom Providers">
                      {PROVIDERS.filter(p => p.category === 'Telecom').map(p => (
                        <option key={p.value} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Social Media">
                      {PROVIDERS.filter(p => p.category === 'Social').map(p => (
                        <option key={p.value} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="E-commerce">
                      {PROVIDERS.filter(p => p.category === 'E-commerce').map(p => (
                        <option key={p.value} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      {PROVIDERS.filter(p => p.category === 'Other').map(p => (
                        <option key={p.value} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITIES.map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: priority.value })}
                        className={`px-2 py-2 rounded-md text-xs font-medium transition-all border-2 ${
                          formData.priority === priority.value
                            ? priority.color
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Scope */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <span className="text-slate-700">🎯</span> Data Scope & Justification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Explain the purpose and necessity for this data request..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide detailed description as per investigation requirements
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Legal Mandate Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="legal_mandate_type"
                  required
                  value={formData.legal_mandate_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Section 91 CrPC">Section 91 CrPC</option>
                  <option value="Section 176 CrPC">Section 176 CrPC</option>
                  <option value="Section 102 CrPC">Section 102 CrPC</option>
                  <option value="Court Order">Court Order</option>
                  <option value="IT Act 2000">IT Act 2000</option>
                  <option value="Other">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the legal basis for this data request
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range From
                  </label>
                  <input
                    type="date"
                    name="date_range_from"
                    value={formData.date_range_from}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range To
                  </label>
                  <input
                    type="date"
                    name="date_range_to"
                    value={formData.date_range_to}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any additional notes or special instructions..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Add any special instructions or context
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Request Summary */}
          {formData.case_id && (
            <Card className="border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <span className="text-slate-700">📝</span> Request Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Data Type:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl">{selectedRequestType?.icon}</span>
                      <span className="font-medium">{selectedRequestType?.label}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-slate-700" />
                      <span className="font-medium">{selectedProvider?.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <div className="mt-1">
                      <Badge className={PRIORITIES.find(p => p.value === formData.priority)?.color}>
                        {formData.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">SLA:</span>
                    <div className="mt-1 font-medium">
                      {formData.priority === 'URGENT' ? '24 hours' : formData.priority === 'HIGH' ? '3 days' : '7 days'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Actions */}
          <Card className="border border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Request will be submitted for approval
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    You'll be notified once approved and sent to the provider
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/requests')}
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !formData.case_id}
                    className="min-w-32"
                    size="sm"
                  >
                    {createMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⚙️</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}

