import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ComplaintUpload {
  id: string;
  file_name: string;
  file_hash: string;
  status: string;
  extraction_progress: number;
  created_at: string;
  processed_at?: string;
}

interface ExtractedData {
  id: string;
  upload: string;
  complaint_text: string;
  complainant_name: string;
  complainant_phone: string;
  complainant_email: string;
  incident_date: string;
  suggested_category: string;
  confidence_score: number;
  entities_found: any;
  review_status: string;
}

const ComplaintIngestionPage: React.FC = () => {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<ComplaintUpload[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('auto_process', 'true');

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/ingestion/uploads/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Add to uploads list
      setUploads([response.data, ...uploads]);
      setSelectedFile(null);
      
      // Start polling for processing status
      pollProcessingStatus(response.data.id);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload complaint');
    } finally {
      setUploading(false);
    }
  };

  const pollProcessingStatus = async (uploadId: string) => {
    const token = localStorage.getItem('accessToken');
    
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/ingestion/uploads/${uploadId}/status/`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );

        // Update upload in list
        setUploads(prevUploads =>
          prevUploads.map(u => u.id === uploadId ? response.data : u)
        );

        // Stop polling if completed or failed
        if (['COMPLETED', 'FAILED'].includes(response.data.status)) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Status polling error:', err);
        clearInterval(interval);
      }
    }, 2000);
  };

  const loadUploads = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/ingestion/uploads/`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      setUploads(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    }
  };

  React.useEffect(() => {
    loadUploads();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-slate-100 text-slate-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PROCESSING':
        return <div className="animate-spin h-5 w-5 border-2 border-slate-700 border-t-transparent rounded-full" />;
      case 'FAILED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6 lg:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Complaint Ingestion</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload complaint PDFs from 1930 portal for automated processing
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6 border border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5 text-slate-700" />
              Upload Complaint PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum file size: 10MB
                  </p>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-slate-700 hover:bg-slate-800"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Uploading & Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Uploads List */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-base font-semibold">
              Recent Uploads ({uploads.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {uploads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm">No complaints uploaded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(upload.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {upload.file_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-xs ${getStatusColor(upload.status)}`}>
                              {upload.status}
                            </Badge>
                            {upload.status === 'PROCESSING' && (
                              <div className="flex-1 max-w-xs">
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-slate-700 transition-all duration-500"
                                    style={{ width: `${upload.extraction_progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {new Date(upload.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {upload.status === 'COMPLETED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/complaints/${upload.id}/review`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplaintIngestionPage;

