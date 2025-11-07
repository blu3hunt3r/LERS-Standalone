/**
 * Provider Inbox - FIR-grouped cascading dropdown design
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Eye,
  MessageSquare,
  Upload,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  AlertCircle,
  CheckCircle,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { lersService } from '@/services/lersService';

type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export default function ProviderInbox() {
  const navigate = useNavigate();
  const [expandedFIRs, setExpandedFIRs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Fetch real LERS requests from backend
  const { data, isLoading } = useQuery({
    queryKey: ['provider-lers-requests'],
    queryFn: async () => {
      const response = await lersService.getRequests({});
      return response;
    },
  });

  // Get all requests
  const allRequests = data?.results || [];

  // Filter by status based on selected filter
  const filteredByStatus = allRequests.filter((r: any) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') {
      return r.status === 'SUBMITTED' || r.status === 'APPROVED' || r.status === 'ACKNOWLEDGED';
    }
    if (statusFilter === 'IN_PROGRESS') {
      return r.status === 'IN_PROGRESS';
    }
    if (statusFilter === 'COMPLETED') {
      return r.status === 'RESPONSE_UPLOADED' || r.status === 'COMPLETED';
    }
    return true;
  });

  // Apply search filter
  const filteredRequests = filteredByStatus.filter((r: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.request_number?.toLowerCase().includes(query) ||
      r.case_number?.toLowerCase().includes(query) ||
      r.request_type_display?.toLowerCase().includes(query)
    );
  });

  // Group requests by FIR (case_number)
  const groupedByFIR = filteredRequests.reduce((acc: any, request: any) => {
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

  const expandAll = () => {
    setExpandedFIRs(new Set(sortedFIRs));
  };

  const collapseAll = () => {
    setExpandedFIRs(new Set());
  };

  const allExpanded = sortedFIRs.length > 0 && expandedFIRs.size === sortedFIRs.length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'URGENT':
        return 'bg-orange-500';
      case 'HIGH':
        return 'bg-yellow-500';
      case 'NORMAL':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESPONSE_UPLOADED':
      case 'COMPLETED':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'SUBMITTED':
      case 'APPROVED':
      case 'ACKNOWLEDGED':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'URGENT':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'HIGH':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'NORMAL':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getFIRCardStyle = (requests: any[]) => {
    const hasOverdue = requests.some((r: any) => r.sla_breached);
    const hasInProgress = requests.some((r: any) => r.status === 'IN_PROGRESS');
    const allCompleted = requests.every((r: any) =>
      r.status === 'RESPONSE_UPLOADED' || r.status === 'COMPLETED'
    );

    if (hasOverdue) {
      return 'border-l-4 border-l-red-500 bg-red-50/20';
    } else if (allCompleted) {
      return 'border-l-4 border-l-green-500 bg-green-50/20';
    } else if (hasInProgress) {
      return 'border-l-4 border-l-amber-500 bg-amber-50/20';
    } else {
      return 'border-l-4 border-l-blue-500 bg-blue-50/20';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  // Calculate stats (always from all requests, not filtered)
  const stats = {
    total: allRequests.length,
    pending: allRequests.filter((r: any) =>
      r.status === 'SUBMITTED' || r.status === 'APPROVED' || r.status === 'ACKNOWLEDGED'
    ).length,
    inProgress: allRequests.filter((r: any) => r.status === 'IN_PROGRESS').length,
    completed: allRequests.filter((r: any) =>
      r.status === 'RESPONSE_UPLOADED' || r.status === 'COMPLETED'
    ).length,
    overdue: allRequests.filter((r: any) => r.sla_breached).length,
  };

  const getFilterButtonClass = (filter: StatusFilter) => {
    const isActive = statusFilter === filter;
    return `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-gray-900 text-white'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">All Requests</h1>
            <p className="text-sm text-gray-500 mt-1">LERS requests grouped by FIR number</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={getFilterButtonClass('ALL')}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={getFilterButtonClass('PENDING')}
                >
                  Pending ({stats.pending})
                </button>
                <button
                  onClick={() => setStatusFilter('IN_PROGRESS')}
                  className={getFilterButtonClass('IN_PROGRESS')}
                >
                  In Progress ({stats.inProgress})
                </button>
                <button
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={getFilterButtonClass('COMPLETED')}
                >
                  Completed ({stats.completed})
                </button>
              </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by FIR number, request number, or type..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* FIR-Grouped Cascading Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              FIR CASES ({sortedFIRs.length} FIRs, {filteredRequests.length} Requests{statusFilter !== 'ALL' ? ` - ${statusFilter.replace('_', ' ')}` : ''})
            </h2>
          </div>

          {filteredRequests.length === 0 ? (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No requests found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchQuery
                      ? 'Try adjusting your search or filter'
                      : statusFilter !== 'ALL'
                        ? `No ${statusFilter.toLowerCase().replace('_', ' ')} requests`
                        : 'New LERS requests will appear here'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          FIR Number
                        </th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Requests
                        </th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3.5"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
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
                              className="bg-gray-100 hover:bg-gray-200 cursor-pointer"
                              onClick={() => toggleFIR(firNumber)}
                            >
                              <td className="px-4 py-3.5">
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
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-gray-600">
                                {firRequests.length} request{firRequests.length !== 1 ? 's' : ''}
                              </td>
                              <td className="px-4 py-3.5">
                                {!isExpanded && (
                                  <div className="flex items-center gap-2">
                                    {overdueCount > 0 && (
                                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs px-2 py-0.5">
                                        {overdueCount} Overdue
                                      </Badge>
                                    )}
                                    {pendingCount > 0 && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs px-2 py-0.5">
                                        {pendingCount} Pending
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5"></td>
                            </tr>

                    {/* Nested Requests - Beautiful Link Style with L-shaped Connectors */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <div className="border-t border-gray-200 bg-white relative">
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
                              className={`relative bg-white hover:bg-gray-50 transition-colors group ${
                                !isLast ? 'border-b border-gray-100' : ''
                              }`}
                              style={{ zIndex: 1 }}
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
                                    <h4
                                      className="text-sm font-extrabold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                                      onClick={() => navigate(`/lers/provider/requests/${request.id}`)}
                                    >
                                      {request.request_number}
                                    </h4>
                                    <Badge variant="outline" className={`text-xs ${getStatusColor(request.status)}`}>
                                      {request.status_display}
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs ${getPriorityBadgeColor(request.priority)}`}>
                                      {request.priority}
                                    </Badge>
                                    {request.sla_breached && (
                                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 font-medium">
                                        OVERDUE
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">{request.request_type_display}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Created {new Date(request.created_at).toLocaleDateString()} •
                                    {request.sla_breached ? (
                                      <span className="text-red-600 font-medium"> OVERDUE</span>
                                    ) : (
                                      ` Due in ${request.days_until_due} days`
                                    )}
                                  </p>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    onClick={() => navigate(`/lers/provider/requests/${request.id}?tab=chat`)}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                    Chat
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    onClick={() => navigate(`/lers/provider/requests/${request.id}?tab=upload`)}
                                  >
                                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                                    Upload
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    onClick={() => navigate(`/lers/provider/requests/${request.id}`)}
                                  >
                                    View Details
                                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                          </div>
                        </td>
                      </tr>
                    )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
