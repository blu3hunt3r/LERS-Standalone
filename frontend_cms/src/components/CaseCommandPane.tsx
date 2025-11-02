import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Send, 
  FileText, 
  Paperclip, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Lightbulb,
  Eye,
  Bell,
  Download,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'
import { toast } from 'react-toastify'
import { formatDate } from '@/lib/utils'

interface Suggestion {
  id: string
  type: 'lers_request' | 'investigation_action' | 'entity_watch'
  title: string
  description: string
  confidence: number
  reasoning: string[]
  evidence_pointers: string[]
  action: {
    type: string
    label: string
    payload?: any
  }
}

interface LERSRequestPreview {
  id: string
  request_number: string
  provider: string
  status: string
  priority: string
  request_type: string
  sla_due_date: string
  sla_breached: boolean
  created_at: string
}

interface CaseCommandPaneProps {
  caseId: string
  onRequestCreate: () => void
  onExportBundle: () => void
}

const CaseCommandPane = ({ caseId, onRequestCreate, onExportBundle }: CaseCommandPaneProps) => {
  const queryClient = useQueryClient()
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)

  // Fetch AI suggestions for this case
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery<Suggestion[]>({
    queryKey: ['suggestions', caseId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/cases/${caseId}/suggestions/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })
      if (!response.ok) return []
      return response.json()
    },
    retry: false,
  })

  // Fetch LERS requests for this case
  const { data: lersRequests, isLoading: lersLoading } = useQuery<LERSRequestPreview[]>({
    queryKey: ['lers-requests', caseId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/lers/requests/?case=${caseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch LERS requests')
      const data = await response.json()
      return data.results || data
    },
  })

  // Execute suggestion action
  const executeSuggestion = useMutation({
    mutationFn: async (suggestion: Suggestion) => {
      if (suggestion.action.type === 'create_lers_request') {
        onRequestCreate()
      } else if (suggestion.action.type === 'watch_entity') {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/entities/${suggestion.action.payload.entity_hash}/watch/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            station_id: suggestion.action.payload.station_id,
            reason: suggestion.reasoning.join('; ')
          }),
        })
        if (!response.ok) throw new Error('Failed to add to watchlist')
        return response.json()
      }
    },
    onSuccess: () => {
      toast.success('Action executed successfully')
      queryClient.invalidateQueries({ queryKey: ['suggestions', caseId] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to execute action')
    }
  })

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-700',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-700',
      'SUBMITTED': 'bg-slate-100 text-slate-800',
      'ACKNOWLEDGED': 'bg-slate-100 text-slate-800',
      'IN_PROGRESS': 'bg-slate-100 text-slate-800',
      'RESPONSE_UPLOADED': 'bg-green-100 text-green-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'REJECTED': 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getSLAStatus = (sla_due_date: string, breached: boolean) => {
    if (breached) return { color: 'text-red-600', icon: AlertTriangle, label: 'BREACHED' }
    
    const now = new Date()
    const due = new Date(sla_due_date)
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursLeft < 4) return { color: 'text-red-600', icon: AlertTriangle, label: `${Math.round(hoursLeft)}h left` }
    if (hoursLeft < 24) return { color: 'text-orange-600', icon: Clock, label: `${Math.round(hoursLeft)}h left` }
    return { color: 'text-green-600', icon: CheckCircle, label: `${Math.round(hoursLeft / 24)}d left` }
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card className="border border-slate-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-700" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              className="bg-slate-700 hover:bg-slate-800 text-xs"
              onClick={onRequestCreate}
            >
              <Send className="mr-2 h-3 w-3" />
              LERS Request
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={() => {/* TODO: Add evidence */}}
            >
              <Paperclip className="mr-2 h-3 w-3" />
              Add Evidence
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={onExportBundle}
            >
              <Download className="mr-2 h-3 w-3" />
              Court Bundle
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
            >
              <MessageSquare className="mr-2 h-3 w-3" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card className="border border-slate-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-slate-700" />
              Investigation Assistant
              <Badge variant="outline" className="ml-auto text-xs">
                {suggestions.length} suggestions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className="p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{suggestion.title}</p>
                        <Badge className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{suggestion.description}</p>
                    </div>
                    <button
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === suggestion.id ? null : suggestion.id
                      )}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      {expandedSuggestion === suggestion.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {expandedSuggestion === suggestion.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Why suggested:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {suggestion.reasoning.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-slate-700 mt-0.5">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {suggestion.evidence_pointers.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Evidence:</p>
                          <div className="flex flex-wrap gap-1">
                            {suggestion.evidence_pointers.map((pointer, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {pointer}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full mt-2 bg-slate-700 hover:bg-slate-800 text-xs"
                    onClick={() => executeSuggestion.mutate(suggestion)}
                    disabled={executeSuggestion.isPending}
                  >
                    {suggestion.action.label}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LERS Requests Panel */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Send className="h-4 w-4 text-slate-700" />
            LERS Requests
            <Badge variant="outline" className="ml-auto text-xs">
              {lersRequests?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lersLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700 mx-auto"></div>
            </div>
          ) : lersRequests && lersRequests.length > 0 ? (
            <div className="space-y-2">
              {lersRequests.map((req) => {
                const slaStatus = getSLAStatus(req.sla_due_date, req.sla_breached)
                const SLAIcon = slaStatus.icon
                
                return (
                  <div 
                    key={req.id} 
                    className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{req.provider}</p>
                        <p className="text-xs text-gray-500">{req.request_type.replace(/_/g, ' ')}</p>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(req.status)}`}>
                        {req.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className={`flex items-center gap-1 text-xs ${slaStatus.color}`}>
                        <SLAIcon className="h-3 w-3" />
                        <span>{slaStatus.label}</span>
                      </div>
                      <button
                        onClick={() => setExpandedRequest(
                          expandedRequest === req.id ? null : req.id
                        )}
                        className="text-xs text-slate-700 hover:text-slate-800"
                      >
                        {expandedRequest === req.id ? 'Hide' : 'Preview'}
                      </button>
                    </div>

                    {expandedRequest === req.id && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          Request #{req.request_number}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {formatDate(req.created_at)}
                        </p>
                        {req.priority !== 'NORMAL' && (
                          <Badge className="mt-1 text-xs bg-red-100 text-red-700">
                            {req.priority}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Send className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No requests yet</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2 text-xs"
                onClick={onRequestCreate}
              >
                Create First Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watchlist Alerts */}
      <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-600" />
            Watchlist Alerts
            <Badge variant="outline" className="ml-auto text-xs">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 text-center py-2">
            No active alerts
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default CaseCommandPane

