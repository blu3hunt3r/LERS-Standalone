/**
 * TASK 3.2.3: Risk Analysis Display - Insights panel with mule detection
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface RiskAnalysisDisplayProps {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  insights: string[];
  patterns?: any[];
}

export const RiskAnalysisDisplay: React.FC<RiskAnalysisDisplayProps> = ({
  riskScore,
  riskLevel,
  flags,
  insights,
  patterns = [],
}) => {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskIcon = () => {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return <XCircle className="h-5 w-5" />;
    } else if (riskLevel === 'medium') {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <CheckCircle className="h-5 w-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Risk Analysis</span>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getRiskColor()}`}>
            {getRiskIcon()}
            <span className="font-semibold uppercase text-sm">{riskLevel}</span>
            <span className="font-bold">{riskScore}/100</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Flags */}
        {flags.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">🚩 Risk Flags</h4>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag, idx) => (
                <Badge key={idx} variant="destructive" className="text-xs">
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">💡 Insights</h4>
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div key={idx} className="text-sm p-2 bg-slate-50 rounded border-l-4 border-slate-400">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mule Patterns */}
        {patterns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">⚠️ Mule Patterns Detected</h4>
            <div className="space-y-2">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-red-900 uppercase text-xs">
                      {pattern.pattern.replace(/-/g, ' ')}
                    </span>
                    <Badge variant="destructive">{pattern.confidence}% confidence</Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    {pattern.suspiciousTransactions.slice(0, 3).map((txn: string, tIdx: number) => (
                      <div key={tIdx}>{txn}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

