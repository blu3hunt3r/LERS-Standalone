import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Plus, Send, Clock, CheckCircle, AlertCircle, Eye, AlertTriangle,
  Loader2, Filter, Search, MoreVertical, FileText, MessageSquare
} from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { lersService } from '@/services/lersService'
import RequestTracker from '@/components/lers/RequestTracker'

interface LERSRequestsTabProps {
  caseId: string
}

export default function LERSRequestsTab({ caseId }: LERSRequestsTabProps) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch real LERS requests for this case
  const { data, isLoading } = useQuery({
    queryKey: ['lers-requests', caseId],
    queryFn: () => lersService.getRequests({ case: caseId }),
    enabled: !!caseId,
  })

  // Extract requests from response
  const mockRequests = data?.results || []

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'RESPONSE_UPLOADED': return 'received'
      case 'IN_PROGRESS': return 'processing'
      case 'SUBMITTED': return 'sent'
      case 'PENDING_APPROVAL': return 'pending'
      default: return 'secondary'
    }
  }

  const getPriorityVariant = (priority: string): any => {
    switch (priority) {
      case 'CRITICAL': return 'destructive'
      case 'URGENT': return 'destructive'
      case 'NORMAL': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSLAColor = (dueDate: Date) => {
    const hoursLeft = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursLeft < 0) return 'text-red-600'
    if (hoursLeft < 2) return 'text-orange-600'
    return 'text-green-600'
  }

  const filteredRequests = mockRequests.filter((req: any) => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter
    const matchesSearch = 
      req.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.request_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.request_type_display?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(req.identifiers || {}).toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by provider, type, or entity..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button 
            onClick={() => navigate(`/lers/create?caseId=${caseId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create LERS Request
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request ID
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request Type
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                SLA
              </th>
              <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRequests.map((request: any) => {
              // Calculate progress based on status
              const getProgress = (status: string) => {
                switch (status) {
                  case 'DRAFT': return 10
                  case 'PENDING_APPROVAL': return 20
                  case 'APPROVED': return 40
                  case 'SUBMITTED': return 60
                  case 'ACKNOWLEDGED': return 70
                  case 'IN_PROGRESS': return 80
                  case 'RESPONSE_UPLOADED': return 90
                  case 'COMPLETED': return 100
                  default: return 0
                }
              }

              // Extract entity from identifiers
              const getEntityDisplay = (identifiers: any) => {
                if (!identifiers || typeof identifiers !== 'object') return 'N/A'
                const keys = Object.keys(identifiers)
                if (keys.length === 0) return 'N/A'
                const firstKey = keys[0]
                return `${firstKey}: ${identifiers[firstKey]}`
              }

              return (
                <tr 
                  key={request.id} 
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Status */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {request.status === 'RESPONSE_UPLOADED' || request.status === 'COMPLETED' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : request.status === 'IN_PROGRESS' || request.status === 'ACKNOWLEDGED' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-700" />
                      )}
                      <Badge variant={getStatusVariant(request.status)}>
                        {request.status_display || request.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </td>

                  {/* Request ID */}
                  <td className="py-4 px-6">
                    <div className="text-sm font-normal text-slate-700">{request.request_number || request.id}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {request.created_at && formatDistanceToNowStrict(new Date(request.created_at), { addSuffix: true })}
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="py-4 px-6">
                    <div className="text-sm font-medium text-gray-900">{request.provider}</div>
                    <Badge variant={getPriorityVariant(request.priority)}>
                      {request.priority_display || request.priority}
                    </Badge>
                  </td>

                  {/* Request Type */}
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900">{request.request_type_display || request.request_type}</div>
                    {(request.status === 'RESPONSE_UPLOADED' || request.status === 'COMPLETED') && request.response_count > 0 && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {request.response_count} {request.response_count === 1 ? 'response' : 'responses'}
                      </div>
                    )}
                  </td>

                  {/* Entity */}
                  <td className="py-4 px-6">
                    <div className="text-sm font-mono text-gray-700">{getEntityDisplay(request.identifiers)}</div>
                  </td>

                  {/* Progress */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress
                          value={getProgress(request.status)}
                          className={`h-2 ${
                            request.status === 'RESPONSE_UPLOADED' || request.status === 'COMPLETED' ? '[&>div]:bg-green-500' :
                            request.status === 'IN_PROGRESS' || request.status === 'ACKNOWLEDGED' ? '[&>div]:bg-slate-600' : '[&>div]:bg-slate-500'
                          }`}
                        />
                      </div>
                      <span className="text-xs font-normal text-gray-600">{getProgress(request.status)}%</span>
                    </div>
                  </td>

                  {/* SLA */}
                  <td className="py-4 px-6">
                    {request.sla_due_date ? (
                      <div className={`text-sm font-normal ${getSLAColor(new Date(request.sla_due_date))}`}>
                        {formatDistanceToNowStrict(new Date(request.sla_due_date), { addSuffix: true })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No SLA</div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      {request.status === 'RESPONSE_UPLOADED' || request.status === 'COMPLETED' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => navigate(`/lers/requests/${request.id}`)}
                          >
                            <FileText className="h-3 w-3 mr-1.5" />
                            Analyze Response
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/lers/requests/${request.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            View
                          </Button>
                        </>
                      ) : request.status === 'IN_PROGRESS' || request.status === 'SUBMITTED' || request.status === 'ACKNOWLEDGED' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/lers/requests/${request.id}?tab=chat`)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1.5" />
                            Chat
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/lers/requests/${request.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            View
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/lers/requests/${request.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1.5" />
                          View
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-normal text-gray-900 mb-2">
              No LERS Requests Found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Request
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
