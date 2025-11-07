/**
 * Provider Request Detail - Clean CMS style
 */

import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Upload,
  Clock,
  Loader2,
  AlertTriangle,
  Download,
  X,
  CheckCircle,
  History,
  User,
  Check,
  XCircle,
  Edit,
} from 'lucide-react';
import { lersService } from '@/services/lersService';
import { evidenceService } from '@/services/evidenceService';
import LERSRequestChat from '@/components/lers/LERSRequestChat';
import { toast } from 'react-toastify';

export default function ProviderRequestDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch request details
  const { data: request, isLoading, refetch } = useQuery({
    queryKey: ['provider-lers-request', requestId],
    queryFn: () => lersService.getRequest(requestId!),
    enabled: !!requestId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full px-8 py-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Request Not Found</h3>
              <p className="text-sm text-gray-600 mb-4">
                The requested LERS request could not be found.
              </p>
              <Button onClick={() => navigate('/lers/provider/inbox')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inbox
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESPONSE_UPLOADED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'SUBMITTED':
      case 'APPROVED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'URGENT':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
      toast.success(`${files.length} file(s) selected`);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await evidenceService.downloadFile(fileId, fileName);
      toast.success(`Downloading ${fileName}...`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    if (!requestId) {
      toast.error('Invalid request ID');
      return;
    }

    setUploading(true);
    try {
      // Upload files to backend
      const result = await lersService.uploadResponseFiles(requestId, selectedFiles);

      toast.success(result.message || `${result.total_files} file(s) uploaded successfully!`);

      // Show any errors
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: any) => {
          toast.error(`Failed to upload ${err.file_name}: ${err.error}`);
        });
      }

      // Clear selected files
      setSelectedFiles([]);

      // Refresh request data to show uploaded files
      refetch();

      // Navigate to inbox or stay on page
      // navigate('/lers/provider/inbox');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to upload files';
      toast.error(errorMsg);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full px-8 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/lers/provider/inbox')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-medium text-gray-900">{request.request_number}</h1>
              <p className="text-sm text-gray-500 mt-1">{request.request_type_display}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusBadge(request.status)}`}>
              {request.status_display}
            </Badge>
            <Badge variant="outline" className={`${getPriorityBadge(request.priority)}`}>
              {request.priority}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Response
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <History className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6 space-y-6">
            {/* Request Information */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Request Information</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Number</label>
                    <p className="text-sm text-gray-900 mt-1">{request.request_number}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Case Number</label>
                    <p className="text-sm text-gray-900 mt-1">{request.case_number}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Type</label>
                    <p className="text-sm text-gray-900 mt-1">{request.request_type_display}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Provider</label>
                    <p className="text-sm text-gray-900 mt-1">{request.provider}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-sm text-gray-900 mt-1">{request.status_display}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <p className="text-sm text-gray-900 mt-1">{request.priority}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">SLA Due Date</label>
                    <p className={`text-sm mt-1 ${request.sla_breached ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                      {request.sla_breached ? 'OVERDUE' : `Due in ${request.days_until_due} days`}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Legal Mandate</label>
                    <p className="text-sm text-gray-900 mt-1">{request.legal_mandate_type || 'Not specified'}</p>
                    {request.court_order_number && (
                      <p className="text-xs text-gray-600 mt-1">Court Order: {request.court_order_number}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{request.description}</p>
                  </div>

                  {request.notes && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">Additional Notes</label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{request.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Person of Interest */}
            {request.identifiers && Object.keys(request.identifiers).length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Person of Interest</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {Object.entries(request.identifiers).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <label className="text-sm font-medium text-gray-500 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <p className="text-sm text-gray-900 mt-1 font-mono">{value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents Shared */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documents Shared by IO</h3>
                
                {request.legal_mandate_file ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Legal Mandate Document</p>
                          <p className="text-xs text-gray-500">Required for processing this request</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={request.legal_mandate_file} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No documents attached</p>
                    <p className="text-xs text-gray-400 mt-1">Contact IO via chat for document upload</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-6">
            {requestId && <LERSRequestChat requestId={requestId} />}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Response</h3>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                />
                
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Upload response files</p>
                  <p className="text-sm text-gray-500 mb-4">Click to browse or drag and drop files</p>
                  <p className="text-xs text-gray-400">Supported: PDF, DOC, XLS, CSV, TXT, ZIP</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Selected Files ({selectedFiles.length})</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedFiles([])}
                        disabled={uploading}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Display Uploaded Response Files */}
            {request.responses && request.responses.length > 0 && (
              <Card className="border border-gray-200 shadow-sm mt-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Uploaded Response Files ({request.responses[0].evidence_count || 0})
                  </h3>

                  {request.responses[0].evidence_files && request.responses[0].evidence_files.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            {request.responses[0].evidence_count} file(s) uploaded successfully
                          </p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Response Number: {request.responses[0].response_number}
                          </p>
                        </div>
                      </div>

                      {/* List of uploaded files */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Response Files:</h4>
                        {request.responses[0].evidence_files.map((file: any, index: number) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-slate-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.file_size / 1024).toFixed(2)} KB • {file.file_type} • SHA256: {file.sha256_hash.substring(0, 8)}...
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(file.id, file.file_name)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : request.responses[0].evidence_count > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-4">
                        Your response files have been uploaded and are being processed.
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            {request.responses[0].evidence_count} file(s) uploaded successfully
                          </p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Response Number: {request.responses[0].response_number}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No files uploaded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Upload response files using the form above</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Request Timeline & Audit Log</h3>

                <div className="flow-root">
                  <ul className="-mb-8">
                    {/* Request Created */}
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex items-start space-x-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div>
                              <div className="text-sm">
                                <span className="font-medium text-gray-900">Request Created</span>
                              </div>
                              <p className="mt-0.5 text-sm text-gray-500">
                                {new Date(request.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="mt-2 text-sm text-gray-700">
                              <p>Request #{request.request_number} was submitted for {request.request_type_display}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Case: {request.case_number} • Priority: {request.priority}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>

                    {/* Approval Workflow History */}
                    {request.approval_workflow && request.approval_workflow.length > 0 && (
                      request.approval_workflow.map((workflow: any, idx: number) => (
                        <li key={workflow.id}>
                          <div className="relative pb-8">
                            {idx < request.approval_workflow.length - 1 && (
                              <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                            )}
                            <div className="relative flex items-start space-x-3">
                              <div className="relative">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                                  workflow.action === 'APPROVE' ? 'bg-green-100' :
                                  workflow.action === 'REJECT' ? 'bg-red-100' :
                                  'bg-yellow-100'
                                }`}>
                                  {workflow.action === 'APPROVE' ? (
                                    <Check className="h-5 w-5 text-green-600" />
                                  ) : workflow.action === 'REJECT' ? (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  ) : (
                                    <Edit className="h-5 w-5 text-yellow-600" />
                                  )}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div>
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {workflow.action === 'APPROVE' ? 'Approved' :
                                       workflow.action === 'REJECT' ? 'Rejected' :
                                       'Changes Requested'}
                                    </span>
                                    {' by '}
                                    <span className="font-medium text-gray-900">
                                      {workflow.approver_name || 'Unknown'}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-sm text-gray-500">
                                    {new Date(workflow.action_timestamp).toLocaleString()}
                                  </p>
                                </div>
                                {workflow.comments && (
                                  <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Comments:</p>
                                    <p>{workflow.comments}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))
                    )}

                    {/* Status: In Progress */}
                    {request.status === 'IN_PROGRESS' && (
                      <li>
                        <div className="relative pb-8">
                          <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center ring-8 ring-white">
                                <Clock className="h-5 w-5 text-amber-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="text-sm">
                                  <span className="font-medium text-gray-900">In Progress</span>
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  {new Date(request.updated_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="mt-2 text-sm text-gray-700">
                                <p>Request is currently being processed by the provider</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}

                    {/* Status: Response Uploaded */}
                    {request.status === 'RESPONSE_UPLOADED' && request.responses && request.responses.length > 0 && (
                      <li>
                        <div className="relative pb-8">
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="text-sm">
                                  <span className="font-medium text-gray-900">Response Uploaded</span>
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  {new Date(request.responses[0].created_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="mt-2 text-sm text-gray-700">
                                <p>Provider submitted response with {request.responses[0].evidence_files?.length || 0} file(s)</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Response #: {request.responses[0].response_number}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
