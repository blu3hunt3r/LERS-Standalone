/**
 * Provider Dashboard
 * 
 * Overview dashboard for data providers showing:
 * - Request statistics
 * - SLA performance metrics
 * - Recent activity
 * - Quick actions
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';

const ProviderDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - replace with actual API calls
  const stats = {
    total_requests: 156,
    pending: 12,
    in_progress: 8,
    completed: 136,
    overdue: 3,
    sla_compliance: 94,
    avg_response_time: 18, // hours
    requests_this_week: 23,
    requests_last_week: 19,
  };

  const recentActivity = [
    { id: '1', request_number: 'LERS-2025-0142', action: 'Response uploaded', time: '2 hours ago', status: 'completed' },
    { id: '2', request_number: 'LERS-2025-0141', action: 'Acknowledged', time: '4 hours ago', status: 'acknowledged' },
    { id: '3', request_number: 'LERS-2025-0140', action: 'New request received', time: '6 hours ago', status: 'new' },
    { id: '4', request_number: 'LERS-2025-0139', action: 'Response uploaded', time: '1 day ago', status: 'completed' },
    { id: '5', request_number: 'LERS-2025-0138', action: 'SLA breach', time: '2 days ago', status: 'overdue' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Pending Requests</div>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.pending}</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400">+4</span>
            <span className="text-slate-500">from last week</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">In Progress</div>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.in_progress}</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className="text-slate-500">Average: {stats.avg_response_time}h</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-green-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Completed</div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-green-400">+12</span>
            <span className="text-slate-500">this week</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Overdue</div>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-red-400">Needs attention</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* SLA Performance */}
        <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              SLA Performance
            </h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-4xl font-bold text-green-400">{stats.sla_compliance}%</div>
                <div className="text-sm text-slate-400">compliance rate</div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{ width: `${stats.sla_compliance}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-1">Within SLA</div>
                <div className="text-2xl font-bold text-green-400">
                  {Math.floor((stats.completed * stats.sla_compliance) / 100)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-1">SLA Breaches</div>
                <div className="text-2xl font-bold text-red-400">
                  {stats.completed - Math.floor((stats.completed * stats.sla_compliance) / 100)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-1">Avg Response Time</div>
                <div className="text-2xl font-bold text-blue-400">{stats.avg_response_time}h</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-100">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            <button
              onClick={() => navigate('/provider/inbox')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-white" />
              <div>
                <div className="text-sm font-medium text-white">View Pending</div>
                <div className="text-xs text-blue-200">{stats.pending} requests</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/provider/upload')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-slate-300" />
              <div>
                <div className="text-sm font-medium text-slate-200">Upload Response</div>
                <div className="text-xs text-slate-400">Quick upload</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/provider/templates')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
            >
              <FileText className="w-5 h-5 text-slate-300" />
              <div>
                <div className="text-sm font-medium text-slate-200">Response Templates</div>
                <div className="text-xs text-slate-400">Manage templates</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-slate-700">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="px-4 py-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/provider/requests/${activity.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                    activity.status === 'acknowledged' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{activity.request_number}</div>
                    <div className="text-xs text-slate-400">{activity.action}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;

