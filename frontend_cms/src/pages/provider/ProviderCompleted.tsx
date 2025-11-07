/**
 * Provider Completed - Shows RESPONSE_UPLOADED requests only
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  CheckCircle,
  Download,
  Loader2,
  ArrowRight,
  FileText,
  Folder,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { lersService } from '@/services/lersService';

export default function ProviderCompleted() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedFIRs, setExpandedFIRs] = React.useState<Set<string>>(new Set());

  // Fetch real LERS requests from backend
  const { data, isLoading } = useQuery({
    queryKey: ['provider-lers-completed'],
    queryFn: async () => {
      const response = await lersService.getRequests({});
      return response;
    },
  });

  // Filter for RESPONSE_UPLOADED only
  const allRequests = (data?.results || []).filter((r: any) => r.status === 'RESPONSE_UPLOADED');

  // Apply search filter
  const filteredRequests = allRequests.filter((r: any) => {
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
    const firNumber = request.case_number || 'Unknown FIR';
    if (!acc[firNumber]) {
      acc[firNumber] = [];
    }
    acc[firNumber].push(request);
    return acc;
  }, {});

  const sortedFIRs = Object.keys(groupedByFIR).sort();

  const toggleFIR = (firNumber: string) => {
    const newExpanded = new Set(expandedFIRs);
    if (newExpanded.has(firNumber)) {
      newExpanded.delete(firNumber);
    } else {
      newExpanded.add(firNumber);
    }
    setExpandedFIRs(newExpanded);
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'URGENT':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'HIGH':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = () => {
    return 'bg-green-100 text-green-700 border-green-200';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Completed</h1>
            <p className="text-sm text-gray-500 mt-1">
              {sortedFIRs.length} FIR{sortedFIRs.length !== 1 ? 's' : ''}, {filteredRequests.length} Request{filteredRequests.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by request number, FIR number, or type..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FIR Grouped Requests Table */}
        {filteredRequests.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <CheckCircle className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-600">No completed requests yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Requests with uploaded responses will appear here'}
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

                      return (
                        <React.Fragment key={firNumber}>
                          {/* FIR Header Row */}
                          <tr
                            className="hover:bg-gray-50 cursor-pointer"
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
                                <span className="text-sm font-semibold text-gray-900">{firNumber}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-gray-600">
                              {firRequests.length} request{firRequests.length !== 1 ? 's' : ''}
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs px-2 py-0.5">
                                <CheckCircle className="h-3 w-3 mr-1 inline" />
                                {firRequests.length} Completed
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5"></td>
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
                                        className={`relative hover:bg-white transition-colors group ${
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
                                                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                                                onClick={() => navigate(`/lers/provider/requests/${request.id}`)}
                                              >
                                                {request.request_number}
                                              </h4>
                                              <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
                                                <CheckCircle className="h-3 w-3 mr-1 inline" />
                                                COMPLETED
                                              </Badge>
                                              <Badge variant="outline" className={`text-xs ${getPriorityBadgeColor(request.priority)}`}>
                                                {request.priority}
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600">{request.request_type_display}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Completed {new Date(request.created_at).toLocaleDateString()}
                                            </p>
                                          </div>

                                          {/* Quick Actions */}
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                              onClick={() => {
                                                // Download functionality
                                              }}
                                            >
                                              <Download className="h-3.5 w-3.5 mr-1.5" />
                                              Download
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
  );
}
