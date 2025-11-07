import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lersService } from '../services/lersService'
import { caseService } from '../services/caseService'
import { toast } from 'react-toastify'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Building2, ArrowLeft, Send, Loader2, Info, FileText } from 'lucide-react'

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
]

export default function StandaloneLERSRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const prefilledFirNumber = searchParams.get('firNumber') || ''

  const [formData, setFormData] = useState<any>({
    fir_number: prefilledFirNumber, // FIR number as text input
    request_type: '',
    priority: 'NORMAL',
    provider: '',
    provider_id: '',
    description: '',
    legal_mandate_type: 'Section 91 CrPC',
    identifiers: {},
    date_range_from: '',
    date_range_to: '',
    notes: '',
    data_points: {}, // Provider-specific data points
  })

  const [selectedProvider, setSelectedProvider] = useState<any>(null)
  const [selectedCapability, setSelectedCapability] = useState<any>(null)
  const [isNewFIR, setIsNewFIR] = useState(!prefilledFirNumber) // If no prefilled FIR, show new option

  // Fetch existing FIRs (unique case numbers from existing requests)
  const { data: existingFIRs, isLoading: firsLoading } = useQuery({
    queryKey: ['lersRequests'],
    queryFn: () => lersService.getRequests(),
    select: (data) => {
      // Extract unique FIR numbers
      const uniqueFIRs = new Set<string>()
      data?.results?.forEach((request: any) => {
        if (request.case_number) {
          uniqueFIRs.add(request.case_number)
        }
      })
      return Array.from(uniqueFIRs).sort()
    }
  })

  // Fetch all providers
  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => lersService.getProviders()
  })

  const createMutation = useMutation({
    mutationFn: lersService.createRequest,
    onSuccess: (data) => {
      console.log('✅ Standalone LERS Request created:', data)
      toast.success(`LERS Request ${data.request_number || 'created'} successfully! 🎉`)

      // Invalidate LERS requests cache
      queryClient.invalidateQueries({ queryKey: ['lers-requests'] })
      if (formData.case_id) {
        queryClient.invalidateQueries({ queryKey: ['lers-requests', formData.case_id] })
      }

      // Navigate to the request detail page
      if (data.id) {
        navigate(`/lers/portal/requests/${data.id}`)
      } else {
        navigate('/lers/portal/requests')
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to create request'
      toast.error(message)
      console.error('Create standalone LERS request error:', error)
    }
  })

  const handleProviderChange = (providerId: string) => {
    const provider = providersData?.providers.find((p: any) => p.provider_id === providerId)
    setSelectedProvider(provider)
    setSelectedCapability(null)
    setFormData({
      ...formData,
      provider: provider?.name || '',
      provider_id: providerId,
      request_type: '',
      data_points: {}
    })
  }

  const handleCapabilityChange = (requestType: string) => {
    const capability = selectedProvider?.capabilities.find((c: any) => c.request_type === requestType)
    setSelectedCapability(capability)

    // Initialize data_points with default values
    const initialDataPoints: any = {}
    capability?.data_points.forEach((dp: any) => {
      if (dp.default_value) {
        initialDataPoints[dp.field_name] = dp.default_value
      }
    })

    setFormData({
      ...formData,
      request_type: requestType,
      data_points: initialDataPoints
    })
  }

  const handleDataPointChange = (fieldName: string, value: any) => {
    setFormData({
      ...formData,
      data_points: {
        ...formData.data_points,
        [fieldName]: value
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData: any = {
      fir_number: formData.fir_number,
      request_type: formData.request_type,
      priority: formData.priority,
      provider: formData.provider,
      description: formData.description,
      legal_mandate_type: formData.legal_mandate_type,
      identifiers: formData.data_points, // Map data_points to identifiers
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

    // Add provider-specific data points to metadata
    submitData.metadata = {
      provider_id: formData.provider_id,
      data_points: formData.data_points,
      capability_info: {
        sla_hours: selectedCapability?.sla_hours,
        integration_type: selectedCapability?.integration_type,
        required_documents: selectedCapability?.required_documents,
      }
    }

    console.log('Submitting standalone LERS request:', submitData)
    createMutation.mutate(submitData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const renderDataPointField = (dataPoint: any) => {
    const { field_name, display_name, required, field_type, description, help_text, validation_rule } = dataPoint

    switch (field_type) {
      case 'TEXT':
        return (
          <div key={field_name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {display_name} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required={required}
              value={formData.data_points[field_name] || ''}
              onChange={(e) => handleDataPointChange(field_name, e.target.value)}
              pattern={validation_rule || undefined}
              placeholder={help_text || ''}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        )

      case 'DATE':
        return (
          <div key={field_name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {display_name} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              required={required}
              value={formData.data_points[field_name] || ''}
              onChange={(e) => handleDataPointChange(field_name, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        )

      case 'DATE_RANGE':
        return (
          <div key={field_name} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                required={required}
                value={formData.date_range_from || ''}
                onChange={(e) => setFormData({ ...formData, date_range_from: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                required={required}
                value={formData.date_range_to || ''}
                onChange={(e) => setFormData({ ...formData, date_range_to: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {(description || help_text) && (
              <p className="text-xs text-gray-500 col-span-2">{description || help_text}</p>
            )}
          </div>
        )

      case 'NUMBER':
        return (
          <div key={field_name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {display_name} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              required={required}
              value={formData.data_points[field_name] || ''}
              onChange={(e) => handleDataPointChange(field_name, e.target.value)}
              placeholder={help_text || ''}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        )

      case 'BOOLEAN':
        return (
          <div key={field_name} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.data_points[field_name] === 'true' || formData.data_points[field_name] === true}
              onChange={(e) => handleDataPointChange(field_name, e.target.checked ? 'true' : 'false')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                {display_name}
              </label>
              {description && (
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (providersLoading || firsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 py-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 flex items-center gap-2">
                <FileText className="h-7 w-7 text-blue-600" />
                Create Standalone LERS Request
              </h1>
              <p className="text-sm text-gray-600 mt-1">Submit a legal data request independent of case investigations</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/lers/portal/requests')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Standalone LERS Request</h3>
              <p className="text-xs text-blue-800">
                This request is <strong>independent of any investigation or case</strong>. You can optionally link it to a case later,
                or keep it as a standalone request for general legal data inquiries.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* FIR Number - Required */}
          <Card className="border-2 border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <span className="text-slate-700">📁</span> FIR Information
                </CardTitle>
                {existingFIRs && existingFIRs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewFIR(!isNewFIR)
                      if (!isNewFIR) {
                        setFormData({ ...formData, fir_number: '' })
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isNewFIR ? 'Select existing FIR' : 'Create new FIR'}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FIR Number <span className="text-red-500">*</span>
                </label>

                {isNewFIR ? (
                  <>
                    <input
                      type="text"
                      name="fir_number"
                      required
                      value={formData.fir_number}
                      onChange={handleChange}
                      placeholder="e.g., FIR-2024-MUM-001"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a new FIR number
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      name="fir_number"
                      required
                      value={formData.fir_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select an existing FIR...</option>
                      {existingFIRs?.map((fir: string) => (
                        <option key={fir} value={fir}>
                          {fir}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select from existing FIRs to group this request
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Provider Selection - Dropdown */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-700" /> Service Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Provider <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.provider_id}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a service provider...</option>
                  {/* Group by category */}
                  <optgroup label="Banks">
                    {providersData?.providers.filter((p: any) => p.category === 'BANK').map((provider: any) => (
                      <option key={provider.provider_id} value={provider.provider_id}>
                        {provider.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Telecom">
                    {providersData?.providers.filter((p: any) => p.category === 'TELECOM').map((provider: any) => (
                      <option key={provider.provider_id} value={provider.provider_id}>
                        {provider.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Payment Providers">
                    {providersData?.providers.filter((p: any) => p.category === 'PAYMENT').map((provider: any) => (
                      <option key={provider.provider_id} value={provider.provider_id}>
                        {provider.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Social Media">
                    {providersData?.providers.filter((p: any) => p.category === 'SOCIAL_MEDIA').map((provider: any) => (
                      <option key={provider.provider_id} value={provider.provider_id}>
                        {provider.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the service provider from whom you need data
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Type Selection (Tiles) - Only shown after provider is selected */}
          {selectedProvider && (
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <span className="text-slate-700">📋</span> Available Data from {selectedProvider.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Data Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProvider.capabilities.map((capability: any) => (
                      <button
                        key={capability.request_type}
                        type="button"
                        onClick={() => handleCapabilityChange(capability.request_type)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.request_type === capability.request_type
                            ? 'border-slate-500 bg-slate-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900 block mb-1">
                              {capability.display_name}
                            </span>
                            <p className="text-xs text-gray-600">{capability.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            SLA: {capability.sla_hours}h
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {capability.typical_response_format}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            {capability.integration_type}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider-Specific Data Points */}
          {selectedCapability && selectedCapability.data_points.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-700" /> Provider-Specific Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedCapability.data_points.map((dataPoint: any) => renderDataPointField(dataPoint))}
              </CardContent>
            </Card>
          )}

          {/* Request Details */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <span className="text-slate-700">🎯</span> Request Details
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: priority.value })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all border-2 ${
                        formData.priority === priority.value
                          ? priority.color
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
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

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/lers/portal/requests')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isLoading || !formData.provider_id || !formData.request_type}
              className="bg-slate-700 hover:bg-slate-800 text-white"
            >
              {createMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Standalone Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
