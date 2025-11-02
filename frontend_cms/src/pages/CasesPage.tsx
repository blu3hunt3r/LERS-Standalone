import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseService } from '../services/caseService'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { formatDate } from '../lib/utils'
import { 
  Plus, Search, Filter, Loader2, MoreVertical
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATION', label: 'Investigation' },
  { value: 'CLOSED', label: 'Closed' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priority' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

export default function CasesPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: casesData, isLoading } = useQuery({
    queryKey: ['cases', filters],
    queryFn: () => caseService.getCases({
      ...filters,
      search: filters.search || undefined
    })
  })

  const cases = casesData?.results || []

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'OPEN': return 'open'
      case 'INVESTIGATION': return 'investigation'
      case 'CLOSED': return 'closed'
      case 'PENDING_APPROVAL': return 'pending'
      default: return 'secondary'
    }
  }

  const getPriorityVariant = (priority: string): any => {
    switch (priority) {
      case 'CRITICAL': return 'critical'
      case 'HIGH': return 'high'
      case 'MEDIUM': return 'medium'
      case 'LOW': return 'low'
      default: return 'secondary'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 m-4 shadow-sm">
      {/* Search and Filters Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search cases by number, title, or complainant..."
              className="pl-10"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button 
            onClick={() => navigate('/cases/create')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <div className="mt-4 flex items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-normal text-gray-900 mb-2">
              No Cases Found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Get started by creating your first case
            </p>
            <Button onClick={() => navigate('/cases/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Case
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case Number
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crime Category
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Loss
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reported Date
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cases.map((caseItem: any) => (
                <tr 
                  key={caseItem.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                >
                  {/* Status */}
                  <td className="py-4 px-6">
                    <Badge variant={getStatusVariant(caseItem.status)}>
                      {caseItem.status_display}
                    </Badge>
                  </td>

                  {/* Case Number */}
                  <td className="py-4 px-6">
                    <div className="text-sm font-normal text-slate-700 hover:text-slate-800">
                      {caseItem.case_number}
                    </div>
                    {caseItem.fir_number && (
                      <div className="text-xs text-gray-500 mt-0.5">FIR: {caseItem.fir_number}</div>
                    )}
                  </td>

                  {/* Title */}
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {caseItem.title}
                    </div>
                  </td>

                  {/* Crime Category */}
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-700">
                      {caseItem.crime_category_display}
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-4 px-6">
                    <Badge variant={getPriorityVariant(caseItem.priority)}>
                      {caseItem.priority_display}
                    </Badge>
                  </td>

                  {/* Financial Loss */}
                  <td className="py-4 px-6">
                    {caseItem.financial_loss ? (
                      <div className="text-sm font-normal text-red-600">
                        ₹{caseItem.financial_loss.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  {/* Reported Date */}
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-700">
                      {formatDate(caseItem.reported_date || caseItem.created_at)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Show menu
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
