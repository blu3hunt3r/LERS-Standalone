import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search, Filter, Download
} from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'

interface TimelineTabProps {
  caseId: string
}

export default function TimelineTab({ caseId }: TimelineTabProps) {
  // Mock audit log data
  const mockAuditLogs = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      action: 'CASE_CREATED',
      user: 'IO Rajesh Kumar',
      description: 'Case created with FIR number FIR-123/2024',
      ip_address: '192.168.1.100'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      action: 'EVIDENCE_UPLOADED',
      user: 'IO Rajesh Kumar',
      description: 'Uploaded 3 evidence files',
      ip_address: '192.168.1.100'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      action: 'ENTITY_EXTRACTED',
      user: 'AI Parser Service',
      description: 'Extracted 8 entities from uploaded evidence',
      ip_address: 'system'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      action: 'LERS_REQUEST_CREATED',
      user: 'IO Rajesh Kumar',
      description: 'Created LERS request LR-001 for Airtel (CDR)',
      ip_address: '192.168.1.100'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      action: 'LERS_RESPONSE_RECEIVED',
      user: 'ICICI Bank',
      description: 'Response uploaded for LERS request LR-002',
      ip_address: '203.45.67.89'
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      action: 'PII_REVEALED',
      user: 'IO Rajesh Kumar',
      description: 'Revealed PII for phone number +91-98765-43210',
      ip_address: '192.168.1.100'
    },
    {
      id: '7',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      action: 'ENTITY_MERGED',
      user: 'IO Rajesh Kumar',
      description: 'Merged duplicate entities',
      ip_address: '192.168.1.100'
    },
    {
      id: '8',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      action: 'CASE_UPDATED',
      user: 'IO Rajesh Kumar',
      description: 'Updated case priority from MEDIUM to HIGH',
      ip_address: '192.168.1.100'
    },
  ]

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED')) return 'bg-slate-100 text-slate-800'
    if (action.includes('UPLOADED') || action.includes('RECEIVED')) return 'bg-green-100 text-green-800'
    if (action.includes('EXTRACTED') || action.includes('MERGED')) return 'bg-slate-100 text-slate-800'
    if (action.includes('PII')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search audit logs..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockAuditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                {/* Time */}
                <td className="py-3 px-6 text-sm text-gray-600 whitespace-nowrap">
                  {formatDistanceToNowStrict(log.timestamp, { addSuffix: true })}
                </td>

                {/* Action */}
                <td className="py-3 px-6">
                  <Badge className={`text-xs ${getActionBadge(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </Badge>
                </td>

                {/* Description */}
                <td className="py-3 px-6 text-sm text-gray-900">
                  {log.description}
                </td>

                {/* User */}
                <td className="py-3 px-6 text-sm text-gray-700">
                  {log.user}
                </td>

                {/* IP Address */}
                <td className="py-3 px-6 text-sm text-gray-600 font-mono">
                  {log.ip_address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
