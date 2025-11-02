import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { lersService } from '../services/lersService'
import { caseService } from '../services/caseService'
import { toast } from 'react-toastify'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Building2, ArrowLeft, Send, Loader2, Info } from 'lucide-react'

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
]

export default function CreateLERSRequestPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<any>({
    case_id: '',
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

  // Fetch available cases
  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => caseService.getCases({ limit: 100 })
  })

  // Fetch all providers
  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => lersService.getProviders()
  })

  const createMutation = useMutation({
    mutationFn: lersService.createRequest,
    onSuccess: (data) => {
      toast.success('LERS Request created successfully! 🎉')
      navigate(`/lers/requests/${data.id}`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to create request'
      toast.error(message)
      console.error('Create LERS request error:', error)
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
      case: formData.case_id,
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

    console.log('Submitting LERS request:', submitData)
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

  if (providersLoading || casesLoading) {
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
              <h1 className="text-2xl font-medium text-gray-900">Create LERS Request</h1>
              <p className="text-sm text-gray-600 mt-1">Submit a new legal data request to service providers</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
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
                <p className="text-xs text-gray-500 mt-1">
                  Choose the case for which you need data from the provider
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Provider Selection */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-700" /> Service Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Provider <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {providersData?.providers.map((provider: any) => (
                    <button
                      key={provider.provider_id}
                      type="button"
                      onClick={() => handleProviderChange(provider.provider_id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.provider_id === provider.provider_id
                          ? 'border-slate-500 bg-slate-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">{provider.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {provider.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Request Type Selection (Capabilities) */}
              {selectedProvider && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedProvider.capabilities.map((capability: any) => (
                      <button
                        key={capability.request_type}
                        type="button"
                        onClick={() => handleCapabilityChange(capability.request_type)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          formData.request_type === capability.request_type
                            ? 'border-slate-500 bg-slate-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium block mb-1">{capability.display_name}</span>
                            <p className="text-xs text-gray-500">{capability.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs mb-1">
                              SLA: {capability.sla_hours}h
                            </Badge>
                            <p className="text-xs text-gray-500">{capability.typical_response_format}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isLoading || !formData.case_id || !formData.provider_id || !formData.request_type}
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
                  Create LERS Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

