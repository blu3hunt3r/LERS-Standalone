import { useQuery } from '@tanstack/react-query'
import { lersService } from '@/services/lersService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Inbox,
  ArrowRight,
  Building,
  Calendar,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProviderDashboard() {
  const navigate = useNavigate()

  // Fetch LERS requests statistics
  const { data: requests, isLoading } = useQuery({
    queryKey: ['provider-lers-requests'],
    queryFn: () => lersService.getRequests({ limit: 100 })
  })

  const stats = {
    total: requests?.count || 0,
    pending: requests?.results?.filter((r: any) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length || 0,
    inProgress: requests?.results?.filter((r: any) => r.status === 'IN_PROGRESS').length || 0,
    completed: requests?.results?.filter((r: any) => r.status === 'RESPONSE_UPLOADED' || r.status === 'COMPLETED').length || 0,
    slaBreached: requests?.results?.filter((r: any) => r.sla_breached).length || 0,
  }

  const recentRequests = requests?.results?.slice(0, 5) || []

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
      PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
      APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
      RESPONSE_UPLOADED: 'bg-green-50 text-green-700 border-green-200',
      COMPLETED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="px-8 py-6">
        {/* Stats Grid */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">REQUEST OVERVIEW</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending */}
            <Card className="bg-white border-2 border-gray-300 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-2">Pending</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Inbox className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* In Progress */}
            <Card className="bg-white border-2 border-gray-300 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-2">In Progress</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats.inProgress}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="bg-white border-2 border-gray-300 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-2">Completed</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SLA Breached */}
            <Card className="bg-white border-2 border-gray-300 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-2">SLA Breached</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats.slaBreached}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Requests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">RECENT REQUESTS</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/lers/provider/inbox')}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              {recentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                  <p className="text-gray-500 mb-6">Waiting for LERS requests from law enforcement</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentRequests.map((request: any) => {
                    const daysUntilDue = request.sla_due_date
                      ? Math.ceil((new Date(request.sla_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div
                        key={request.id}
                        className="flex items-center gap-4 p-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 cursor-pointer transition-all"
                        onClick={() => navigate(`/lers/provider/requests/${request.id}`)}
                      >
                        {/* Icon */}
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-slate-700" />
                        </div>

                        {/* Request Number & Type */}
                        <div className="min-w-[180px]">
                          <p className="text-sm font-semibold text-gray-900">{request.request_number}</p>
                          <p className="text-xs text-gray-500">{request.request_type_display}</p>
                        </div>

                        {/* Provider */}
                        <div className="flex items-center gap-1.5 flex-1">
                          <Building className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-700 truncate">{request.provider}</p>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-600">
                            {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        {/* SLA Due */}
                        {request.sla_due_date && (
                          <div className="flex items-center gap-1.5">
                            <Clock className={`h-3.5 w-3.5 flex-shrink-0 ${
                              request.sla_breached ? 'text-red-500' :
                              daysUntilDue && daysUntilDue <= 1 ? 'text-orange-500' :
                              'text-blue-500'
                            }`} />
                            <p className={`text-xs font-medium ${
                              request.sla_breached ? 'text-red-600' :
                              daysUntilDue && daysUntilDue <= 1 ? 'text-orange-600' :
                              'text-gray-600'
                            }`}>
                              {request.sla_breached ? 'OVERDUE' :
                               daysUntilDue === 0 ? 'Today' :
                               daysUntilDue === 1 ? 'Tomorrow' :
                               `${daysUntilDue}d`
                              }
                            </p>
                          </div>
                        )}

                        {/* Status Badge */}
                        <Badge className={`${getStatusColor(request.status)} border px-2 py-0.5 text-xs font-medium`}>
                          {request.status_display}
                        </Badge>

                        {/* SLA Alert */}
                        {request.sla_breached && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 border px-2 py-0.5 text-xs font-medium">
                            <AlertCircle className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
