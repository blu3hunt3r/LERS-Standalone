import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { formatDateTime } from '../../lib/utils'

interface CustodyRecord {
  id: string
  timestamp: string
  action: 'COLLECTED' | 'UPLOADED' | 'ACCESSED' | 'DOWNLOADED' | 'MODIFIED' | 'SHARED' | 'VERIFIED'
  actor: {
    id: string
    name: string
    role: string
    badge_number?: string
  }
  location?: string
  reason?: string
  hash_before?: string
  hash_after?: string
  signature?: string
  witness?: {
    name: string
    badge_number: string
  }
}

interface ChainOfCustodyProps {
  evidenceId: string
  evidenceName: string
  currentHash: string
  records: CustodyRecord[]
}

export const ChainOfCustody: React.FC<ChainOfCustodyProps> = ({
  evidenceId,
  evidenceName,
  currentHash,
  records
}) => {
  const getActionIcon = (action: CustodyRecord['action']) => {
    switch (action) {
      case 'COLLECTED': return '🔍'
      case 'UPLOADED': return '⬆️'
      case 'ACCESSED': return '👁️'
      case 'DOWNLOADED': return '⬇️'
      case 'MODIFIED': return '✏️'
      case 'SHARED': return '🔗'
      case 'VERIFIED': return '✅'
      default: return '📝'
    }
  }

  const getActionColor = (action: CustodyRecord['action']) => {
    switch (action) {
      case 'COLLECTED': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'UPLOADED': return 'bg-green-100 text-green-700 border-green-200'
      case 'ACCESSED': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'DOWNLOADED': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MODIFIED': return 'bg-red-100 text-red-700 border-red-200'
      case 'SHARED': return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'VERIFIED': return 'bg-teal-100 text-teal-700 border-teal-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const isIntegrityBroken = records.some((record, idx) => {
    if (idx === 0) return false
    const prevRecord = records[idx - 1]
    return prevRecord.hash_after && record.hash_before && 
           prevRecord.hash_after !== record.hash_before
  })

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔐</span>
            <span>Chain of Custody</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Evidence ID</p>
              <p className="font-mono text-sm font-medium">{evidenceId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Evidence Name</p>
              <p className="font-medium">{evidenceName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Hash (SHA-256)</p>
              <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                {currentHash}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">Integrity Status:</p>
              {isIntegrityBroken ? (
                <Badge variant="destructive">
                  ❌ INTEGRITY COMPROMISED
                </Badge>
              ) : (
                <Badge variant="success">
                  ✅ VERIFIED
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">Total Events:</p>
              <Badge variant="outline">{records.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        {records.map((record, idx) => {
          const hashMismatch = idx > 0 && records[idx - 1].hash_after && 
                               record.hash_before && 
                               records[idx - 1].hash_after !== record.hash_before

          return (
            <Card key={record.id} className={hashMismatch ? 'border-2 border-red-500' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Timeline Indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl ${getActionColor(record.action)}`}>
                      {getActionIcon(record.action)}
                    </div>
                    {idx < records.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-2 ${hashMismatch ? 'bg-red-500' : 'bg-gray-300'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-base text-gray-900">
                          {record.action}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(record.timestamp)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Event #{records.length - idx}
                      </Badge>
                    </div>

                    {/* Actor Details */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{record.actor.name}</p>
                          <p className="text-xs text-gray-600">{record.actor.role}</p>
                          {record.actor.badge_number && (
                            <p className="text-xs text-gray-500 font-mono">
                              Badge: {record.actor.badge_number}
                            </p>
                          )}
                        </div>
                        {record.location && (
                          <div className="text-xs text-gray-600">
                            📍 {record.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    {record.reason && (
                      <div className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Reason:</span> {record.reason}
                      </div>
                    )}

                    {/* Hashes */}
                    {(record.hash_before || record.hash_after) && (
                      <div className="space-y-2 text-xs">
                        {record.hash_before && (
                          <div>
                            <p className="text-gray-600">Hash Before:</p>
                            <p className="font-mono bg-gray-50 p-1 rounded break-all">
                              {record.hash_before}
                            </p>
                          </div>
                        )}
                        {record.hash_after && (
                          <div>
                            <p className="text-gray-600">Hash After:</p>
                            <p className="font-mono bg-gray-50 p-1 rounded break-all">
                              {record.hash_after}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Digital Signature */}
                    {record.signature && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2 text-xs text-green-700">
                          <span>✅</span>
                          <span>Digitally Signed</span>
                        </div>
                      </div>
                    )}

                    {/* Witness */}
                    {record.witness && (
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Witness:</span> {record.witness.name} 
                        (Badge: {record.witness.badge_number})
                      </div>
                    )}

                    {/* Hash Mismatch Warning */}
                    {hashMismatch && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2 text-sm text-red-700">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <p className="font-semibold">INTEGRITY BREACH DETECTED</p>
                            <p className="text-xs">
                              Hash mismatch with previous event. Evidence may have been tampered with.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {records.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <p className="text-lg">No custody records found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

