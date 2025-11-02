import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import {
  Phone, CreditCard, User, Mail, MapPin, Hash, Shield, CheckCircle,
  Eye, Send, Link2, AlertTriangle, Clock, FileText, X
} from 'lucide-react'

interface EntityCardDrawerProps {
  isOpen: boolean
  onClose: () => void
  entity: any
  onSendLERS?: (entityId: string, requestType: string) => void
  onRevealPII?: (entityId: string) => void
  onMergeEntity?: (entityId: string) => void
  onWatchEntity?: (entityId: string) => void
}

export default function EntityCardDrawer({
  isOpen,
  onClose,
  entity,
  onSendLERS,
  onRevealPII,
  onMergeEntity,
  onWatchEntity
}: EntityCardDrawerProps) {
  const [showRawValue, setShowRawValue] = useState(false)

  if (!entity) return null

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'phone':
      case 'imei':
        return <Phone className="h-5 w-5" />
      case 'account':
      case 'upi':
        return <CreditCard className="h-5 w-5" />
      case 'person':
        return <User className="h-5 w-5" />
      case 'email':
        return <Mail className="h-5 w-5" />
      case 'ip_address':
        return <MapPin className="h-5 w-5" />
      default:
        return <Hash className="h-5 w-5" />
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'phone':
      case 'imei':
        return 'text-slate-700 bg-slate-50'
      case 'account':
      case 'upi':
        return 'text-green-600 bg-green-50'
      case 'person':
        return 'text-slate-700 bg-slate-50'
      case 'email':
        return 'text-orange-600 bg-orange-50'
      case 'ip_address':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500 text-white'
    if (confidence >= 0.7) return 'bg-yellow-500 text-white'
    return 'bg-orange-500 text-white'
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[580px] sm:w-[640px] p-0 overflow-y-auto">
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2.5 rounded-lg ${getIconColor(entity.entity_type)}`}>
                {getEntityIcon(entity.entity_type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <SheetTitle className="text-lg font-bold text-gray-900">
                    {entity.display_value || entity.normalized_value}
                  </SheetTitle>
                  {entity.verified && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {entity.entity_type?.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Badge className={`text-xs ${getConfidenceColor(entity.confidence || 0)}`}>
                    {Math.round((entity.confidence || 0) * 100)}% Confidence
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Quick Facts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Facts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Source</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-slate-700"
                  onClick={() => {/* Navigate to evidence file */}}
                >
                  {entity.source_file?.file_name || 'Evidence_001.pdf'}
                </Button>
              </div>
              {entity.source_line_number && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Line Number</span>
                  <span className="font-medium text-gray-900">{entity.source_line_number}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Last Seen</span>
                <span className="font-medium text-gray-900">
                  {new Date(entity.created_at).toLocaleDateString()}
                </span>
              </div>
              {entity.owner_hint && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Owner Hint</span>
                  <span className="font-medium text-gray-900">{entity.owner_hint}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* AI Notes & Evidence Pointers */}
          {entity.ai_notes && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-700" />
                  AI Analysis
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <p className="text-purple-900">{entity.ai_notes}</p>
                </div>
                {entity.evidence_pointers && entity.evidence_pointers.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {entity.evidence_pointers.map((pointer: string, idx: number) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs text-gray-700 hover:text-slate-700"
                      >
                        <FileText className="h-3 w-3 mr-2" />
                        {pointer}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Activity Timeline (Mini) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-700" />
              Activity Timeline
            </h3>
            <ol className="relative border-l border-gray-200 ml-3 space-y-4">
              <li className="ml-4">
                <div className="absolute w-3 h-3 bg-slate-600 rounded-full -left-1.5 border border-white"></div>
                <time className="text-xs text-gray-500">2 hours ago</time>
                <p className="text-sm text-gray-900">Extracted from CDR data</p>
              </li>
              <li className="ml-4">
                <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-1.5 border border-white"></div>
                <time className="text-xs text-gray-500">5 hours ago</time>
                <p className="text-sm text-gray-900">Found in bank statement</p>
              </li>
            </ol>
          </div>

          <Separator />

          {/* Cross-Case Matches */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-orange-600" />
              Cross-Case Matches
              <Badge className="bg-orange-500 text-white">
                {entity.cross_case_count || 3}
              </Badge>
            </h3>
            <div className="space-y-2">
              {[
                { case: 'FIR-456/2024', station: 'Mumbai PS', role: 'Suspect' },
                { case: 'FIR-789/2024', station: 'Delhi PS', role: 'Victim' },
                { case: 'FIR-321/2024', station: 'Bangalore PS', role: 'Witness' }
              ].map((match, idx) => (
                <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-gray-900">{match.case}</p>
                    <Badge variant="outline" className="text-xs">{match.role}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">{match.station}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 text-xs"
                    onClick={() => {/* Request details */}}
                  >
                    Request Details
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions & Requests */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              {entity.entity_type === 'phone' && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onSendLERS?.(entity.id, 'CDR')}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Request CDR
                </Button>
              )}
              {(entity.entity_type === 'account' || entity.entity_type === 'upi') && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onSendLERS?.(entity.id, 'STATEMENTS')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Request Statements
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onSendLERS?.(entity.id, 'KYC')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Request KYC
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onWatchEntity?.(entity.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Create Watch Alert
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onMergeEntity?.(entity.id)}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Merge with Another Entity
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  onRevealPII?.(entity.id)
                  setShowRawValue(true)
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Reveal Raw Value (PII)
              </Button>
            </div>
          </div>

          {/* Raw Value (if revealed) */}
          {showRawValue && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="font-semibold text-sm text-red-900">PII Revealed</p>
              </div>
              <p className="text-sm text-red-800 mb-2">
                Raw Value: <span className="font-mono font-bold">{entity.normalized_value}</span>
              </p>
              <p className="text-xs text-red-700">
                Revealed by Officer A on {new Date().toLocaleString()}. All access is logged.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

