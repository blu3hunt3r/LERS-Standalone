import { useState, useEffect } from 'react'
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
  Filter,
  Clock,
  Building,
  User,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronRight,
  Folder,
  ArrowRight,
  X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import React from 'react'

export default function LERSPortalRequestsPage() {
  const navigate = useNavigate()
  const [expandedFIRs, setExpandedFIRs] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [providerFilter, setProviderFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [requestNumberSearch, setRequestNumberSearch] = useState<string>('')
  const [caseNumberSearch, setCaseNumberSearch] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const toggleFIR = (firNumber: string) => {
    const newExpanded = new Set(expandedFIRs);
    if (newExpanded.has(firNumber)) {
      newExpanded.delete(firNumber);
    } else {
      newExpanded.add(firNumber);
    }
    setExpandedFIRs(newExpanded);
  }

  // Track which column filter is open
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null)

  // Toggle filter dropdown
  const toggleFilter = (column: string) => {
    setOpenFilterColumn(openFilterColumn === column ? null : column)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter('ALL')
    setProviderFilter('ALL')
    setPriorityFilter('ALL')
    setRequestNumberSearch('')
    setCaseNumberSearch('')
    setSearchTerm('')
  }

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'ALL' || providerFilter !== 'ALL' ||
    priorityFilter !== 'ALL' || requestNumberSearch !== '' || caseNumberSearch !== '' || searchTerm !== ''

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('th')) {
        setOpenFilterColumn(null)
      }
    }

    if (openFilterColumn) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openFilterColumn])

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

  // Get unique values for filters
  const uniqueProviders = Array.from(new Set(requests?.results?.map((r: any) => r.provider) || []))
  const uniquePriorities = Array.from(new Set(requests?.results?.map((r: any) => r.priority) || []))

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 text-gray-700" />
      : <ChevronDown className="h-4 w-4 text-gray-700" />
  }

  // Filter and sort
  const filteredRequests = requests?.results?.filter((request: any) => {
    const matchesGlobalSearch = searchTerm === '' ||
      request.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.case_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRequestNumber = requestNumberSearch === '' ||
      request.request_number.toLowerCase().includes(requestNumberSearch.toLowerCase())

    const matchesCaseNumber = caseNumberSearch === '' ||
      request.case_number?.toLowerCase().includes(caseNumberSearch.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter
    const matchesProvider = providerFilter === 'ALL' || request.provider === providerFilter
    const matchesPriority = priorityFilter === 'ALL' || request.priority === priorityFilter

    return matchesGlobalSearch && matchesRequestNumber && matchesCaseNumber && matchesStatus && matchesProvider && matchesPriority
  })
  .sort((a: any, b: any) => {
    let aVal, bVal
    switch(sortColumn) {
      case 'request_number':
        aVal = a.request_number
        bVal = b.request_number
        break
      case 'provider':
        aVal = a.provider
        bVal = b.provider
        break
      case 'status':
        aVal = a.status
        bVal = b.status
        break
      case 'priority':
        aVal = a.priority
        bVal = b.priority
        break
      case 'sla_due_date':
        aVal = new Date(a.sla_due_date || 0).getTime()
        bVal = new Date(b.sla_due_date || 0).getTime()
        break
      case 'created_at':
      default:
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  }) || []

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Group requests by FIR
  const groupedByFIR = paginatedRequests.reduce((acc: any, request: any) => {
    const firNumber = request.case_number || 'No FIR';
    if (!acc[firNumber]) {
      acc[firNumber] = [];
    }
    acc[firNumber].push(request);
    return acc;
  }, {});

  const sortedFIRs = Object.keys(groupedByFIR).sort((a, b) => {
    const aLatest = Math.max(...groupedByFIR[a].map((r: any) => new Date(r.created_at).getTime()));
    const bLatest = Math.max(...groupedByFIR[b].map((r: any) => new Date(r.created_at).getTime()));
    return bLatest - aLatest;
  })

  // Expand/collapse all functions
  const expandAll = () => {
    setExpandedFIRs(new Set(sortedFIRs));
  }

  const collapseAll = () => {
    setExpandedFIRs(new Set());
  }

  const allExpanded = sortedFIRs.length > 0 && expandedFIRs.size === sortedFIRs.length;

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
    <div className="w-full min-h-screen bg-gray-50">
      <div className="px-8 py-6">
        {/* Top Actions Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search all columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80 border border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="border border-gray-200"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
            {sortedFIRs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={allExpanded ? collapseAll : expandAll}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {allExpanded ? (
                  <>
                    <ChevronRight className="h-4 w-4 mr-1.5" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1.5" />
                    Expand All
                  </>
                )}
              </Button>
            )}
          </div>

          <Button
            onClick={() => navigate('/lers/portal/create')}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Requests List */}
        <Card className="bg-white border border-gray-200 shadow-sm w-full h-[calc(100vh-16rem)] flex flex-col">
          <CardContent className="p-0 w-full flex-1 overflow-y-auto">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 px-6">
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
              <div className="w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {/* Request # Column */}
                      <th className="px-4 py-3 text-left relative">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleSort('request_number')}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                          >
                            Request #
                            {getSortIcon('request_number')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFilter('request_number')
                            }}
                            className={`p-1 hover:bg-gray-200 rounded ${requestNumberSearch ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {openFilterColumn === 'request_number' && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl p-2 z-[100] w-48">
                            <Input
                              placeholder="Search..."
                              value={requestNumberSearch}
                              onChange={(e) => setRequestNumberSearch(e.target.value)}
                              className="text-sm h-8"
                              autoFocus
                            />
                          </div>
                        )}
                      </th>

                      {/* Provider Column */}
                      <th className="px-4 py-3 text-left relative">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleSort('provider')}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                          >
                            Provider
                            {getSortIcon('provider')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFilter('provider')
                            }}
                            className={`p-1 hover:bg-gray-200 rounded ${providerFilter !== 'ALL' ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {openFilterColumn === 'provider' && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl p-2 z-[100] w-48 max-h-60 overflow-y-auto">
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={providerFilter === 'ALL'}
                                onChange={() => setProviderFilter('ALL')}
                                className="w-3.5 h-3.5"
                              />
                              <span>(All)</span>
                            </label>
                            {uniqueProviders.map((provider) => (
                              <label key={provider} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                                <input
                                  type="radio"
                                  checked={providerFilter === provider}
                                  onChange={() => setProviderFilter(provider)}
                                  className="w-3.5 h-3.5"
                                />
                                <span>{provider}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </th>

                      {/* Type Column */}
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-semibold text-gray-700 uppercase">Type</span>
                      </th>

                      {/* Case Column */}
                      <th className="px-4 py-3 text-left relative">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-700 uppercase">Case</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFilter('case')
                            }}
                            className={`p-1 hover:bg-gray-200 rounded ${caseNumberSearch ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {openFilterColumn === 'case' && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl p-2 z-[100] w-48">
                            <Input
                              placeholder="Search..."
                              value={caseNumberSearch}
                              onChange={(e) => setCaseNumberSearch(e.target.value)}
                              className="text-sm h-8"
                              autoFocus
                            />
                          </div>
                        )}
                      </th>

                      {/* Created Column */}
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                        >
                          Created
                          {getSortIcon('created_at')}
                        </button>
                      </th>

                      {/* SLA Due Column */}
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('sla_due_date')}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                        >
                          SLA Due
                          {getSortIcon('sla_due_date')}
                        </button>
                      </th>

                      {/* Priority Column */}
                      <th className="px-4 py-3 text-left relative">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleSort('priority')}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                          >
                            Priority
                            {getSortIcon('priority')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFilter('priority')
                            }}
                            className={`p-1 hover:bg-gray-200 rounded ${priorityFilter !== 'ALL' ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {openFilterColumn === 'priority' && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl p-2 z-[100] w-48">
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={priorityFilter === 'ALL'}
                                onChange={() => setPriorityFilter('ALL')}
                                className="w-3.5 h-3.5"
                              />
                              <span>(All)</span>
                            </label>
                            {uniquePriorities.map((priority) => (
                              <label key={priority} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                                <input
                                  type="radio"
                                  checked={priorityFilter === priority}
                                  onChange={() => setPriorityFilter(priority)}
                                  className="w-3.5 h-3.5"
                                />
                                <span>{priority}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </th>

                      {/* Status Column */}
                      <th className="px-4 py-3 text-left relative">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleSort('status')}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                          >
                            Status
                            {getSortIcon('status')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFilter('status')
                            }}
                            className={`p-1 hover:bg-gray-200 rounded ${statusFilter !== 'ALL' ? 'text-blue-600' : 'text-gray-500'}`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {openFilterColumn === 'status' && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl p-2 z-[100] w-48">
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={statusFilter === 'ALL'}
                                onChange={() => setStatusFilter('ALL')}
                                className="w-3.5 h-3.5"
                              />
                              <span>(All)</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={statusFilter === 'DRAFT'}
                                onChange={() => setStatusFilter('DRAFT')}
                                className="w-3.5 h-3.5"
                              />
                              <span>Draft</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={statusFilter === 'PENDING_APPROVAL'}
                                onChange={() => setStatusFilter('PENDING_APPROVAL')}
                                className="w-3.5 h-3.5"
                              />
                              <span>Pending Approval</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={statusFilter === 'IN_PROGRESS'}
                                onChange={() => setStatusFilter('IN_PROGRESS')}
                                className="w-3.5 h-3.5"
                              />
                              <span>In Progress</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={statusFilter === 'COMPLETED'}
                                onChange={() => setStatusFilter('COMPLETED')}
                                className="w-3.5 h-3.5"
                              />
                              <span>Completed</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input
                                type="radio"
                                checked={statusFilter === 'REJECTED'}
                                onChange={() => setStatusFilter('REJECTED')}
                                className="w-3.5 h-3.5"
                              />
                              <span>Rejected</span>
                            </label>
                          </div>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFIRs.map((firNumber: string) => {
                      const firRequests = groupedByFIR[firNumber];
                      const isExpanded = expandedFIRs.has(firNumber);
                      const pendingCount = firRequests.filter((r: any) =>
                        r.status === 'SUBMITTED' || r.status === 'ACKNOWLEDGED' || r.status === 'IN_PROGRESS'
                      ).length;
                      const overdueCount = firRequests.filter((r: any) => r.sla_breached).length;

                      return (
                        <React.Fragment key={firNumber}>
                          {/* FIR Header Row */}
                          <tr
                            className="bg-gray-100 hover:bg-gray-200 cursor-pointer border-b border-gray-200"
                            onClick={() => toggleFIR(firNumber)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-6 h-6">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-600" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-600" />
                                  )}
                                </div>
                                <Folder className="h-5 w-5 text-gray-600" />
                                <span className="text-sm font-extrabold text-gray-900">{firNumber}</span>
                                <span className="text-xs text-gray-500">
                                  ({firRequests.length} request{firRequests.length !== 1 ? 's' : ''})
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3">
                              {!isExpanded && (
                                <div className="flex items-center gap-2 justify-end">
                                  {overdueCount > 0 && (
                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                      {overdueCount} Overdue
                                    </Badge>
                                  )}
                                  {pendingCount > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                                      {pendingCount} Pending
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Nested Requests */}
                          {isExpanded && firRequests.map((request: any, idx: number) => {
                            const isLast = idx === firRequests.length - 1;
                      const daysUntilDue = request.sla_due_date
                        ? Math.ceil((new Date(request.sla_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : null;

                      return (
                        <tr
                          key={request.id}
                          className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors bg-white"
                          onClick={() => navigate(`/lers/portal/requests/${request.id}`)}
                        >
                          <td className="px-4 py-3 pl-16">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-600 flex-shrink-0" />
                              <span className="text-sm font-extrabold text-gray-900">{request.request_number}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{request.provider}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{request.request_type_display}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700 font-medium">{request.case_number || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {request.sla_due_date ? (
                              <div className="flex items-center gap-1.5">
                                <Clock className={`h-3.5 w-3.5 ${
                                  request.sla_breached ? 'text-red-500' :
                                  daysUntilDue && daysUntilDue <= 1 ? 'text-orange-500' :
                                  'text-blue-500'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  request.sla_breached ? 'text-red-600' :
                                  daysUntilDue && daysUntilDue <= 1 ? 'text-orange-600' :
                                  'text-gray-600'
                                }`}>
                                  {request.sla_breached ? 'OVERDUE' :
                                   daysUntilDue === 0 ? 'Today' :
                                   daysUntilDue === 1 ? 'Tomorrow' :
                                   `${daysUntilDue} days`
                                  }
                                </span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`border px-2 py-0.5 text-xs font-medium ${
                              request.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                              request.priority === 'URGENT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              request.priority === 'HIGH' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {request.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <Badge className={`${getStatusColor(request.status)} border px-2 py-0.5 text-xs font-medium`}>
                                {request.status_display}
                              </Badge>
                              {request.sla_breached && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
