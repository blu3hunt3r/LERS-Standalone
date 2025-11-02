import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Phone, CreditCard, Mail, User, MapPin, Hash, Search,
  Filter, AlertTriangle, CheckCircle, MoreVertical, Plus
} from 'lucide-react'

interface EntitiesTabProps {
  caseId: string
  onEntityAction: (action: string, entity: any) => void
}

export default function EntitiesTab({ caseId, onEntityAction }: EntitiesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Mock entities data
  const mockEntities = [
    { id: '1', type: 'phone', value: '+91-98765-43210', confidence: 98, verified: true, source: 'Screenshot_001.jpg', crossCaseMatches: 3, alerts: ['Seen in 3 fraud cases'] },
    { id: '2', type: 'account', value: 'ICICI****1234', confidence: 95, verified: true, source: 'Bank_Statement.pdf', crossCaseMatches: 1, alerts: ['Structuring pattern'] },
    { id: '3', type: 'email', value: 'victim@paytm', confidence: 92, verified: false, source: 'Complaint_text.pdf', crossCaseMatches: 1, alerts: [] },
    { id: '4', type: 'upi', value: '9876543210@paytm', confidence: 89, verified: false, source: 'Transaction_Screenshot.jpg', crossCaseMatches: 0, alerts: [] },
    { id: '5', type: 'person', value: 'Ravi Kumar', confidence: 85, verified: false, source: 'KYC_Document.pdf', crossCaseMatches: 2, alerts: ['Multiple aliases'] },
  ]

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />
      case 'account': return <CreditCard className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'upi': return <CreditCard className="h-4 w-4" />
      case 'person': return <User className="h-4 w-4" />
      case 'ip_address': return <MapPin className="h-4 w-4" />
      default: return <Hash className="h-4 w-4" />
    }
  }

  const filteredEntities = mockEntities.filter(entity => {
    const matchesType = selectedType === 'all' || entity.type === selectedType
    const matchesSearch = entity.value.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search entities..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cross-Case
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alerts
              </th>
              <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntities.map((entity) => (
              <tr 
                key={entity.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onEntityAction('view', entity)}
              >
                {/* Status */}
                <td className="py-4 px-6">
                  {entity.verified ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-900">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                  )}
                </td>

                {/* Type */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-slate-100 text-slate-700">
                      {getEntityIcon(entity.type)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{entity.type}</span>
                  </div>
                </td>

                {/* Value */}
                <td className="py-4 px-6">
                  <div className="text-sm font-mono text-gray-900">{entity.value}</div>
                </td>

                {/* Source */}
                <td className="py-4 px-6">
                  <div className="text-sm text-gray-600">{entity.source}</div>
                </td>

                {/* Confidence */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          entity.confidence >= 90 ? 'bg-green-500' : 
                          entity.confidence >= 70 ? 'bg-slate-600' : 'bg-orange-500'
                        }`}
                        style={{ width: `${entity.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm font-normal text-gray-900">{entity.confidence}%</span>
                  </div>
                </td>

                {/* Cross-Case */}
                <td className="py-4 px-6">
                  {entity.crossCaseMatches > 0 ? (
                    <Badge variant="warning">
                      {entity.crossCaseMatches} match{entity.crossCaseMatches > 1 ? 'es' : ''}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>

                {/* Alerts */}
                <td className="py-4 px-6">
                  {entity.alerts.length > 0 ? (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{entity.alerts[0]}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEntityAction('menu', entity)
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredEntities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Hash className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-normal text-gray-900 mb-2">
              No Entities Found
            </h3>
            <p className="text-sm text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
