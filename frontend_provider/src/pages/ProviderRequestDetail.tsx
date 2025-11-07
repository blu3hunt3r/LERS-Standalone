/**
 * Provider Request Detail Page
 * 
 * Full view of a LERS request for providers with:
 * - Request details and legal documents
 * - Real-time chat with IO
 * - Response upload functionality
 * - Status tracking
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Calendar,
  User,
  Building,
  Scale,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import lersService from '@/services/lersService';
import LERSRequestChat from '@/components/lers/LERSRequestChat';
import RequestTracker from '@/components/lers/RequestTracker';

const ProviderRequestDetail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [responseNotes, setResponseNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch request details
  const { data: request, isLoading, refetch } = useQuery({
    queryKey: ['lers-request', requestId],
    queryFn: () => lersService.getRequest(requestId!),
    enabled: !!requestId,
  });

  // Acknowledge request mutation
  const acknowledgeMutation = useMutation({
    mutationFn: () => {
      // TODO: Create proper acknowledge endpoint
      return lersService.updateLERSRequest(requestId!, { status: 'ACKNOWLEDGED' });
    },
    onSuccess: () => {
      toast.success('✅ Request acknowledged');
      queryClient.invalidateQueries({ queryKey: ['lers-request', requestId] });
    },
    onError: () => {
      toast.error('Failed to acknowledge request');
    },
  });

  // Upload response mutation
  const uploadResponseMutation = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) {
        throw new Error('Please select files to upload');
      }

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('response_text', responseNotes);
      formData.append('remarks', responseNotes);

      return lersService.uploadResponseFiles(requestId!, formData);
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message || 'Response uploaded successfully'}`);
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((error: any) => {
          toast.error(`${error.file_name}: ${error.error}`);
        });
      }
      setSelectedFiles([]);
      setResponseNotes('');
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['lers-request', requestId] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to upload response');
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitResponse = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    uploadResponseMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading request details...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-slate-800 border border-red-700 rounded-lg p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-300 mb-2">Request Not Found</h3>
        <p className="text-sm text-slate-400 mb-4">
          The requested LERS request could not be found.
        </p>
        <button
          onClick={() => navigate('/provider/inbox')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
        >
          Back to Inbox
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/provider/inbox')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{request.request_number}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Law Enforcement Data Request
            </p>
          </div>
        </div>

        {request.status === 'SUBMITTED' && (
          <button
            onClick={() => acknowledgeMutation.mutate()}
            disabled={acknowledgeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 rounded-lg font-medium text-white transition-colors"
          >
            <Check className="w-4 h-4" />
            {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge Receipt'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Request Details */}
        <div className="col-span-2 space-y-6">
          {/* Request Info Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-100">Request Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Request Type</div>
                  <div className="text-sm font-medium text-slate-200">
                    {request.request_type?.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Priority</div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      request.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' :
                      request.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {request.priority}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Case Number</div>
                  <div className="text-sm font-medium text-slate-200">{request.case?.case_number}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">FIR Number</div>
                  <div className="text-sm font-medium text-slate-200">{request.case?.fir_number}</div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="text-xs text-slate-400 mb-2">Request Description</div>
                <div className="text-sm text-slate-300 leading-relaxed">{request.description}</div>
              </div>

              {request.identifiers && Object.keys(request.identifiers).length > 0 && (
                <div className="border-t border-slate-700 pt-4">
                  <div className="text-xs text-slate-400 mb-2">Target Identifiers</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(request.identifiers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">{key}:</span>
                        <span className="font-mono text-slate-300">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.date_range_from && request.date_range_to && (
                <div className="border-t border-slate-700 pt-4">
                  <div className="text-xs text-slate-400 mb-2">Date Range</div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>
                      {format(new Date(request.date_range_from), 'MMM dd, yyyy')} - {format(new Date(request.date_range_to), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legal Mandate */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Legal Mandate
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Legal Authority</div>
                <div className="text-sm font-medium text-slate-200">{request.legal_mandate_type}</div>
              </div>
              {request.court_order_number && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Court Order Number</div>
                  <div className="text-sm font-medium text-slate-200">{request.court_order_number}</div>
                </div>
              )}
              {request.legal_mandate_file && (
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
                  <Download className="w-4 h-4" />
                  Download Legal Documents
                </button>
              )}
            </div>
          </div>

          {/* Response Upload Section */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Response
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Response Files
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-slate-400">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes or context about the response..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmitResponse}
                disabled={selectedFiles.length === 0 || uploadResponseMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium text-white transition-colors"
              >
                <Upload className="w-4 h-4" />
                {uploadResponseMutation.isPending ? 'Uploading...' : 'Submit Response'}
              </button>
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Communication with IO
              </h2>
            </div>
            <div className="p-4">
              <LERSRequestChat
                requestId={request.id}
                requestNumber={request.request_number}
                currentUserRole="COMPANY_AGENT"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* SLA Tracker */}
          <RequestTracker request={request as any} />

          {/* Request Timeline */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-100">Status History</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">Created</div>
                    <div className="text-xs text-slate-400">
                      {format(new Date(request.created_at), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </div>
                {request.submitted_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Submitted to Provider</div>
                      <div className="text-xs text-slate-400">
                        {format(new Date(request.submitted_at), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  </div>
                )}
                {request.status === 'ACKNOWLEDGED' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 animate-pulse" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Acknowledged</div>
                      <div className="text-xs text-slate-400">Just now</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Requesting Officer */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-100">Requesting Officer</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{request.created_by?.name || 'IO Name'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{request.case?.tenant?.name || 'Police Station'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderRequestDetail;
