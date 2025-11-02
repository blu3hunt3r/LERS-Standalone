/**
 * Provider Completed - Shows RESPONSE_UPLOADED requests only
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Eye,
  CheckCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { lersService } from '@/services/lersService';

export default function ProviderCompleted() {
  const navigate = useNavigate();

  // Fetch real LERS requests from backend
  const { data, isLoading } = useQuery({
    queryKey: ['provider-lers-completed'],
    queryFn: async () => {
      const response = await lersService.getRequests({});
      return response;
    },
  });

  // Filter for RESPONSE_UPLOADED only
  const requests = (data?.results || []).filter((r: any) => r.status === 'RESPONSE_UPLOADED');

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'URGENT':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'NORMAL':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusBadge = () => {
    return 'bg-green-100 text-green-700 border-green-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-full px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Completed</h1>
            <p className="text-sm text-gray-500 mt-1">Successfully fulfilled LERS requests</p>
          </div>
        </div>

        {/* Search */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search completed requests..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-900">Completed Requests ({requests.length})</h2>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <CheckCircle className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-600">No completed requests yet</p>
                <p className="text-sm text-gray-500 mt-1">Requests with uploaded responses will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request: any) => (
                  <div 
                    key={request.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/lers/provider/requests/${request.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-2 h-2 rounded-full ${getPriorityDot(request.priority)}`} />
                        <span className="text-sm font-normal text-gray-900">{request.request_number}</span>
                        <Badge variant="outline" className={`text-xs ${getStatusBadge()}`}>
                          COMPLETED
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 font-medium mb-1">
                      {request.request_type_display} - Case {request.case_number}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span>Provider: {request.provider}</span>
                      <span>Completed: {new Date(request.created_at).toLocaleDateString()}</span>
                      <span className="text-green-600">✓ Response Uploaded</span>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/lers/provider/requests/${request.id}`) 
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Response
                      </Button>
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
}

