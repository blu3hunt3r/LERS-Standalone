import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Lightbulb, MapPin, User, Calendar, DollarSign, AlertTriangle,
  Save, Edit, Zap, CheckCircle, FileText, Edit2
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'react-toastify'

interface CaseDetailsTabProps {
  caseId: string
  caseData: any
}

export default function CaseDetailsTab({ caseId, caseData }: CaseDetailsTabProps) {
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [editedData, setEditedData] = useState({
    complainant: caseData.complainant_masked || '',
    reportedDate: caseData.reported_date || '',
    financialLoss: caseData.financial_loss || 0,
    location: caseData.incident_location || '',
    description: caseData.description || '',
    category: caseData.crime_category || '',
    subCategory: caseData.sub_category || '',
    assignedTo: caseData.assigned_to || '',
    incidentDate: caseData.incident_date || ''
  })

  // Mock AI suggestions
  const mockAISuggestions = [
    {
      id: '1',
      priority: 'HIGH',
      action: 'Request CDR for +91-98765-43210',
      reason: 'Phone number found in 3 other fraud cases with similar MO',
      confidence: 95,
      evidence: ['Screenshot_001.jpg']
    },
    {
      id: '2',
      priority: 'URGENT',
      action: 'Freeze ICICI Bank Account ****1234',
      reason: 'Detected structuring pattern - 5 transactions of ₹49,999 each within 2 hours',
      confidence: 92,
      evidence: ['Bank_Statement.pdf']
    }
  ]

  const handleSaveNotes = () => {
    toast.success('Notes saved successfully')
    setIsEditingNotes(false)
  }

  const handleSaveSummary = () => {
    toast.success('Case summary updated successfully')
    setIsEditingSummary(false)
  }

  const handleAIAction = (suggestion: any) => {
    toast.info(`Executing: ${suggestion.action}`)
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-6 space-y-6">
        
        {/* Main Content - Single Column */}
        <div className="space-y-6">
            
            {/* Case Summary Card - Editable */}
            <Card>
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Case Summary</CardTitle>
                  {!isEditingSummary ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingSummary(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveSummary}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingSummary(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isEditingSummary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Complainant</label>
                        <Input
                          value={editedData.complainant}
                          onChange={(e) => setEditedData({ ...editedData, complainant: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Reported Date</label>
                        <Input
                          type="date"
                          value={editedData.reportedDate}
                          onChange={(e) => setEditedData({ ...editedData, reportedDate: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Financial Loss (₹)</label>
                        <Input
                          type="number"
                          value={editedData.financialLoss}
                          onChange={(e) => setEditedData({ ...editedData, financialLoss: Number(e.target.value) })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Location</label>
                        <Input
                          value={editedData.location}
                          onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase block mb-1">Description</label>
                      <Textarea
                        value={editedData.description}
                        onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Crime Category</label>
                        <Input
                          value={editedData.category}
                          onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Sub-Category</label>
                        <Input
                          value={editedData.subCategory}
                          onChange={(e) => setEditedData({ ...editedData, subCategory: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Assigned To</label>
                        <Input
                          value={editedData.assignedTo}
                          onChange={(e) => setEditedData({ ...editedData, assignedTo: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase block mb-1">Incident Date</label>
                        <Input
                          type="date"
                          value={editedData.incidentDate}
                          onChange={(e) => setEditedData({ ...editedData, incidentDate: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Compact 4-column grid for all fields */}
                    <div className="grid grid-cols-4 gap-x-6 gap-y-4 mb-6">
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Complainant</div>
                        <p className="text-sm font-normal text-gray-900">{caseData.complainant_masked || 'N/A'}</p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Reported Date</div>
                        <p className="text-sm font-normal text-gray-900">{formatDate(caseData.reported_date)}</p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Financial Loss</div>
                        <p className="text-sm font-normal text-red-600">
                          ₹{caseData.financial_loss?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Location</div>
                        <p className="text-sm font-normal text-gray-900">{caseData.incident_location || 'N/A'}</p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Category</div>
                        <p className="text-sm font-normal text-gray-900">
                          {caseData.crime_category?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Sub-Category</div>
                        <p className="text-sm font-normal text-gray-900">
                          {caseData.sub_category || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Assigned To</div>
                        <p className="text-sm font-normal text-gray-900">
                          {(caseData.assigned_to as any)?.full_name || caseData.assigned_to || 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Incident Date</div>
                        <p className="text-sm font-normal text-gray-900">
                          {caseData.incident_date ? formatDate(caseData.incident_date) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="text-xs font-normal text-gray-500 uppercase tracking-wide mb-3">Description</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{caseData.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Investigation Notes */}
            <Card>
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Investigation Notes</CardTitle>
                  {!isEditingNotes && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isEditingNotes ? (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add your investigation notes here..."
                      rows={8}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Notes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingNotes(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    {notes || 'No notes added yet. Click "Edit" to add your investigation notes.'}
                  </div>
                )}
              </CardContent>
            </Card>

          {/* AI Assistant - Below everything */}
          <Card className="border-l-4 border-l-slate-700">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-slate-700" />
                  AI Assisted Actions
                </CardTitle>
                <Badge className="bg-slate-100 text-slate-800">
                  {mockAISuggestions.length} suggestions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {mockAISuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-4 rounded-lg border ${
                      suggestion.priority === 'URGENT'
                        ? 'border-red-200 bg-red-50'
                        : 'border-orange-200 bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={`text-xs ${
                          suggestion.priority === 'URGENT'
                            ? 'bg-red-600'
                            : 'bg-orange-600'
                        } text-white`}
                      >
                        {suggestion.priority}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {suggestion.confidence}% confidence
                      </span>
                    </div>

                    <h4 className="font-normal text-sm text-gray-900 mb-2">
                      {suggestion.action}
                    </h4>

                    <div className="bg-white p-2 rounded text-xs text-gray-700 mb-3">
                      <span className="font-medium">Why: </span>
                      {suggestion.reason}
                    </div>

                    {suggestion.evidence && suggestion.evidence.length > 0 && (
                      <div className="text-xs text-gray-600 mb-3">
                        <span className="font-medium">Evidence: </span>
                        {suggestion.evidence.join(', ')}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className={`w-full ${
                        suggestion.priority === 'URGENT'
                          ? 'text-red-600 border-red-300 hover:bg-red-50'
                          : 'text-orange-600 border-orange-300 hover:bg-orange-50'
                      }`}
                      onClick={() => handleAIAction(suggestion)}
                    >
                      <Zap className="mr-2 h-3 w-3" />
                      Execute Action
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
