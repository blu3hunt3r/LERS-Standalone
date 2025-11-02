import React, { useEffect, useState } from 'react'
import { getTimeRemaining } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

interface SLACountdownProps {
  dueDate: string
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  className?: string
  showIcon?: boolean
}

export const SLACountdown: React.FC<SLACountdownProps> = ({
  dueDate,
  priority = 'MEDIUM',
  className,
  showIcon = true
}) => {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(dueDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(dueDate))
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [dueDate])

  const getVariant = () => {
    if (timeLeft.isOverdue) return 'destructive'
    if (timeLeft.days === 0 && timeLeft.hours < 6) return 'destructive'
    if (timeLeft.days === 0) return 'warning'
    if (timeLeft.days <= 1) return 'warning'
    return 'success'
  }

  const getIcon = () => {
    if (timeLeft.isOverdue) return '🚨'
    if (timeLeft.days === 0) return '⚠️'
    return '⏱️'
  }

  const formatTime = () => {
    if (timeLeft.isOverdue) {
      return 'OVERDUE'
    }
    
    const parts = []
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`)
    if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`)
    parts.push(`${timeLeft.minutes}m`)
    
    return parts.join(' ')
  }

  return (
    <Badge
      variant={getVariant()}
      className={cn('text-xs font-semibold', className)}
    >
      {showIcon && <span className="mr-1">{getIcon()}</span>}
      {formatTime()}
    </Badge>
  )
}

interface SLADashboardCardProps {
  title: string
  dueDate: string
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  requestId: string
  provider: string
  onClick?: () => void
}

export const SLADashboardCard: React.FC<SLADashboardCardProps> = ({
  title,
  dueDate,
  priority,
  status,
  requestId,
  provider,
  onClick
}) => {
  const timeLeft = getTimeRemaining(dueDate)
  
  const getPriorityColor = () => {
    switch (priority) {
      case 'URGENT': return 'border-l-red-500'
      case 'HIGH': return 'border-l-orange-500'
      case 'MEDIUM': return 'border-l-yellow-500'
      case 'LOW': return 'border-l-green-500'
      default: return 'border-l-gray-500'
    }
  }

  return (
    <div
      className={cn(
        'border-l-4 bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow',
        getPriorityColor()
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">{requestId}</p>
        </div>
        <SLACountdown dueDate={dueDate} priority={priority} />
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-600 mt-3">
        <span className="flex items-center gap-1">
          <span>🏢</span>
          <span>{provider}</span>
        </span>
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      </div>

      {timeLeft.isOverdue && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ⚠️ SLA Breach: Action Required
        </div>
      )}
    </div>
  )
}

