import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Download, Share, AlertCircle, RefreshCw, Settings
} from 'lucide-react'
import { toast } from 'react-toastify'
import { caseService } from '@/services/caseService'
import { lersService } from '@/services/lersService'
import entityService from '@/services/entityService'
import EntityCardDrawer from '@/components/EntityCardDrawer'
import RevealPIIModal from '@/components/RevealPIIModal'
import MergeEntitiesModal from '@/components/MergeEntitiesModal'
import CourtBundleExportModal from '@/components/CourtBundleExportModal'
import { formatDate } from '@/lib/utils'

// Import tab content components
import CaseDetailsTab from '@/components/case-tabs/CaseDetailsTab'
import EntitiesTab from '@/components/case-tabs/EntitiesTab'
import LERSRequestsTab from '@/components/case-tabs/LERSRequestsTab'
import InvestigationWorkbenchTab from '@/components/case-tabs/InvestigationWorkbenchTab'
import TimelineTab from '@/components/case-tabs/TimelineTab'

export default function UnifiedCaseCommandCenter() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Tab state - Overview first, then Graph
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'entities' | 'lers' | 'history'>('overview')

  // Modal states
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [isEntityDrawerOpen, setIsEntityDrawerOpen] = useState(false)
  const [isRevealPIIModalOpen, setIsRevealPIIModalOpen] = useState(false)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Fetch case details
  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseService.getCase(id!),
    enabled: !!id
  })

  // Handle entity actions
  const handleEntityAction = async (_action: string, entity: any) => {
    setSelectedEntity(entity)
    setIsEntityDrawerOpen(true)
  }

  const handleEntityDrawerAction = async (_entityId: string, requestType: string) => {
    try {
      await lersService.smartCreateFromEntity({
        entity_hash: selectedEntity?.value_hash,
        entity_type: selectedEntity?.entity_type,
        case_id: id!,
        request_type: requestType,
        provider_id: 'AUTO_DETECT'
      })
      toast.success('LERS request created!')
    } catch (error) {
      toast.error('Failed to create request')
    }
  }

  const handleRevealPII = async (_entityId: string) => {
    setIsRevealPIIModalOpen(true)
  }

  const handleRevealPIISubmit = async (justification: string, supervisorOTP: string) => {
    try {
      await entityService.revealPII(selectedEntity.id, { justification, supervisor_otp: supervisorOTP })
      toast.success('PII revealed successfully')
    } catch (error) {
      toast.error('Failed to reveal PII')
      throw error
    }
  }

  const handleMergeEntity = async (_entityId: string) => {
    setIsMergeModalOpen(true)
  }

  const handleMergeSubmit = async (sourceId: string, targetId: string, reason: string) => {
    try {
      await entityService.mergeEntities({ source_id: sourceId, target_id: targetId, reason })
      toast.success('Entities merged successfully')
    } catch (error) {
      toast.error('Failed to merge entities')
      throw error
    }
  }

  const handleWatchEntity = async (_entityId: string) => {
    try {
      await entityService.watchlist.createWatch(selectedEntity.value_hash, {
        watch_scope: 'station',
        reason: 'Added to watchlist',
        risk_level: 'MEDIUM',
        alert_on_new_case: true
      })
      toast.success('Entity added to watchlist')
    } catch (error) {
      toast.error('Failed to add to watchlist')
    }
  }

  const handleExportCase = async (_exportConfig: any) => {
    try {
      toast.info('Export feature in development')
      return 'https://example.com/export.pdf'
    } catch (error) {
      toast.error('Failed to export case')
      throw error
    }
  }

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
      case 'LOW': return 'low'
      case 'MEDIUM': return 'medium'
      case 'HIGH': return 'high'
      case 'CRITICAL': return 'critical'
      default: return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600 text-sm">Loading case...</p>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">Case Not Found</h2>
          <p className="text-gray-600 mb-4">
            The case you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/cases')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cases
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        {/* Top Bar */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/cases')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-medium text-gray-900">Case #{caseData.case_number}</h1>
              <Badge variant={getStatusVariant(caseData.status)}>
                {caseData.status}
              </Badge>
              <Badge variant={getPriorityVariant(caseData.priority)}>
                {caseData.priority}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsExportModalOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" variant="ghost">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Horizontal Tab Navigation - Pill Style */}
        <div className="px-6 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                activeTab === 'overview'
                  ? 'font-semibold text-slate-900 bg-slate-50'
                  : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                activeTab === 'graph'
                  ? 'font-semibold text-slate-900 bg-slate-50'
                  : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Investigation Bench
            </button>
            <button
              onClick={() => setActiveTab('entities')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                activeTab === 'entities'
                  ? 'font-semibold text-slate-900 bg-slate-50'
                  : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Entities
            </button>
            <button
              onClick={() => setActiveTab('lers')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                activeTab === 'lers'
                  ? 'font-semibold text-slate-900 bg-slate-50'
                  : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              LERS Requests
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                activeTab === 'history'
                  ? 'font-semibold text-slate-900 bg-slate-50'
                  : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {activeTab === 'overview' && (
          <CaseDetailsTab caseId={id!} caseData={caseData} />
        )}
        {activeTab === 'graph' && (
          <InvestigationWorkbenchTab />
        )}
        {activeTab === 'entities' && (
          <EntitiesTab caseId={id!} onEntityAction={handleEntityAction} />
        )}
        {activeTab === 'lers' && (
          <LERSRequestsTab caseId={id!} />
        )}
        {activeTab === 'history' && (
          <TimelineTab caseId={id!} />
        )}
      </div>

      {/* Modals */}
      {selectedEntity && (
        <EntityCardDrawer
          isOpen={isEntityDrawerOpen}
          onClose={() => setIsEntityDrawerOpen(false)}
          entity={selectedEntity}
          onRevealPII={handleRevealPII}
          onMergeEntity={handleMergeEntity}
          onWatchEntity={handleWatchEntity}
          onSendLERS={handleEntityDrawerAction}
        />
      )}

      <RevealPIIModal
        isOpen={isRevealPIIModalOpen}
        onClose={() => setIsRevealPIIModalOpen(false)}
        entityId={selectedEntity?.id || ''}
        entityValue={selectedEntity?.display_value || selectedEntity?.normalized_value || ''}
        entityType={selectedEntity?.entity_type || ''}
        onSubmit={handleRevealPIISubmit}
      />

      <MergeEntitiesModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        sourceEntity={selectedEntity}
        onSubmit={handleMergeSubmit}
      />

      <CourtBundleExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        caseId={id!}
        onSubmit={handleExportCase}
      />
    </div>
  )
}
