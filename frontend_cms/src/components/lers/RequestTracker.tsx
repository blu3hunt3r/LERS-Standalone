/**
 * Request Tracker Component
 * 
 * Displays SLA tracking with:
 * - Real-time countdown timer
 * - Visual progress bar
 * - Status indicators (On Time, Warning, Overdue)
 * - Timeline visualization
 * - Estimated completion date
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Calendar, TrendingUp } from 'lucide-react';
import { formatDistanceToNow, differenceInHours, differenceInMinutes, isPast, addHours, format } from 'date-fns';

interface LERSRequest {
  id: string;
  request_number: string;
  status: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  sla_due_date?: string;
  sla_hours?: number;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  completed_at?: string;
}

interface RequestTrackerProps {
  request: LERSRequest;
  className?: string;
}

const RequestTracker: React.FC<RequestTrackerProps> = ({ request, className = '' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate SLA deadline
  const getSLADeadline = (): Date | null => {
    if (request.sla_due_date) {
      return new Date(request.sla_due_date);
    }

    // Fallback: calculate from submitted_at + sla_hours
    if (request.submitted_at && request.sla_hours) {
      return addHours(new Date(request.submitted_at), request.sla_hours);
    }

    return null;
  };

  const slaDeadline = getSLADeadline();

  // Calculate time remaining
  const getTimeRemaining = (): { hours: number; minutes: number; isOverdue: boolean } => {
    if (!slaDeadline) return { hours: 0, minutes: 0, isOverdue: false };

    const now = currentTime;
    const totalMinutes = differenceInMinutes(slaDeadline, now);

    if (totalMinutes < 0) {
      const hoursOverdue = Math.abs(Math.floor(totalMinutes / 60));
      const minutesOverdue = Math.abs(totalMinutes % 60);
      return { hours: hoursOverdue, minutes: minutesOverdue, isOverdue: true };
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, isOverdue: false };
  };

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (!slaDeadline || !request.submitted_at) return 0;

    const startTime = new Date(request.submitted_at);
    const now = currentTime;
    const totalDuration = differenceInHours(slaDeadline, startTime);
    const elapsed = differenceInHours(now, startTime);

    if (elapsed >= totalDuration) return 100;
    if (elapsed <= 0) return 0;

    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  // Get status classification
  const getStatus = (): {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    textColor: string;
  } => {
    const { isOverdue } = getTimeRemaining();
    const progress = getProgressPercentage();

    // Completed
    if (request.status === 'COMPLETED' || request.completed_at) {
      return {
        label: 'Completed',
        color: 'border-green-500',
        bgColor: 'bg-green-500/20',
        icon: <CheckCircle className="w-5 h-5 text-green-400" />,
        textColor: 'text-green-400',
      };
    }

    // Overdue
    if (isOverdue) {
      return {
        label: 'Overdue',
        color: 'border-red-500',
        bgColor: 'bg-red-500/20',
        icon: <XCircle className="w-5 h-5 text-red-400" />,
        textColor: 'text-red-400',
      };
    }

    // Warning (>75% time elapsed)
    if (progress > 75) {
      return {
        label: 'Warning',
        color: 'border-yellow-500',
        bgColor: 'bg-yellow-500/20',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        textColor: 'text-yellow-400',
      };
    }

    // On Time
    return {
      label: 'On Time',
      color: 'border-blue-500',
      bgColor: 'bg-blue-500/20',
      icon: <Clock className="w-5 h-5 text-blue-400" />,
      textColor: 'text-blue-400',
    };
  };

  const timeRemaining = getTimeRemaining();
  const progress = getProgressPercentage();
  const status = getStatus();

  // Priority colors
  const getPriorityColor = () => {
    switch (request.priority) {
      case 'URGENT':
        return 'text-red-400';
      case 'HIGH':
        return 'text-orange-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className={`bg-slate-800 border-2 ${status.color} rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`${status.bgColor} border-b ${status.color} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <div className={`text-sm font-semibold ${status.textColor}`}>{status.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Request #{request.request_number}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-medium ${getPriorityColor()}`}>
              {request.priority} PRIORITY
            </div>
            {request.sla_hours && (
              <div className="text-xs text-slate-400 mt-0.5">
                {request.sla_hours}h SLA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 bg-slate-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-300">SLA Progress</span>
          <span className="text-xs font-semibold text-slate-200">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              progress > 90
                ? 'bg-red-500'
                : progress > 75
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Time Remaining / Overdue */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">Time Remaining</div>
            {timeRemaining.isOverdue ? (
              <div className="text-lg font-bold text-red-400">
                +{timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            ) : (
              <div className="text-lg font-bold text-slate-200">
                {timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            )}
            <div className="text-xs text-slate-500 mt-0.5">
              {timeRemaining.isOverdue ? 'Overdue' : 'until deadline'}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">
              {timeRemaining.isOverdue ? 'Deadline Was' : 'Deadline'}
            </div>
            {slaDeadline ? (
              <>
                <div className="text-sm font-semibold text-slate-200">
                  {format(slaDeadline, 'MMM dd, HH:mm')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatDistanceToNow(slaDeadline, { addSuffix: true })}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">Not set</div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-4 border-t border-slate-700 bg-slate-800/30">
        <div className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Request Timeline
        </div>
        <div className="space-y-2">
          {/* Created */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-slate-500 rounded-full" />
            <span className="text-slate-400">Created:</span>
            <span className="text-slate-300">{format(new Date(request.created_at), 'MMM dd, HH:mm')}</span>
          </div>

          {/* Submitted */}
          {request.submitted_at && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-slate-400">Submitted:</span>
              <span className="text-slate-300">
                {format(new Date(request.submitted_at), 'MMM dd, HH:mm')}
              </span>
            </div>
          )}

          {/* Approved */}
          {request.approved_at && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-slate-400">Approved:</span>
              <span className="text-slate-300">
                {format(new Date(request.approved_at), 'MMM dd, HH:mm')}
              </span>
            </div>
          )}

          {/* Completed */}
          {request.completed_at && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-slate-400">Completed:</span>
              <span className="text-slate-300">
                {format(new Date(request.completed_at), 'MMM dd, HH:mm')}
              </span>
            </div>
          )}

          {/* SLA Deadline */}
          {slaDeadline && (
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                timeRemaining.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
              }`} />
              <span className="text-slate-400">SLA Deadline:</span>
              <span className={timeRemaining.isOverdue ? 'text-red-400 font-semibold' : 'text-yellow-400'}>
                {format(slaDeadline, 'MMM dd, HH:mm')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {timeRemaining.isOverdue && !request.completed_at && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300">
              <strong>SLA Breach:</strong> This request is overdue by {timeRemaining.hours}h {timeRemaining.minutes}m.
              Immediate action required.
            </div>
          </div>
        </div>
      )}

      {progress > 75 && progress < 100 && !timeRemaining.isOverdue && !request.completed_at && (
        <div className="px-4 py-3 bg-yellow-500/10 border-t border-yellow-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-300">
              <strong>Warning:</strong> Less than {timeRemaining.hours} hours remaining until SLA deadline.
            </div>
          </div>
        </div>
      )}

      {request.completed_at && (
        <div className="px-4 py-3 bg-green-500/10 border-t border-green-500/30">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-300">
              <strong>Completed:</strong> Request fulfilled{' '}
              {!timeRemaining.isOverdue && 'within SLA timeframe'}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestTracker;



