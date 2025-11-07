import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { lersService } from '../services/lersService'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { formatDate } from '../lib/utils'
import { Plus, Search, Filter, ChevronDown, ChevronRight, Folder, FileText, ArrowRight, MessageSquare, Upload } from 'lucide-react'

export default function LERSRequestsPage() {
  const navigate = useNavigate()
  const [expandedFIRs, setExpandedFIRs] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['lersRequests'],
    queryFn: () => lersService.getRequests(),
  })

  const allRequests = data?.results || []

  // Group requests by FIR (case_number)
  const groupedByFIR = allRequests.reduce((acc: any, request: any) => {
    const firNumber = request.case_number || 'No FIR';
    if (!acc[firNumber]) {
      acc[firNumber] = [];
    }
    acc[firNumber].push(request);
    return acc;
  }, {});

  // Sort FIRs by most recent request
  const sortedFIRs = Object.keys(groupedByFIR).sort((a, b) => {
    const aLatest = Math.max(...groupedByFIR[a].map((r: any) => new Date(r.created_at).getTime()));
    const bLatest = Math.max(...groupedByFIR[b].map((r: any) => new Date(r.created_at).getTime()));
    return bLatest - aLatest;
  });

  const toggleFIR = (firNumber: string) => {
    const newExpanded = new Set(expandedFIRs);
    if (newExpanded.has(firNumber)) {
      newExpanded.delete(firNumber);
    } else {
      newExpanded.add(firNumber);
    }
    setExpandedFIRs(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'in_progress': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LERS Requests</h1>
          <p className="text-gray-600 mt-1">
            Manage legal requests and responses
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button size="sm" onClick={() => navigate('/requests/create')}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      {/* Requests Table */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FIR / Request Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedFIRs.length > 0 ? (
                  sortedFIRs.map((firNumber: string) => {
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
                          className="hover:bg-gray-50 cursor-pointer"
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
                              <span className="text-sm font-semibold text-gray-900">{firNumber}</span>
                              <span className="text-xs text-gray-500">
                                ({firRequests.length} request{firRequests.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
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
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>

                        {/* Nested Requests */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <div className="border-t border-gray-200 bg-gray-50/30 relative">
                                {/* Initial vertical line from FIR header to first request */}
                                <svg
                                  className="absolute left-0 top-0 pointer-events-none"
                                  width="40"
                                  height="100%"
                                  style={{ zIndex: 0 }}
                                >
                                  <line
                                    x1="32"
                                    y1="0"
                                    x2="32"
                                    y2="50"
                                    stroke="#cbd5e1"
                                    strokeWidth="1.5"
                                  />
                                </svg>

                                {firRequests.map((request: any, idx: number) => {
                                  const isLast = idx === firRequests.length - 1;

                                  return (
                                    <div
                                      key={request.id}
                                      className="relative hover:bg-white transition-colors cursor-pointer group border-b border-gray-100"
                                      style={{ zIndex: 1 }}
                                      onClick={() => navigate(`/requests/${request.id}`)}
                                    >
                                      {/* SVG L-shaped connector */}
                                      <svg
                                        className="absolute left-0 top-0 pointer-events-none"
                                        width="80"
                                        height="100%"
                                        style={{ zIndex: 0 }}
                                      >
                                        <defs>
                                          <marker
                                            id={`arrowhead-${request.id}`}
                                            markerWidth="6"
                                            markerHeight="6"
                                            refX="5"
                                            refY="2"
                                            orient="auto"
                                          >
                                            <polygon
                                              points="0 0, 6 2, 0 4"
                                              fill="#94a3b8"
                                              className="group-hover:fill-blue-500"
                                            />
                                          </marker>
                                        </defs>

                                        {/* Vertical trunk line */}
                                        <line
                                          x1="32"
                                          y1={idx === 0 ? "50" : "0"}
                                          x2="32"
                                          y2={isLast ? "50" : "100%"}
                                          stroke="#cbd5e1"
                                          strokeWidth="1.5"
                                        />

                                        {/* Horizontal line with arrow */}
                                        <path
                                          d="M 32 50 Q 32 50, 36 50 L 70 50"
                                          stroke="#cbd5e1"
                                          strokeWidth="1.5"
                                          fill="none"
                                          markerEnd={`url(#arrowhead-${request.id})`}
                                          className="group-hover:stroke-blue-400 transition-all duration-300"
                                        />
                                      </svg>
                                      <div className="flex items-center gap-4 pl-20 pr-6 py-3">
                                        {/* Request Icon */}
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors border border-gray-200 flex-shrink-0">
                                          <FileText className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                                        </div>

                                        {/* Request Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <h4 className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                              {request.request_number}
                                            </h4>
                                            <Badge variant="outline" className={`text-xs ${getStatusColor(request.status_display)}`}>
                                              {request.status_display}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-gray-600">{request.request_type_display}</p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Provider: {request.provider_name} • Created {formatDate(request.created_at)}
                                          </p>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/requests/${request.id}`);
                                            }}
                                          >
                                            View
                                          </Button>
                                          <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add New Request Button */}
                                <div className="relative p-4 bg-gray-50/50">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/requests/create?firNumber=${firNumber}`);
                                    }}
                                    className="ml-20 border-dashed border-2 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Request to {firNumber}
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <p className="text-gray-500 mb-4">No LERS requests found</p>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Request
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

