import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { formatDateTime } from '../../lib/utils'

interface AuditLog {
  id: string
  timestamp: string
  actor: {
    id: string
    name: string
    email: string
    role: string
  }
  action: string
  resource_type: string
  resource_id: string
  changes?: Record<string, { old: any; new: any }>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

interface AuditLogViewerProps {
  logs: AuditLog[]
  title?: string
  showFilters?: boolean
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  logs,
  title = 'Audit Log',
  showFilters = true
}) => {
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterResource, setFilterResource] = useState<string>('')

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return '➕'
    if (action.includes('UPDATE') || action.includes('MODIFY')) return '✏️'
    if (action.includes('DELETE')) return '🗑️'
    if (action.includes('VIEW') || action.includes('ACCESS')) return '👁️'
    if (action.includes('DOWNLOAD')) return '⬇️'
    if (action.includes('UPLOAD')) return '⬆️'
    if (action.includes('APPROVE')) return '✅'
    if (action.includes('REJECT')) return '❌'
    if (action.includes('SHARE')) return '🔗'
    return '📝'
  }

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50'
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50'
    if (action.includes('UPDATE')) return 'text-slate-700 bg-slate-50'
    if (action.includes('APPROVE')) return 'text-green-600 bg-green-50'
    if (action.includes('REJECT')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const filteredLogs = logs.filter(log => {
    const matchesAction = !filterAction || log.action.includes(filterAction)
    const matchesResource = !filterResource || log.resource_type === filterResource
    return matchesAction && matchesResource
  })

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))
  const uniqueResources = Array.from(new Set(logs.map(l => l.resource_type)))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                Download JSON
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-b">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Filter by Action</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Filter by Resource</label>
                <select
                  value={filterResource}
                  onChange={(e) => setFilterResource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Resources</option>
                  {uniqueResources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredLogs.map((log, idx) => (
          <Card key={log.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  {idx < filteredLogs.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">
                        {log.action.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDateTime(log.timestamp)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.resource_type}
                    </Badge>
                  </div>

                  {/* Actor Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                      {log.actor.name.charAt(0)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{log.actor.name}</span>
                      <span className="text-gray-500"> · </span>
                      <span className="text-gray-600">{log.actor.role}</span>
                    </div>
                  </div>

                  {/* Changes */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm mt-2">
                      <p className="font-medium text-gray-700 mb-2">Changes:</p>
                      <div className="space-y-1">
                        {Object.entries(log.changes).map(([field, change]) => (
                          <div key={field} className="flex gap-2 text-xs">
                            <span className="font-mono text-gray-600">{field}:</span>
                            <span className="line-through text-red-600">{JSON.stringify(change.old)}</span>
                            <span>→</span>
                            <span className="text-green-600">{JSON.stringify(change.new)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {log.ip_address && (
                    <div className="text-xs text-gray-500 mt-2">
                      🌐 IP: {log.ip_address}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <p className="text-lg">No audit logs found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

