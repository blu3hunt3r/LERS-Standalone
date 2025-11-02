/**
 * Provider Inbox Page
 * 
 * Shows incoming LERS requests that need provider response.
 * Features:
 * - Filterable list of incoming requests
 * - Priority indicators
 * - SLA countdown
 * - Quick actions (View, Respond, Acknowledge)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  MessageSquare,
  CheckCircle,
  SortDesc,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import lersService from '@/services/lersService';

interface LERSRequest {
  id: string;
  request_number: string;
  request_type: string;
  case: {
    case_number: string;
    fir_number: string;
  };
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: string;
  created_at: string;
  sla_due_date?: string;
  unread_messages?: number;
}

const ProviderInbox: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'sla' | 'priority' | 'newest'>('sla');

  // Fetch incoming requests (TODO: replace with actual provider-specific endpoint)
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['provider-inbox', priorityFilter, sortBy],
    queryFn: async () => {
      // TODO: Create provider-specific endpoint
      // For now, using mock data
      return [] as LERSRequest[];
    },
  });

  // Get SLA status
  const getSLAStatus = (sla_due_date?: string): { status: string; color: string; hoursLeft: number } => {
    if (!sla_due_date) return { status: 'No SLA', color: 'text-slate-400', hoursLeft: 0 };

    const now = new Date();
    const deadline = new Date(sla_due_date);
    const hoursLeft = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursLeft < 0) {
      return { status: 'Overdue', color: 'text-red-400', hoursLeft };
    } else if (hoursLeft < 2) {
      return { status: 'Critical', color: 'text-orange-400', hoursLeft };
    } else if (hoursLeft < 6) {
      return { status: 'Warning', color: 'text-yellow-400', hoursLeft };
    }

    return { status: 'On Time', color: 'text-green-400', hoursLeft };
  };

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  // Handle quick actions
  const handleView = (requestId: string) => {
    navigate(`/provider/requests/${requestId}`);
  };

  const handleAcknowledge = async (requestId: string) => {
    // TODO: API call to acknowledge receipt
    console.log('Acknowledge:', requestId);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <FileText className="w-4 h-4" />
            <span>New Requests</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">12</div>
        </div>

        <div className="bg-slate-800 border border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Overdue</span>
          </div>
          <div className="text-2xl font-bold text-red-400">3</div>
        </div>

        <div className="bg-slate-800 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>Due Today</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">5</div>
        </div>

        <div className="bg-slate-800 border border-green-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>On Time</span>
          </div>
          <div className="text-2xl font-bold text-green-400">4</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by request number, case number, or FIR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-blue-500"
        >
          <option value="sla">Sort by SLA</option>
          <option value="priority">Sort by Priority</option>
          <option value="newest">Sort by Newest</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-200 mb-2">All caught up!</h3>
            <p className="text-sm text-slate-400">No pending requests at the moment.</p>
          </div>
        ) : (
          requests.map((request) => {
            const slaStatus = getSLAStatus(request.sla_due_date);

            return (
              <div
                key={request.id}
                className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-4 transition-colors cursor-pointer"
                onClick={() => handleView(request.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Indicator */}
                  <div className={`w-1 h-full rounded-full ${
                    request.priority === 'URGENT' ? 'bg-red-500' :
                    request.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-slate-100">
                            {request.request_number}
                          </h3>
                          <span className={`px-2 py-0.5 border rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                          </span>
                          {request.unread_messages && request.unread_messages > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded text-xs font-medium">
                              <MessageSquare className="w-3 h-3" />
                              {request.unread_messages}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {request.request_type.replace(/_/g, ' ')} • Case: {request.case.case_number}
                        </div>
                      </div>

                      {/* SLA Status */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-semibold ${slaStatus.color}`}>
                          {slaStatus.status}
                        </div>
                        {slaStatus.hoursLeft !== 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {slaStatus.hoursLeft > 0
                              ? `${slaStatus.hoursLeft}h remaining`
                              : `${Math.abs(slaStatus.hoursLeft)}h overdue`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span>FIR: {request.case.fir_number}</span>
                      <span>•</span>
                      <span>Received {formatDistanceToNow(new Date(request.created_at))} ago</span>
                      {request.sla_due_date && (
                        <>
                          <span>•</span>
                          <span>Due: {format(new Date(request.sla_due_date), 'MMM dd, HH:mm')}</span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(request.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledge(request.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium text-slate-200 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/provider/requests/${request.id}/chat`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium text-slate-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProviderInbox;

