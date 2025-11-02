import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { caseService } from '../services/caseService'
import templateService, { CrimeTemplate } from '@/services/templateService'
import { toast } from 'react-toastify'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EvidenceTypeSelector } from '../components/evidence/EvidenceTypeSelector'
import type { EvidenceType } from '../constants/evidenceTypes'
import { AlertCircle, FileText, Scale, Lightbulb, CheckCircle, Loader2 } from 'lucide-react'

const CRIME_CATEGORIES = [
  // Financial Crimes
  { value: 'UPI_FRAUD', label: 'UPI/Payment Fraud', icon: '💳' },
  { value: 'ATM_CLONING', label: 'ATM Card Cloning/Skimming', icon: '🏧' },
  { value: 'BANKING_PHISHING', label: 'Online Banking Phishing', icon: '🎣' },
  { value: 'FAKE_BANKING_APP', label: 'Fake Banking Apps', icon: '📱' },
  { value: 'CARD_FRAUD', label: 'Credit/Debit Card Fraud', icon: '💳' },
  { value: 'LOAN_FRAUD', label: 'Loan Fraud', icon: '💰' },
  { value: 'FAKE_LOAN_APP', label: 'Fake Loan Apps', icon: '📱' },
  { value: 'INSURANCE_SCAM', label: 'Insurance Scam', icon: '🛡️' },
  { value: 'INVESTMENT_FRAUD', label: 'Investment Fraud', icon: '📈' },
  { value: 'CRYPTO_SCAM', label: 'Cryptocurrency Scam', icon: '₿' },
  { value: 'LOTTERY_SCAM', label: 'Lottery Scam', icon: '🎰' },
  
  // Telecom & Identity
  { value: 'SIM_SWAP', label: 'SIM Swap Fraud', icon: '📞' },
  { value: 'ACCOUNT_HACKING', label: 'Account Hacking', icon: '🔓' },
  { value: 'SIM_UPI_COMBINED', label: 'SIM Swap + UPI Drain', icon: '⚠️' },
  
  // E-commerce
  { value: 'ECOMMERCE_FRAUD', label: 'E-commerce Fraud', icon: '🛒' },
  { value: 'OLX_FRAUD', label: 'OLX/Classifieds Fraud', icon: '📋' },
  { value: 'FAKE_SELLER', label: 'Fake Seller Scam', icon: '🕵️' },
  
  // Job & Work Scams
  { value: 'JOB_FRAUD', label: 'Job Fraud', icon: '💼' },
  { value: 'TASK_FRAUD', label: 'Task/Commission Fraud', icon: '📊' },
  { value: 'WORK_FROM_HOME', label: 'Work-from-Home Scam', icon: '🏠' },
  
  // Relationship Scams
  { value: 'MATRIMONIAL_FRAUD', label: 'Matrimonial Fraud', icon: '💍' },
  { value: 'ROMANCE_SCAM', label: 'Romance Scam', icon: '❤️' },
  { value: 'CATFISHING', label: 'Catfishing', icon: '🎭' },
  { value: 'IMPERSONATION', label: 'Impersonation', icon: '👤' },
  
  // Social Media Crimes
  { value: 'CYBERBULLYING', label: 'Cyberbullying', icon: '😢' },
  { value: 'CYBERSTALKING', label: 'Cyberstalking', icon: '👁️' },
  { value: 'TROLLING', label: 'Trolling', icon: '💬' },
  { value: 'DEFAMATION', label: 'Defamation', icon: '📰' },
  { value: 'MORPHING', label: 'Photo/Video Morphing', icon: '🖼️' },
  { value: 'DEEPFAKE', label: 'Deepfake', icon: '🤖' },
  { value: 'FAKE_PROFILE', label: 'Fake Profile', icon: '🎭' },
  
  // Information Crimes
  { value: 'FAKE_NEWS', label: 'Fake News/Misinformation', icon: '📢' },
  { value: 'DOXING', label: 'Doxing', icon: '🔓' },
  
  // Technical Crimes
  { value: 'MALWARE', label: 'Malware Infection', icon: '🦠' },
  { value: 'RANSOMWARE', label: 'Ransomware Attack', icon: '🔒' },
  { value: 'MALWARE_SPREADING', label: 'Spreading Malware', icon: '☣️' },
  { value: 'SOCIAL_ENGINEERING', label: 'Social Engineering', icon: '🎯' },
  
  // Special Cases
  { value: 'ONLINE_GROOMING', label: 'Online Grooming', icon: '⚠️' },
  { value: 'CHILD_EXPLOITATION', label: 'Child Exploitation', icon: '🚨' },
  { value: 'PRIVACY_INVASION', label: 'Privacy Invasion', icon: '🔐' },
  { value: 'OTHER', label: 'Other Miscellaneous', icon: '📋' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-700' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export default function CreateCasePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    crime_category: 'UPI_FRAUD',
    priority: 'MEDIUM',
    fir_number: '',
    fir_date: '',
    financial_loss: '',
    victim_name: '',
    victim_contact: '',
  })

  const [selectedEvidenceType, setSelectedEvidenceType] = useState<EvidenceType | null>(null)
  const [showEvidenceSelector, setShowEvidenceSelector] = useState(false)
  const [template, setTemplate] = useState<CrimeTemplate | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({})
  
  // PDF Upload state
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null)
  const [parsingPDF, setParsingPDF] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [createWithGraph, setCreateWithGraph] = useState(false)
  const [selectedMaxLayer, setSelectedMaxLayer] = useState<number | null>(null)

  // Load template when category changes
  useEffect(() => {
    loadTemplate(formData.crime_category)
  }, [formData.crime_category])

  const loadTemplate = async (category: string) => {
    try {
      setLoadingTemplate(true)
      const templateData = await templateService.getTemplateByCategory(category)
      setTemplate(templateData)
      
      // Initialize dynamic fields with empty values
      if (templateData) {
        const fields: Record<string, any> = {}
        templateData.required_fields.forEach(field => {
          fields[field.field_name] = ''
        })
        templateData.optional_fields.forEach(field => {
          fields[field.field_name] = ''
        })
        setDynamicFields(fields)
      }
    } catch (error) {
      console.error('Failed to load template:', error)
    } finally {
      setLoadingTemplate(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: caseService.createCase,
    onSuccess: async (createdCase) => {
      toast.success('Case created successfully!')
      
      // If PDF was uploaded and parsed, create graph entities
      if (createWithGraph && parsedData && createdCase.id) {
        try {
          toast.info('Creating investigation graph...')
          
          // Upload PDF again with case_id to create entities
          const formData = new FormData()
          if (uploadedPDF) {
            formData.append('file', uploadedPDF)
            formData.append('case_id', createdCase.id)
            
            const response = await fetch('http://localhost:8000/api/v1/investigation/parse-complaint/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              },
              body: formData
            })
            
            if (response.ok) {
              const result = await response.json()
              toast.success(`✅ Investigation graph created with ${result.created_entities?.length || 0} entities!`)
              // Navigate to investigation tab
              navigate(`/cases/${createdCase.id}?tab=investigation`)
              return
            }
          }
        } catch (error) {
          console.error('Error creating graph:', error)
          toast.warning('Case created but graph creation failed. You can add entities manually.')
        }
      }
      
      navigate('/cases')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create case')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required template fields
    if (template) {
      const missingFields = template.required_fields.filter(
        field => !dynamicFields[field.field_name]
      )
      
      if (missingFields.length > 0) {
        toast.error(`Please fill required fields: ${missingFields.map(f => f.field_name).join(', ')}`)
        return
      }
    }

    const caseData = {
      ...formData,
      financial_loss: formData.financial_loss ? parseFloat(formData.financial_loss) : undefined,
      metadata: {
        ...dynamicFields,
        template_id: template?.id,
      }
    }

    createMutation.mutate(caseData)
  }

  const handlePDFUpload = async (file: File) => {
    console.log('📤 [CreateCase] Starting file upload:', file.name, 'Size:', file.size, 'bytes')
    setUploadedPDF(file)
    setParsingPDF(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('🌐 [CreateCase] Sending request to parse-complaint endpoint...')
      const startTime = Date.now()
      
      const response = await fetch('http://localhost:8000/api/v1/investigation/parse-complaint/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      })
      
      const elapsed = Date.now() - startTime
      console.log(`⏱️  [CreateCase] Request completed in ${elapsed}ms, Status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [CreateCase] Parse failed:', response.status, errorText)
        throw new Error('Failed to parse PDF')
      }
      
      console.log('📥 [CreateCase] Parsing response...')
      const data = await response.json()
      console.log('✅ [CreateCase] Parsed data received:', {
        hasComplaint: !!data.complaint,
        hasMetadata: !!data.metadata,
        nodeCount: data.graph?.nodes?.length || 0,
        edgeCount: data.graph?.edges?.length || 0,
        success: data.success
      })
      setParsedData(data)
      
      // Auto-populate form fields from parsed data
      if (data.complaint) {
        const complaint = data.complaint.complainant
        const metadata = data.complaint.metadata
        
        setFormData(prev => ({
          ...prev,
          title: metadata.sub_category || metadata.category || prev.title,
          description: `Acknowledgement No: ${metadata.acknowledgement_no || 'N/A'}\n\n` +
                      `Incident Date: ${metadata.incident_datetime || 'N/A'}\n\n` +
                      `Complaint details from 1930 portal`,
          victim_name: complaint.name || prev.victim_name,
          victim_contact: complaint.mobile || prev.victim_contact,
          financial_loss: metadata.total_amount_lost?.toString() || prev.financial_loss,
          fir_date: metadata.complaint_filed_date || prev.fir_date
        }))
        
        // Set dynamic fields
        setDynamicFields({
          acknowledgement_no: metadata.acknowledgement_no,
          incident_datetime: metadata.incident_datetime,
          victim_email: complaint.email,
          victim_address: `${complaint.house_no || ''} ${complaint.street || ''}`.trim(),
          victim_district: complaint.district,
          victim_state: complaint.state,
          total_transactions: data.graph?.edges?.length || 0,
          transaction_layers: Math.max(...(data.complaint.transactions?.map((t: any) => t.layer) || [0]))
        })
      }
      
      const nodeCount = data.graph?.nodes?.length || 0
      const edgeCount = data.graph?.edges?.length || 0
      console.log(`✅ [CreateCase] Parse successful! Nodes: ${nodeCount}, Edges: ${edgeCount}`)
      toast.success(`✅ File parsed successfully! Found ${nodeCount} entities and ${edgeCount} transactions`)
      setCreateWithGraph(true)
      
    } catch (error: any) {
      console.error('❌ [CreateCase] PDF parsing error:', error)
      toast.error('Failed to parse file: ' + error.message)
      setUploadedPDF(null)
      setParsedData(null)
    } finally {
      console.log('🏁 [CreateCase] handlePDFUpload completed')
      setParsingPDF(false)
    }
  }

  const handleQuickImport = async () => {
    console.log('🚀 [CreateCase] Starting Quick Import...')
    
    if (!parsedData || !uploadedPDF) {
      console.error('❌ [CreateCase] Missing data:', { hasParsedData: !!parsedData, hasUploadedPDF: !!uploadedPDF })
      toast.error('Please upload a file first')
      return
    }

    console.log('📊 [CreateCase] Parsed data type:', parsedData.complaint ? 'PDF' : 'Excel')
    toast.info('🚀 Creating case and investigation graph...')

    try {
      // Step 1: Create case with extracted data
      console.log('📝 [CreateCase] Step 1: Preparing case data...')
      let caseData: any
      
      if (parsedData.complaint) {
        // PDF data
        const complaint = parsedData.complaint.complainant
        const metadata = parsedData.complaint.metadata

        caseData = {
          title: metadata.sub_category || metadata.category || 'Cyber Crime Case',
          description: `Acknowledgement No: ${metadata.acknowledgement_no}\nIncident Date: ${metadata.incident_datetime}\n\nAuto-imported from 1930 portal complaint PDF`,
          crime_category: 'FINANCIAL_FRAUD',
          priority: 'HIGH',
          victim_name: complaint.name,
          victim_contact: complaint.mobile,
          financial_loss: metadata.total_amount_lost,
          custom_fields: {
            acknowledgement_no: metadata.acknowledgement_no,
            incident_datetime: metadata.incident_datetime,
            complaint_date: metadata.complaint_date,
            auto_imported: true,
            source: '1930_portal'
          }
        }
      } else if (parsedData.metadata) {
        // Excel data
        const metadata = parsedData.metadata

        caseData = {
          title: `Banking Fraud - ${metadata.acknowledgement_no}`,
          description: `Transaction Trail Analysis\nAcknowledgement No: ${metadata.acknowledgement_no}\nDate Range: ${metadata.start_date} to ${metadata.end_date}\nTotal Disputed Amount: ₹${metadata.total_disputed_amount?.toLocaleString()}\n\nAuto-imported from bank transaction Excel`,
          crime_category: 'FINANCIAL_FRAUD',
          priority: 'HIGH',
          victim_name: 'Victim (from Excel)',
          victim_contact: '',
          financial_loss: metadata.total_disputed_amount,
          custom_fields: {
            acknowledgement_no: metadata.acknowledgement_no,
            transaction_count: metadata.transaction_count,
            max_layer: metadata.max_layer,
            start_date: metadata.start_date,
            end_date: metadata.end_date,
            auto_imported: true,
            source: 'bank_excel'
          }
        }
      } else {
        toast.error('Invalid parsed data format')
        return
      }

      console.log('🌐 [CreateCase] Creating case via API...')
      const createdCase = await caseService.createCase(caseData)
      console.log('✅ [CreateCase] Case created:', {
        id: createdCase.id,
        case_number: createdCase.case_number,
        title: createdCase.title
      })
      toast.success(`✅ Case created: ${createdCase.case_number}`)

      // Step 2: Create graph entities
      console.log('📊 [CreateCase] Step 2: Creating investigation graph...')
      toast.info('📊 Creating investigation graph...')

      const graphFormData = new FormData()
      graphFormData.append('file', uploadedPDF)
      graphFormData.append('case_id', createdCase.id || '')
      
      // Add max_layer if selected
      if (selectedMaxLayer !== null) {
        console.log(`🎯 [CreateCase] Filtering to max layer: ${selectedMaxLayer}`)
        graphFormData.append('max_layer', selectedMaxLayer.toString())
        toast.info(`📊 Loading layers 0-${selectedMaxLayer}...`)
      }

      console.log('🌐 [CreateCase] Sending graph creation request...')
      const graphStartTime = Date.now()
      
      const graphResponse = await fetch('http://localhost:8000/api/v1/investigation/parse-complaint/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: graphFormData
      })
      
      const graphElapsed = Date.now() - graphStartTime
      console.log(`⏱️  [CreateCase] Graph request completed in ${graphElapsed}ms, Status: ${graphResponse.status}`)

      if (graphResponse.ok) {
        const result = await graphResponse.json()
        console.log('✅ [CreateCase] Graph created:', {
          entities: result.created_entities?.length || 0,
          relationships: result.created_relationships?.length || 0
        })
        toast.success(`✅ Investigation graph created with ${result.created_entities?.length || 0} entities!`)
        
        console.log('🧭 [CreateCase] Navigating to Investigation Workbench...')
        // Navigate directly to Investigation Workbench
        navigate(`/cases/${createdCase.id}?tab=investigation`)
      } else {
        const errorText = await graphResponse.text()
        console.error('⚠️  [CreateCase] Graph creation failed:', graphResponse.status, errorText)
        toast.warning('Case created but graph creation failed')
        navigate(`/cases/${createdCase.id}`)
      }

    } catch (error: any) {
      console.error('❌ [CreateCase] Quick import error:', error)
      toast.error('Failed to import: ' + error.message)
    } finally {
      console.log('🏁 [CreateCase] handleQuickImport completed')
    }
  }

  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setDynamicFields(prev => ({ ...prev, [fieldName]: value }))
  }

  const renderDynamicField = (field: any) => {
    const isRequired = field.is_required
    const value = dynamicFields[field.field_name] || ''

    return (
      <div key={field.field_name} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.field_name.replace(/_/g, ' ')}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.help_text && (
          <p className="text-xs text-gray-500">{field.help_text}</p>
        )}
        {field.field_type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            required={isRequired}
          />
        ) : field.field_type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={isRequired}
          />
        ) : field.field_type === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={isRequired}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={isRequired}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-gray-900">Create New Case</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload a complaint PDF from the 1930 portal to auto-populate fields, or fill manually.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Complaint Upload Section */}
          <Card className="border border-slate-200 bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" />
                Import from 1930 Complaint Portal (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    disabled={parsingPDF}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handlePDFUpload(file)
                      }
                    }}
                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-normal file:bg-slate-700 file:text-white hover:file:bg-slate-800 disabled:opacity-50"
                  />
                  {parsingPDF && <Loader2 className="h-5 w-5 animate-spin text-slate-600" />}
                </div>
                
                {parsingPDF && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing file and extracting data...
                  </div>
                )}
                
                {parsedData && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">File Parsed Successfully!</p>
                        <div className="mt-2 space-y-1 text-xs text-green-700">
                          <p>✅ {parsedData.graph?.nodes?.length || 0} entities extracted</p>
                          <p>✅ {parsedData.graph?.edges?.length || 0} transactions found</p>
                          {parsedData.complaint && (
                            <>
                              <p>✅ {parsedData.complaint?.transactions?.length || 0} total transaction records</p>
                              <p>✅ Victim: {parsedData.complaint?.complainant?.name || 'Unknown'}</p>
                              <p>✅ Amount: ₹{parsedData.complaint?.metadata?.total_amount_lost?.toLocaleString() || '0'}</p>
                            </>
                          )}
                          {parsedData.metadata && (
                            <>
                              <p>✅ Acknowledgement No: {parsedData.metadata?.acknowledgement_no || 'N/A'}</p>
                              <p>✅ Total Amount: ₹{parsedData.metadata?.total_disputed_amount?.toLocaleString() || 0}</p>
                              <p>✅ Layers: {parsedData.metadata?.max_layer || 0}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Layer Selection for Excel files */}
                    {parsedData.metadata && parsedData.metadata.max_layer > 1 && (
                      <div className="pt-3 border-t border-green-200">
                        <label className="block text-sm font-medium text-green-900 mb-2">
                          Select Layers to Import (Optional)
                        </label>
                        <p className="text-xs text-green-700 mb-3">
                          Choose how many layers to load. This helps manage large datasets.
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              type="range"
                              min="1"
                              max={parsedData.metadata.max_layer}
                              value={selectedMaxLayer || parsedData.metadata.max_layer}
                              onChange={(e) => setSelectedMaxLayer(parseInt(e.target.value))}
                              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                            <div className="flex justify-between text-xs text-green-700 mt-1">
                              <span>Layer 1</span>
                              <span className="font-medium">
                                {selectedMaxLayer || parsedData.metadata.max_layer} / {parsedData.metadata.max_layer} Layers
                              </span>
                              <span>Layer {parsedData.metadata.max_layer}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedMaxLayer(null)}
                            className="text-xs"
                          >
                            All Layers
                          </Button>
                        </div>
                        <div className="mt-2 text-xs text-green-700">
                          {selectedMaxLayer ? (
                            <p>📊 Will import Layers 0-{selectedMaxLayer} ({
                              parsedData.graph?.nodes?.filter((n: any) => 
                                (n.metadata?.layer || 0) <= selectedMaxLayer
                              ).length || 0
                            } entities, {
                              parsedData.graph?.edges?.filter((e: any) => 
                                (e.metadata?.layer || 0) <= selectedMaxLayer
                              ).length || 0
                            } transactions)</p>
                          ) : (
                            <p>📊 Will import all {parsedData.metadata.max_layer} layers ({parsedData.graph?.nodes?.length || 0} entities, {parsedData.graph?.edges?.length || 0} transactions)</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-green-200">
                      <Button
                        type="button"
                        onClick={handleQuickImport}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Quick Import - Create Case & Graph Now
                      </Button>
                      <p className="text-xs text-green-700">
                        Or fill form manually below
                      </p>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-600">
                  📄 Upload complaint PDF or bank transaction Excel (.xlsx) to automatically extract: complainant details, transaction layers, bank accounts, and create investigation graph
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Basic Information */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Brief case title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                  placeholder="Detailed case description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crime Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.crime_category}
                  onChange={(e) => setFormData({ ...formData, crime_category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {CRIME_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {loadingTemplate && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading category template...
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.value })}
                      className={`p-2 rounded-md text-sm font-medium transition-all ${
                        formData.priority === p.value
                          ? `${p.color} border-2 border-current`
                          : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template-specific fields */}
          {template && template.required_fields && template.required_fields.length > 0 && (
            <Card className="border border-slate-200 bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  {template.display_name} - Required Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                {template.required_fields.map(renderDynamicField)}
              </CardContent>
            </Card>
          )}

          {template && template.optional_fields && template.optional_fields.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal">Additional Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.optional_fields.map(renderDynamicField)}
              </CardContent>
            </Card>
          )}

          {/* FIR Details */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal">FIR Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FIR Number</label>
                  <input
                    type="text"
                    value={formData.fir_number}
                    onChange={(e) => setFormData({ ...formData, fir_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="FIR/XXX/2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FIR Date</label>
                  <input
                    type="date"
                    value={formData.fir_date}
                    onChange={(e) => setFormData({ ...formData, fir_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal">Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Loss (₹)</label>
                <input
                  type="number"
                  value={formData.financial_loss}
                  onChange={(e) => setFormData({ ...formData, financial_loss: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          {/* Complainant Information */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-normal">Complainant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Victim Name</label>
                <input
                  type="text"
                  value={formData.victim_name}
                  onChange={(e) => setFormData({ ...formData, victim_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Victim Contact</label>
                <input
                  type="text"
                  value={formData.victim_contact}
                  onChange={(e) => setFormData({ ...formData, victim_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone or email..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Evidence Checklist */}
          {template && template.evidence_checklist && template.evidence_checklist.length > 0 && (
            <Card className="border border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Evidence Checklist for {template.display_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.evidence_checklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">•</span>
                      <div>
                        <span className="font-medium">{item.evidence_type}</span>
                        {item.is_required && (
                          <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Required</Badge>
                        )}
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested LERS Requests */}
          {template && template.suggested_lers_requests && template.suggested_lers_requests.length > 0 && (
            <Card className="border border-slate-200 bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-700" />
                  Suggested LERS Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.suggested_lers_requests.map((req, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{req.request_type}</span>
                        <Badge className="bg-slate-100 text-slate-800 text-xs">
                          SLA: {req.suggested_sla_days} days
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{req.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.provider_types.map((provider, pidx) => (
                          <Badge key={pidx} variant="outline" className="text-xs">
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applicable Laws */}
          {template && template.applicable_laws && template.applicable_laws.length > 0 && (
            <Card className="border border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <Scale className="h-4 w-4 text-yellow-600" />
                  Applicable Laws
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {template.applicable_laws.map((law, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                      • {law}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investigation Tips */}
          {template && (template as any).investigation_tips && (template as any).investigation_tips.length > 0 && (
            <Card className="border border-slate-200 bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-normal flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-slate-700" />
                  Investigation Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(template as any).investigation_tips.map((tip: string, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700">
                      {idx + 1}. {tip}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/cases')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-slate-700 hover:bg-slate-800"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Case'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
