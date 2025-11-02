/**
 * Approver Dashboard Page
 * Complete approval workflow management for LERS requests
 * Features: Filtering, Sorting, Bulk actions, Digital signature, Comments
 */
import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lersService } from '../services/lersService'
import { 
  Filter, 
  SortAsc, 
  CheckSquare, 
  XSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  Search,
  CheckCheck,
  X,
  Eye,
  Calendar,
  User,
  Building,
  FileText
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

interface LERSRequest {
  id: string
  request_number: string
  request_type: string
  priority: 'NORMAL' | 'HIGH' | 'URGENT'
  status: string
  case: {
    case_number: string
    title: string
    tenant: {
      name: string
    }
  }
  created_by: {
    full_name: string
    email: string
  }
  provider: string
  sla_due_date: string
  created_at: string
  entities_count: number
}

const ApproverDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  
  // State
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    priority: '',
    station: '',
    io: '',
    date_from: '',
    date_to: '',
    search: '',
  })
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'sla'>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LERSRequest | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [digitalSignature, setDigitalSignature] = useState('')

  // Fetch pending approvals
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-approvals', filters, sortBy],
    queryFn: () => lersService.getPendingApprovals({
      ...filters,
      sort: sortBy,
    }),
  })

  const requests: LERSRequest[] = data?.requests || []
  const totalPending = data?.total_pending || 0

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (data: { id: string; notes: string }) =>
      lersService.approveRequest(data.id, data.notes),
    onSuccess: () => {
      toast.success('✅ Request approved successfully')
      refetch()
      setSelectedRequest(null)
      setShowApprovalModal(false)
      setApprovalComments('')
      setDigitalSignature('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve request')
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      lersService.rejectRequest(data.id, data.reason),
    onSuccess: () => {
      toast.success('Request rejected')
      refetch()
      setSelectedRequest(null)
      setShowApprovalModal(false)
      setRejectionReason('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject request')
    },
  })

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!filters.search) return requests
    const searchLower = filters.search.toLowerCase()
    return requests.filter(req =>
      req.request_number.toLowerCase().includes(searchLower) ||
      req.case.case_number.toLowerCase().includes(searchLower) ||
      req.case.title.toLowerCase().includes(searchLower) ||
      req.created_by.full_name.toLowerCase().includes(searchLower)
    )
  }, [requests, filters.search])

  // Select/deselect
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedRequests)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRequests(newSelected)
  }

  const selectAll = () => {
    if (selectedRequests.size === filteredRequests.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(filteredRequests.map(r => r.id)))
    }
  }

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) return
    
    const confirmed = window.confirm(
      `Approve ${selectedRequests.size} request(s)? This action cannot be undone.`
    )
    
    if (!confirmed) return

    toast.promise(
      Promise.all(
        Array.from(selectedRequests).map(id =>
          lersService.approveRequest(id, 'Bulk approved')
        )
      ),
      {
        loading: `Approving ${selectedRequests.size} requests...`,
        success: `✅ ${selectedRequests.size} requests approved`,
        error: 'Some requests failed to approve',
      }
    ).then(() => {
      refetch()
      setSelectedRequests(new Set())
    })
  }

  // Bulk reject
  const handleBulkReject = async () => {
    if (selectedRequests.size === 0) return
    
    const reason = window.prompt('Enter rejection reason for all selected requests:')
    if (!reason) return

    toast.promise(
      Promise.all(
        Array.from(selectedRequests).map(id =>
          lersService.rejectRequest(id, reason)
        )
      ),
      {
        loading: `Rejecting ${selectedRequests.size} requests...`,
        success: `${selectedRequests.size} requests rejected`,
        error: 'Some requests failed to reject',
      }
    ).then(() => {
      refetch()
      setSelectedRequests(new Set())
    })
  }

  // Priority badge
  const getPriorityBadge = (priority: string) => {
    const badges = {
      URGENT: 'bg-red-500/20 text-red-400 border-red-500/50',
      HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      NORMAL: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    }
    return badges[priority as keyof typeof badges] || badges.NORMAL
  }

  // SLA status
  const getSLAStatus = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursLeft < 0) {
      return { label: 'Overdue', color: 'text-red-500', icon: AlertCircle }
    } else if (hoursLeft < 24) {
      return { label: 'Due Soon', color: 'text-orange-500', icon: Clock }
    }
    return { label: 'On Time', color: 'text-green-500', icon: CheckCheck }
  }

  // View request detail
  const handleViewRequest = (request: LERSRequest) => {
    setSelectedRequest(request)
    setShowApprovalModal(true)
  }

  // Approve selected request
  const handleApprove = () => {
    if (!selectedRequest || !digitalSignature) {
      toast.error('Digital signature is required')
      return
    }

    approveMutation.mutate({
      id: selectedRequest.id,
      notes: approvalComments + `\n\nDigital Signature: ${digitalSignature}`,
    })
  }

  // Reject selected request
  const handleReject = () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error('Rejection reason is required')
      return
    }

    rejectMutation.mutate({
      id: selectedRequest.id,
      reason: rejectionReason,
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Approval Dashboard
        </h1>
        <p className="text-slate-400">
          Review and approve pending LERS requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Pending</p>
              <p className="text-2xl font-bold text-white">{totalPending}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Urgent</p>
              <p className="text-2xl font-bold text-red-400">
                {requests.filter(r => r.priority === 'URGENT').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">High Priority</p>
              <p className="text-2xl font-bold text-orange-400">
                {requests.filter(r => r.priority === 'HIGH').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Selected</p>
              <p className="text-2xl font-bold text-white">{selectedRequests.size}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-5 h-5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
              <option value="sla">By SLA Due Date</option>
            </select>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Filter className="w-5 h-5 inline mr-2" />
            Filters
          </button>

          {/* Bulk Actions */}
          {selectedRequests.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleBulkApprove}
                disabled={approveMutation.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-5 h-5 inline mr-2" />
                Approve ({selectedRequests.size})
              </button>
              <button
                onClick={handleBulkReject}
                disabled={rejectMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 inline mr-2" />
                Reject ({selectedRequests.size})
              </button>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  priority: '',
                  station: '',
                  io: '',
                  date_from: '',
                  date_to: '',
                  search: '',
                })}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
          <CheckSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No pending approvals</p>
          <p className="text-slate-500 text-sm mt-2">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 checked:bg-blue-600"
            />
            <span>Select All ({filteredRequests.length})</span>
          </div>

          {/* Request Cards */}
          {filteredRequests.map((request) => {
            const slaStatus = getSLAStatus(request.sla_due_date)
            const SLAIcon = slaStatus.icon

            return (
              <div
                key={request.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedRequests.has(request.id)}
                    onChange={() => toggleSelect(request.id)}
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 checked:bg-blue-600"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {request.request_number}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {request.request_type}
                        </p>
                      </div>

                      {/* Priority Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(request.priority)}`}>
                        {request.priority}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">Case:</span>
                        <span className="text-white">{request.case.case_number}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">IO:</span>
                        <span className="text-white">{request.created_by.full_name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">Station:</span>
                        <span className="text-white">{request.case.tenant.name}</span>
                      </div>
                    </div>

                    {/* SLA & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                      <div className="flex items-center gap-4 text-sm">
                        <div className={`flex items-center gap-2 ${slaStatus.color}`}>
                          <SLAIcon className="w-4 h-4" />
                          <span>{slaStatus.label}</span>
                        </div>
                        <div className="text-slate-400">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Due {formatDistanceToNow(new Date(request.sla_due_date), { addSuffix: true })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewRequest(request)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedRequest.request_number}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedRequest.request_type}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowApprovalModal(false)
                  setSelectedRequest(null)
                  setApprovalComments('')
                  setRejectionReason('')
                  setDigitalSignature('')
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Case</p>
                  <p className="text-white font-medium">{selectedRequest.case.case_number}</p>
                  <p className="text-slate-400 text-sm">{selectedRequest.case.title}</p>
                </div>
                
                <div>
                  <p className="text-sm text-slate-400 mb-1">Investigating Officer</p>
                  <p className="text-white font-medium">{selectedRequest.created_by.full_name}</p>
                  <p className="text-slate-400 text-sm">{selectedRequest.created_by.email}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Provider</p>
                  <p className="text-white font-medium">{selectedRequest.provider}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Entities</p>
                  <p className="text-white font-medium">{selectedRequest.entities_count} entities</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Priority</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(selectedRequest.priority)}`}>
                    {selectedRequest.priority}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">SLA Due Date</p>
                  <p className="text-white font-medium">
                    {format(new Date(selectedRequest.sla_due_date), 'PPpp')}
                  </p>
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Approval Comments (Optional)
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Digital Signature */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Digital Signature * (Required for approval)
                </label>
                <input
                  type="text"
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  placeholder="Enter your full name as digital signature"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  By entering your name, you certify that you have reviewed this request
                </p>
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rejection Reason (Required for rejection)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide detailed reason for rejection..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowApprovalModal(false)
                  setSelectedRequest(null)
                  setApprovalComments('')
                  setRejectionReason('')
                  setDigitalSignature('')
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleReject}
                disabled={!rejectionReason || rejectMutation.isPending}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {rejectMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Reject
              </button>
              
              <button
                onClick={handleApprove}
                disabled={!digitalSignature || approveMutation.isPending}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {approveMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApproverDashboard



