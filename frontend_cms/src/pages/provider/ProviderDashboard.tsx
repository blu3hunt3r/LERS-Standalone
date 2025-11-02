/**
 * Provider Dashboard - REDESIGNED to match CMS Portal style
 * Clean, professional layout matching police CMS interface
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Upload,
  Eye,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { lersService } from '@/services/lersService';

export default function ProviderDashboard() {
  const navigate = useNavigate();

  // Fetch real LERS requests from backend
  const { data, isLoading } = useQuery({
    queryKey: ['provider-lers-dashboard'],
    queryFn: async () => {
      const response = await lersService.getRequests({});
      return response;
    },
  });

  const allRequests = data?.results || [];
  const recentRequests = allRequests.slice(0, 5);

  // Calculate real stats
  const stats = {
    pending: allRequests.filter((r: any) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length,
    inProgress: allRequests.filter((r: any) => r.status === 'IN_PROGRESS').length,
    completed: allRequests.filter((r: any) => r.status === 'RESPONSE_UPLOADED').length,
    overdue: allRequests.filter((r: any) => r.sla_breached).length,
    slaCompliance: allRequests.length > 0 
      ? Math.round((allRequests.filter((r: any) => !r.sla_breached).length / allRequests.length) * 100)
      : 100,
    slaBreaches: allRequests.filter((r: any) => r.sla_breached).length,
    avgResponseTime: 18, // Mock for now
    withinSla: allRequests.filter((r: any) => !r.sla_breached).length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESPONSE_UPLOADED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'URGENT':
      case 'HIGH':
        return 'bg-orange-500';
      case 'NORMAL':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-full px-6 py-6 space-y-6">
        
        {/* Top Stats - Matching CMS Portal Style */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Requests</p>
                  <p className="text-2xl font-medium text-gray-900 mt-1">{stats.pending}</p>
                  <p className="text-xs text-amber-600 mt-1">+4 from last week</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</p>
                  <p className="text-2xl font-medium text-amber-600 mt-1">{stats.inProgress}</p>
                  <p className="text-xs text-gray-500 mt-1">Average: {stats.avgResponseTime}h</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</p>
                  <p className="text-2xl font-medium text-green-600 mt-1">{stats.completed}</p>
                  <p className="text-xs text-green-600 mt-1">+12 this week</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</p>
                  <p className="text-2xl font-medium text-red-600 mt-1">{stats.overdue}</p>
                  <p className="text-xs text-red-600 mt-1">Needs attention</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests - Matching CMS Portal Active Cases Style */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-900">Pending LERS Requests ({stats.pending})</h2>
              <Button onClick={() => navigate('/lers/provider/inbox')} size="sm">
                <Inbox className="h-4 w-4 mr-2" />
                View All Requests
              </Button>
            </div>

            <div className="space-y-3">
              {recentRequests.slice(0, 5).map((request: any) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/lers/provider/requests/${request.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-2 h-2 rounded-full ${getPriorityDot(request.priority)}`} />
                      <span className="text-sm font-normal text-gray-900">{request.request_number}</span>
                      <Badge variant="outline" className={`text-xs ${getStatusBadge(request.status)}`}>
                        {request.status_display}
                      </Badge>
                      {request.sla_breached && (
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                          SLA Breach
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 font-medium mb-1">
                    {request.request_type_display} - Case {request.case_number}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>Provider: {request.provider}</span>
                    <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
                    <span className={request.sla_breached ? 'text-red-600 font-medium' : ''}>
                      {request.sla_breached ? 'OVERDUE' : `Due in ${request.days_until_due} days`}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lers/provider/requests/${request.id}`)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lers/provider/requests/${request.id}?tab=chat`)
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Chat
                    </Button>
                    {request.status !== 'RESPONSE_UPLOADED' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lers/provider/requests/${request.id}`)
                        }}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload Response
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {recentRequests.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/lers/provider/inbox')}>
                  Show {recentRequests.length - 5} more requests →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SLA Performance - Matching CMS Portal Station Summary Style */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">SLA Performance</h2>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-3xl font-medium text-green-600">{stats.slaCompliance}%</div>
                <div className="text-sm text-gray-500">compliance rate</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${stats.slaCompliance}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-sm text-gray-500 mb-1">Within SLA</p>
                <p className="text-lg font-medium text-gray-900">{stats.withinSla} requests</p>
                <p className="text-xs text-gray-500">On-time delivery</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">SLA Breaches</p>
                <p className="text-lg font-medium text-gray-900">{stats.slaBreaches} requests</p>
                <p className="text-xs text-gray-500">Delayed responses</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Avg Response Time</p>
                <p className="text-lg font-medium text-gray-900">{stats.avgResponseTime}h</p>
                <p className="text-xs text-gray-500">Below target of 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
