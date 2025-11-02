import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

interface ParserJob {
  id: string
  evidence_file_id: string
  file_name: string
  parser_name: string
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  started_at?: string
  completed_at?: string
  error_message?: string
  records_extracted?: number
  parser_version?: string
}

interface ParserJobStatusProps {
  job: ParserJob
  showDetails?: boolean
}

export const ParserJobStatus: React.FC<ParserJobStatusProps> = ({
  job,
  showDetails = true
}) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'QUEUED': return '⏳'
      case 'PROCESSING': return '⚙️'
      case 'COMPLETED': return '✅'
      case 'FAILED': return '❌'
      default: return '❓'
    }
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'QUEUED': return 'text-gray-600'
      case 'PROCESSING': return 'text-slate-700'
      case 'COMPLETED': return 'text-green-600'
      case 'FAILED': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getBadgeVariant = () => {
    switch (job.status) {
      case 'COMPLETED': return 'success'
      case 'FAILED': return 'destructive'
      case 'PROCESSING': return 'info'
      default: return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getStatusIcon()}</span>
            <div>
              <CardTitle className="text-base">{job.file_name}</CardTitle>
              <p className="text-sm text-gray-500">{job.parser_name}</p>
            </div>
          </div>
          <Badge variant={getBadgeVariant()}>
            {job.status}
          </Badge>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent>
          {/* Progress Bar */}
          {job.status === 'PROCESSING' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-slate-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Job Details */}
          <div className="space-y-2 text-sm">
            {job.started_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium">
                  {new Date(job.started_at).toLocaleString()}
                </span>
              </div>
            )}

            {job.completed_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">
                  {new Date(job.completed_at).toLocaleString()}
                </span>
              </div>
            )}

            {job.records_extracted !== undefined && job.status === 'COMPLETED' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Records Extracted:</span>
                <span className="font-medium text-green-600">
                  {job.records_extracted.toLocaleString()}
                </span>
              </div>
            )}

            {job.parser_version && (
              <div className="flex justify-between">
                <span className="text-gray-600">Parser Version:</span>
                <span className="font-mono text-xs">{job.parser_version}</span>
              </div>
            )}

            {job.error_message && job.status === 'FAILED' && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium mb-1">Error:</p>
                <p className="text-xs text-red-600">{job.error_message}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

interface ParserJobListProps {
  jobs: ParserJob[]
  title?: string
}

export const ParserJobList: React.FC<ParserJobListProps> = ({
  jobs,
  title = 'Parser Jobs'
}) => {
  const stats = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === 'QUEUED').length,
    processing: jobs.filter(j => j.status === 'PROCESSING').length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
    failed: jobs.filter(j => j.status === 'FAILED').length
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.queued}</p>
              <p className="text-xs text-gray-600">Queued</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-700">{stats.processing}</p>
              <p className="text-xs text-gray-600">Processing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-gray-600">Failed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      <div className="space-y-3">
        {jobs.map(job => (
          <ParserJobStatus key={job.id} job={job} />
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No parser jobs found</p>
        </div>
      )}
    </div>
  )
}

