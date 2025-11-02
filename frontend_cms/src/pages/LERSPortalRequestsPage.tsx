import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { lersService } from '../services/lersService'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import {
  FileText,
  Plus,
  Search,
  Filter
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LERSPortalRequestsPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Fetch LERS requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['lers-requests'],
    queryFn: () => lersService.getRequests({ limit: 100 })
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
      PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
      SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
      COMPLETED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const filteredRequests = requests?.results?.filter((request: any) => {
    const matchesSearch = searchTerm === '' ||
      request.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.provider.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter

    return matchesSearch && matchesStatus
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="px-8 py-6">
        {/* Filters */}
        <div className="mb-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by request number or provider..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  >
                    <option value="ALL">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* New Request Button */}
                <Button
                  onClick={() => navigate('/lers/portal/create')}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'ALL' ? 'No matching requests' : 'No requests yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'Try adjusting your filters'
                    : 'Create your first LERS request to get started'}
                </p>
                {!searchTerm && statusFilter === 'ALL' && (
                  <Button
                    onClick={() => navigate('/lers/portal/create')}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Request
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all"
                    onClick={() => navigate(`/lers/portal/requests/${request.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">{request.request_number}</span>
                        <Badge className={`${getStatusColor(request.status)} border px-2.5 py-0.5 text-xs font-medium`}>
                          {request.status_display}
                        </Badge>
                        {request.sla_breached && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 border px-2.5 py-0.5 text-xs font-medium">
                            SLA Breached
                          </Badge>
                        )}
                        {request.priority === 'CRITICAL' && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 border px-2.5 py-0.5 text-xs font-medium">
                            Critical
                          </Badge>
                        )}
                        {request.priority === 'URGENT' && (
                          <Badge className="bg-orange-50 text-orange-700 border-orange-200 border px-2.5 py-0.5 text-xs font-medium">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{request.provider}</span>
                        <span className="text-gray-400">•</span>
                        <span>{request.request_type_display}</span>
                        {request.case_number && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>Case: {request.case_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.sla_due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(request.sla_due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        {filteredRequests.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredRequests.length} of {requests?.count || 0} requests
          </div>
        )}
      </div>
    </div>
  )
}
