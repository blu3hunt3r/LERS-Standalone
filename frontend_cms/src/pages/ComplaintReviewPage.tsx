import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  Save,
  Send,
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ExtractedData {
  id: string;
  upload: string;
  complaint_text: string;
  complainant_name: string;
  complainant_phone: string;
  complainant_email: string;
  complainant_address: string;
  incident_date: string;
  incident_location: string;
  suggested_category: string;
  confidence_score: number;
  entities_found: {
    persons?: any[];
    accounts?: any[];
    devices?: any[];
    phones?: string[];
    emails?: string[];
    amounts?: string[];
  };
  review_status: string;
  reviewer_notes: string;
}

const ComplaintReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ExtractedData>>({});

  useEffect(() => {
    loadExtractedData();
  }, [id]);

  const loadExtractedData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/ingestion/extracted/?upload=${id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      
      const extracted = response.data.results?.[0] || response.data[0];
      if (extracted) {
        setData(extracted);
        setEditedData(extracted);
      }
    } catch (err) {
      console.error('Failed to load extracted data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `${API_BASE_URL}/api/v1/ingestion/extracted/${data?.id}/`,
        editedData,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      alert('Changes saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCase = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/ingestion/extracted/${data?.id}/confirm/`,
        {
          create_case: true,
          reviewer_notes: editedData.reviewer_notes || '',
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      
      alert('Case created successfully!');
      navigate(`/cases/${response.data.case_id}`);
    } catch (err) {
      console.error('Case creation error:', err);
      alert('Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-700 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-700">Extracted data not found</p>
          <Button onClick={() => navigate('/complaints')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6 lg:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Complaint</h1>
            <p className="text-sm text-gray-600 mt-1">
              Verify extracted data and create case
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onClick={handleCreateCase}
              disabled={creating || data.review_status === 'CONFIRMED'}
              className="bg-slate-700 hover:bg-slate-800"
            >
              <Send className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Case'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Confidence Score */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Extraction Quality
                  </CardTitle>
                  <Badge className={getConfidenceColor(data.confidence_score)}>
                    {(data.confidence_score * 100).toFixed(0)}% Confidence
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Complainant Details */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-slate-700" />
                  Complainant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Name</Label>
                  <Input
                    value={editedData.complainant_name || ''}
                    onChange={(e) => setEditedData({ ...editedData, complainant_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Phone
                    </Label>
                    <Input
                      value={editedData.complainant_phone || ''}
                      onChange={(e) => setEditedData({ ...editedData, complainant_phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      value={editedData.complainant_email || ''}
                      onChange={(e) => setEditedData({ ...editedData, complainant_email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    value={editedData.complainant_address || ''}
                    onChange={(e) => setEditedData({ ...editedData, complainant_address: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Incident Details */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Incident Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={editedData.incident_date || ''}
                      onChange={(e) => setEditedData({ ...editedData, incident_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <Input
                      value={editedData.incident_location || ''}
                      onChange={(e) => setEditedData({ ...editedData, incident_location: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Suggested Category
                  </Label>
                  <Input
                    value={editedData.suggested_category || ''}
                    onChange={(e) => setEditedData({ ...editedData, suggested_category: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Complaint Text */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                  Complaint Description
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <textarea
                  value={editedData.complaint_text || ''}
                  onChange={(e) => setEditedData({ ...editedData, complaint_text: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </CardContent>
            </Card>

            {/* Reviewer Notes */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-base font-semibold">
                  Reviewer Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <textarea
                  value={editedData.reviewer_notes || ''}
                  onChange={(e) => setEditedData({ ...editedData, reviewer_notes: e.target.value })}
                  rows={4}
                  placeholder="Add any notes or observations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Extracted Entities */}
          <div className="space-y-6">
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-base font-semibold">
                  Extracted Entities
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {data.entities_found?.phones && data.entities_found.phones.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Phone Numbers ({data.entities_found.phones.length})
                    </h4>
                    <div className="space-y-1">
                      {data.entities_found.phones.map((phone, idx) => (
                        <div key={idx} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {phone}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.entities_found?.emails && data.entities_found.emails.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email Addresses ({data.entities_found.emails.length})
                    </h4>
                    <div className="space-y-1">
                      {data.entities_found.emails.map((email, idx) => (
                        <div key={idx} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded break-all">
                          {email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.entities_found?.amounts && data.entities_found.amounts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Amounts ({data.entities_found.amounts.length})
                    </h4>
                    <div className="space-y-1">
                      {data.entities_found.amounts.map((amount, idx) => (
                        <div key={idx} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          ₹{amount}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintReviewPage;

