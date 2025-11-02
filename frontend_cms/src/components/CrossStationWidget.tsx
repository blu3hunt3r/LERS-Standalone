import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Search, MapPin, AlertCircle, CheckCircle, Info } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface District {
  name: string;
  count: number;
}

interface CrossStationResult {
  query_id: string;
  total_matches: number;
  districts: District[];
  masked_refs: string[];
}

interface CrossStationWidgetProps {
  ackNumber?: string;
  category?: string;
  caseId?: string;
}

const CrossStationWidget: React.FC<CrossStationWidgetProps> = ({
  ackNumber: initialAck = '',
  category: initialCategory = '',
  caseId = '',
}) => {
  const [ackNumber, setAckNumber] = useState(initialAck);
  const [category, setCategory] = useState(initialCategory);
  const [justification, setJustification] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CrossStationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const handleSearch = async () => {
    if (!ackNumber || !category || !justification) {
      setError('Please fill in all fields');
      return;
    }

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/crossstation/discovery/check/`,
        {
          ack_number: ackNumber,
          category: category,
          justification: justification,
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      setResult(response.data);
    } catch (err: any) {
      console.error('Cross-station search error:', err);
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleRequestDetails = async (maskedRef: string) => {
    if (!result) return;

    setRequesting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE_URL}/api/v1/crossstation/discovery/request_details/`,
        {
          query_id: result.query_id,
          masked_ref: maskedRef,
          justification: justification + ' - Requesting detailed information for investigation',
          data_requested: {
            case_summary: true,
            entity_counts: true,
            contact_officer: true,
          },
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      alert('Data release request submitted! Awaiting supervisor approval from the other station.');
      setSelectedRef(maskedRef);
    } catch (err: any) {
      console.error('Request details error:', err);
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Search className="h-5 w-5 text-slate-700" />
          Cross-Station Discovery
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Privacy-first search across stations (ack number + category only)
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Search Form */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Acknowledgment Number
            </Label>
            <Input
              value={ackNumber}
              onChange={(e) => setAckNumber(e.target.value)}
              placeholder="1930-DL-2025-12345"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Crime Category
            </Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="UPI_FRAUD, SIM_SWAP, etc."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Justification <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Reason for cross-station query (required for audit)"
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              <Info className="h-3 w-3 inline mr-1" />
              This query will be logged and auditable
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSearch}
            disabled={searching || !ackNumber || !category || !justification}
            className="w-full bg-slate-700 hover:bg-slate-800"
          >
            {searching ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Across Stations
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Search Results
                </h4>
                <Badge className={result.total_matches > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {result.total_matches} {result.total_matches === 1 ? 'match' : 'matches'}
                </Badge>
              </div>

              {result.total_matches === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No similar complaints found in other stations</p>
                </div>
              ) : (
                <>
                  {/* District Distribution */}
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      District Distribution
                    </h5>
                    <div className="space-y-2">
                      {result.districts.map((district, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm text-gray-700">{district.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {district.count} {district.count === 1 ? 'case' : 'cases'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Masked References */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">
                      Cases Found (Masked References)
                    </h5>
                    <div className="space-y-2">
                      {result.masked_refs.map((ref, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded"
                        >
                          <div className="font-mono text-xs text-gray-700">{ref}</div>
                          <Button
                            size="sm"
                            onClick={() => handleRequestDetails(ref)}
                            disabled={requesting || selectedRef === ref}
                            className="bg-slate-700 hover:bg-slate-800 text-xs"
                          >
                            {requesting && selectedRef === ref ? (
                              'Requesting...'
                            ) : selectedRef === ref ? (
                              'Requested'
                            ) : (
                              'Request Details'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-800">
                        <Info className="h-3 w-3 inline mr-1" />
                        Requesting details requires supervisor approval from the owning station. You will be notified when approved.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrossStationWidget;

