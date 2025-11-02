import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseService } from '../services/caseService'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { formatDate } from '../lib/utils'
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Star,
  Send,
  Eye,
  FolderOpen,
  ExternalLink
} from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState<string[]>(['1', '2', '3', '4'])
  const [completedTasks, setCompletedTasks] = useState<string[]>([])

  const { data: statistics } = useQuery({
    queryKey: ['caseStatistics'],
    queryFn: caseService.getStatistics
  })

  const { data: casesData } = useQuery({
    queryKey: ['recentCases'],
    queryFn: () => caseService.getCases({ limit: 20 })
  })

  const recentCases = casesData?.results || []
  
  const urgentCases = recentCases.filter((c: any) => c.priority === 'CRITICAL' || c.priority === 'HIGH').slice(0, 3)
  const activeCases = recentCases.filter((c: any) => c.status === 'INVESTIGATION' || c.status === 'OPEN').slice(0, 18)
  const watchlistCases = recentCases.filter((c: any) => watchlist.includes(c.id.toString()))

  // Generate intelligent ongoing tasks from active cases
  const generateOngoingTasks = () => {
    const tasks: Array<{ id: string; text: string; caseId: string; priority: string }> = []
    
    activeCases.forEach((case_: any) => {
      const caseNum = case_.case_number
      const crimeType = case_.crime_category_display
      
      // Generate task based on case status and data
      if (case_.status === 'OPEN') {
        tasks.push({
          id: `${case_.id}-review`,
          text: `Review & start investigation - ${caseNum} (${crimeType})`,
          caseId: case_.id,
          priority: case_.priority
        })
      } else if (case_.status === 'INVESTIGATION') {
        // Check what's missing
        if (!case_.evidence_count || case_.evidence_count < 2) {
          tasks.push({
            id: `${case_.id}-evidence`,
            text: `Upload evidence documents - ${caseNum}`,
            caseId: case_.id,
            priority: case_.priority
          })
        }
        if (case_.priority === 'HIGH' || case_.priority === 'CRITICAL') {
          tasks.push({
            id: `${case_.id}-lers`,
            text: `Submit LERS request - ${caseNum} (${crimeType})`,
            caseId: case_.id,
            priority: case_.priority
          })
        }
      }
    })

    // Sort by priority
    return tasks.sort((a, b) => {
      const priorityOrder: any = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }).slice(0, 8)
  }

  const ongoingTasks = generateOngoingTasks()

  const toggleTask = (taskId: string) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter(id => id !== taskId))
    } else {
      setCompletedTasks([...completedTasks, taskId])
    }
  }

  const toggleWatchlist = (caseId: string) => {
    if (watchlist.includes(caseId)) {
      setWatchlist(watchlist.filter(id => id !== caseId))
    } else {
      setWatchlist([...watchlist, caseId])
    }
  }

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'OPEN': return 'open'
      case 'INVESTIGATION': return 'investigation'
      case 'CLOSED': return 'closed'
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

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-green-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-full px-6 py-6 space-y-6">
        
        {/* Top Stats - Subtle like reference */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cases</p>
                  <p className="text-2xl font-medium text-gray-900 mt-1">{statistics?.total || 127}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Open</p>
                  <p className="text-2xl font-medium text-slate-700 mt-1">{(statistics as any)?.open || 23}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-slate-50 flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</p>
                  <p className="text-2xl font-medium text-amber-600 mt-1">{(statistics as any)?.investigation || 18}</p>
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
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Closed</p>
                  <p className="text-2xl font-medium text-green-600 mt-1">{(statistics as any)?.closed || 86}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Active Cases */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-900">My Active Cases ({activeCases.length})</h2>
              <Button onClick={() => navigate('/cases/create')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Register New Case
              </Button>
            </div>

            <div className="space-y-3">
              {activeCases.slice(0, 5).map((case_: any) => (
                <div 
                  key={case_.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/cases/${case_.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityDot(case_.priority)}`} />
                      <span className="text-sm font-normal text-gray-900">{case_.case_number}</span>
                      <Badge variant={getStatusVariant(case_.status)}>
                        {case_.status}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleWatchlist(case_.id.toString())
                        }}
                        className="ml-auto"
                      >
                        <Star 
                          className={`h-4 w-4 ${watchlist.includes(case_.id.toString()) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} 
                        />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 font-medium mb-1">{case_.title}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>Date: {formatDate(case_.created_at)}</span>
                    {case_.financial_loss && (
                      <span className="text-red-600 font-medium">Loss: ₹{case_.financial_loss.toLocaleString()}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {case_.evidence_count || 2} documents
                    </span>
                    <span>Next: Review evidence & submit LERS</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/cases/${case_.id}`) }}>
                      Open Case
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Evidence
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
                      <Send className="h-3 w-3 mr-1" />
                      Request LERS
                    </Button>
                  </div>
                </div>
              ))}

              {activeCases.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/cases')}>
                  Show {activeCases.length - 5} more cases →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cases in Watchlist - Always show */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Cases in Watchlist ({watchlistCases.length})
              </h2>
              <span className="text-xs text-gray-500">Click star on any case to add</span>
            </div>

            {watchlistCases.length > 0 ? (
              <div className="space-y-3">
                {watchlistCases.map((case_: any) => (
                  <div 
                    key={case_.id} 
                    className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => navigate(`/cases/${case_.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getPriorityDot(case_.priority)}`} />
                          <span className="text-sm font-normal text-gray-900">{case_.case_number}</span>
                          <Badge variant="outline" className={`text-xs ${getStatusBadge(case_.status)}`}>
                            {case_.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-white border-gray-300">{case_.crime_category_display}</Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{case_.title}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>📅 {formatDate(case_.created_at)}</span>
                          {case_.financial_loss && (
                            <span className="text-red-600 font-medium">₹{case_.financial_loss.toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 italic">
                          ⭐ Watchlisted: {case_.priority === 'CRITICAL' ? 'Urgent attention required' : case_.priority === 'HIGH' ? 'Important case monitoring' : 'Regular monitoring'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => { 
                            e.stopPropagation()
                            toggleWatchlist(case_.id.toString())
                          }}
                        >
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          Remove
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/cases/${case_.id}`) }}>
                          Open →
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">No cases in watchlist</p>
                <p className="text-xs text-gray-500">Click the star icon on any case to add it to your watchlist</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Station Summary */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Station Summary</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-sm text-gray-500 mb-1">This Month</p>
                <p className="text-lg font-medium text-gray-900">34 new cases</p>
                <p className="text-xs text-gray-500">28 closed | 6 pending</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Most Common</p>
                <p className="text-lg font-medium text-gray-900">UPI Fraud (42%)</p>
                <p className="text-xs text-gray-500">Avg resolution: 21 days</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending</p>
                <p className="text-lg font-medium text-gray-900">12 LERS requests</p>
                <p className="text-xs text-gray-500">8 court hearings scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
