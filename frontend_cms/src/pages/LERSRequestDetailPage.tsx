/**
 * LERS Request Detail Page
 * Shows complete lifecycle, SLA tracking, and response handling
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, Clock, Building, FileText, AlertCircle,
  CheckCircle, XCircle, Calendar, User, Hash, ExternalLink,
  Download, Upload, MessageSquare, History
} from 'lucide-react'
import api from '@/services/api'
import LERSRequestChat from '@/components/lers/LERSRequestChat'
import RequestTracker from '@/components/lers/RequestTracker'

export default function LERSRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'responses' | 'chat'>('details')
  
  // Check for tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['details', 'chat', 'timeline', 'responses'].includes(tabParam)) {
      setActiveTab(tabParam as 'details' | 'timeline' | 'responses' | 'chat')
    }
  }, [searchParams])

  const { data: request, isLoading, error } = useQuery({
    queryKey: ['lers-request', requestId],
    queryFn: async () => {
      const response = await api.get(`/lers/requests/${requestId}/`)
      return response.data
    },
    enabled: !!requestId
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-slate-100 text-slate-800',
      SUBMITTED: 'bg-slate-100 text-slate-800',
      IN_PROGRESS: 'bg-slate-100 text-slate-800',
      RESPONSE_RECEIVED: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700'
    }
    return colors[priority] || 'bg-gray-100 text-gray-700'
  }

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getSLAStatus = (dueDate: string, status: string) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      return null
    }
    
    const daysRemaining = getDaysRemaining(dueDate)
    
    if (daysRemaining < 0) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700', days: Math.abs(daysRemaining) }
    } else if (daysRemaining === 0) {
      return { label: 'Due Today', color: 'bg-orange-100 text-orange-700', days: 0 }
    } else if (daysRemaining <= 2) {
      return { label: 'Due Soon', color: 'bg-yellow-100 text-yellow-700', days: daysRemaining }
    } else {
      return { label: `${daysRemaining} days left`, color: 'bg-slate-100 text-slate-800', days: daysRemaining }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request details...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Not Found</h2>
              <p className="text-gray-600 mb-4">The LERS request you're looking for doesn't exist.</p>
              <Button onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const slaStatus = getSLAStatus(request.sla_due_date, request.status)

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'responses', label: 'Responses', icon: Download }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Go back to the case's LERS tab if we have case info
              if (request?.case) {
                navigate(`/cases/${request.case}`)
              } else {
                navigate(-1)
              }
            }}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Request #{request.request_number}</h1>
                <Badge className={getStatusColor(request.status)}>
                  {request.status.replace(/_/g, ' ')}
                </Badge>
                <Badge className={getPriorityColor(request.priority)}>
                  {request.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{request.request_type}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* SLA Alert */}
        {slaStatus && (
          <Card className={`mb-4 border-l-4 ${
            slaStatus.label === 'Overdue' ? 'border-l-red-500' :
            slaStatus.label === 'Due Today' ? 'border-l-orange-500' :
            'border-l-yellow-500'
          }`}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`h-5 w-5 ${
                    slaStatus.label === 'Overdue' ? 'text-red-600' :
                    slaStatus.label === 'Due Today' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {slaStatus.label === 'Overdue' 
                        ? `Overdue by ${slaStatus.days} day${slaStatus.days !== 1 ? 's' : ''}`
                        : slaStatus.label === 'Due Today'
                        ? 'Due Today'
                        : `Due in ${slaStatus.days} day${slaStatus.days !== 1 ? 's' : ''}`
                      }
                    </p>
                    <p className="text-xs text-gray-600">
                      SLA Due Date: {formatDate(request.sla_due_date)}
                    </p>
                  </div>
                </div>
                <Badge className={slaStatus.color}>
                  {slaStatus.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-700 text-slate-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main Details */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      Request Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Request Type</p>
                        <p className="text-sm font-medium">{request.request_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Provider</p>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <p className="text-sm font-medium">{request.provider}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Case Number</p>
                        <button 
                          onClick={() => navigate(`/cases/${request.case}`)}
                          className="text-sm font-medium text-slate-700 hover:text-slate-800 flex items-center gap-1"
                        >
                          {request.case_number || 'View Case'}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Requested By</p>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <p className="text-sm font-medium">{request.requested_by_name || 'Officer'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 mb-1">Justification</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        {request.justification}
                      </p>
                    </div>

                    {request.data_points_requested && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Data Points Requested</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                          {request.data_points_requested}
                        </p>
                      </div>
                    )}

                    {request.date_range_from && request.date_range_to && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Date Range</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(request.date_range_from)} → {formatDate(request.date_range_to)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {request.response_data && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Response Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(request.response_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Created</p>
                      <p className="text-sm font-medium">{formatDateTime(request.created_at)}</p>
                    </div>
                    {request.submitted_at && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Submitted</p>
                        <p className="text-sm font-medium">{formatDateTime(request.submitted_at)}</p>
                      </div>
                    )}
                    {request.acknowledged_at && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Acknowledged</p>
                        <p className="text-sm font-medium">{formatDateTime(request.acknowledged_at)}</p>
                      </div>
                    )}
                    {request.completed_at && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Completed</p>
                        <p className="text-sm font-medium">{formatDateTime(request.completed_at)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-600 mb-1">SLA Due Date</p>
                      <p className="text-sm font-medium">{formatDate(request.sla_due_date)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {request.status === 'DRAFT' && (
                      <Button className="w-full" size="sm">
                        Submit Request
                      </Button>
                    )}
                    {request.status === 'RESPONSE_RECEIVED' && (
                      <>
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="sm">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept Response
                        </Button>
                        <Button variant="outline" className="w-full" size="sm">
                          Request Clarification
                        </Button>
                      </>
                    )}
                    <Button variant="outline" className="w-full" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Documents
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-700" />
                  Request Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Timeline feature coming soon</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'chat' && requestId && (
            <LERSRequestChat requestId={requestId} />
          )}

          {activeTab === 'responses' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Download className="h-4 w-4 text-slate-700" />
                  Response Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Download className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No response files yet</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

