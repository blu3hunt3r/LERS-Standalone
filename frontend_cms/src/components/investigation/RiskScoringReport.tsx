/**
 * Risk Scoring Report Component
 *
 * Provides comprehensive risk assessment including:
 * - Entity risk scores and rankings
 * - Risk factors breakdown
 * - Suspicious patterns detected
 * - Compliance flags and alerts
 */

import React, { useMemo } from 'react';
import { AlertTriangle, Shield, TrendingUp, Flag, CheckCircle2, XCircle } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: string;
  risk_level?: string;
  confidence?: number;
  metadata?: {
    layer?: number;
    is_terminal?: boolean;
    suspicious_patterns?: string[];
    compliance_flags?: string[];
    [key: string]: any;
  };
}

interface Link {
  id: string;
  source: string;
  target: string;
  metadata?: {
    amount?: string | number;
    frequency?: number;
    [key: string]: any;
  };
}

interface RiskScoringReportProps {
  nodes: Node[];
  links: Link[];
}

export const RiskScoringReport: React.FC<RiskScoringReportProps> = ({ nodes, links }) => {
  const riskAnalysis = useMemo(() => {
    // Calculate risk scores for each entity
    const entityRisks = nodes.map(node => {
      let riskScore = 0;
      const riskFactors: string[] = [];

      // Base risk from risk_level
      const riskLevels = { critical: 100, high: 75, medium: 50, low: 25, unknown: 10 };
      const baseRisk = riskLevels[node.risk_level as keyof typeof riskLevels] || 10;
      riskScore += baseRisk;

      if (node.risk_level && node.risk_level !== 'unknown' && node.risk_level !== 'low') {
        riskFactors.push(`${node.risk_level} risk level`);
      }

      // Calculate transaction-based risk
      const outgoingLinks = links.filter(l => l.source === node.id);
      const incomingLinks = links.filter(l => l.target === node.id);

      // High number of outgoing transactions
      if (outgoingLinks.length > 10) {
        riskScore += 20;
        riskFactors.push(`High outgoing transaction count (${outgoingLinks.length})`);
      }

      // Terminal nodes (money endpoints)
      if (node.metadata?.is_terminal) {
        riskScore += 15;
        riskFactors.push('Terminal node (endpoint)');
      }

      // Large transaction amounts
      const totalOut = outgoingLinks.reduce((sum, link) => {
        const amount = parseFloat(String(link.metadata?.amount || 0));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      if (totalOut > 100000) {
        riskScore += 25;
        riskFactors.push(`High total outflow ($${(totalOut / 1000).toFixed(0)}K)`);
      }

      // Rapid transactions (high frequency)
      const highFrequencyLinks = outgoingLinks.filter(l => (l.metadata?.frequency || 0) > 5);
      if (highFrequencyLinks.length > 0) {
        riskScore += 15;
        riskFactors.push(`Rapid transaction pattern (${highFrequencyLinks.length} high-frequency links)`);
      }

      // Layer-based risk (early layers are more suspicious)
      if (node.metadata?.layer !== undefined && node.metadata.layer <= 1) {
        riskScore += 10;
        riskFactors.push(`Early layer entity (Layer ${node.metadata.layer})`);
      }

      // Suspicious patterns from metadata
      if (node.metadata?.suspicious_patterns && node.metadata.suspicious_patterns.length > 0) {
        riskScore += node.metadata.suspicious_patterns.length * 10;
        node.metadata.suspicious_patterns.forEach(pattern => {
          riskFactors.push(pattern);
        });
      }

      // Cap at 100
      riskScore = Math.min(riskScore, 100);

      return {
        node,
        riskScore,
        riskFactors,
        complianceFlags: node.metadata?.compliance_flags || [],
        confidence: node.confidence || 0,
      };
    });

    // Sort by risk score
    const sortedByRisk = entityRisks.sort((a, b) => b.riskScore - a.riskScore);

    // Count by risk category
    const riskCategories = {
      critical: entityRisks.filter(e => e.riskScore >= 80).length,
      high: entityRisks.filter(e => e.riskScore >= 60 && e.riskScore < 80).length,
      medium: entityRisks.filter(e => e.riskScore >= 40 && e.riskScore < 60).length,
      low: entityRisks.filter(e => e.riskScore < 40).length,
    };

    // Aggregate all risk factors
    const allFactors = new Map<string, number>();
    entityRisks.forEach(e => {
      e.riskFactors.forEach(factor => {
        allFactors.set(factor, (allFactors.get(factor) || 0) + 1);
      });
    });

    const topRiskFactors = Array.from(allFactors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Compliance flags
    const allFlags = new Map<string, number>();
    entityRisks.forEach(e => {
      e.complianceFlags.forEach(flag => {
        allFlags.set(flag, (allFlags.get(flag) || 0) + 1);
      });
    });

    return {
      entityRisks: sortedByRisk.slice(0, 20), // Top 20
      riskCategories,
      topRiskFactors,
      complianceFlags: Array.from(allFlags.entries()),
      averageRiskScore: entityRisks.reduce((sum, e) => sum + e.riskScore, 0) / entityRisks.length || 0,
    };
  }, [nodes, links]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return { label: 'CRITICAL', class: 'bg-red-500 text-white' };
    if (score >= 60) return { label: 'HIGH', class: 'bg-orange-500 text-white' };
    if (score >= 40) return { label: 'MEDIUM', class: 'bg-yellow-500 text-white' };
    return { label: 'LOW', class: 'bg-green-500 text-white' };
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Risk Scoring Report</h2>
          <p className="text-sm text-gray-600 mt-1">Comprehensive risk assessment and compliance analysis</p>
        </div>
        <Shield className="h-8 w-8 text-red-600" />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {riskAnalysis.averageRiskScore.toFixed(0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Risk</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {riskAnalysis.riskCategories.critical}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {riskAnalysis.riskCategories.high}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Medium Risk</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {riskAnalysis.riskCategories.medium}
              </p>
            </div>
            <Flag className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Risk</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {riskAnalysis.riskCategories.low}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* High Risk Entities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          High-Risk Entities
        </h3>
        <div className="space-y-3">
          {riskAnalysis.entityRisks.map((entity, index) => {
            const badge = getRiskBadge(entity.riskScore);
            return (
              <div
                key={entity.node.id}
                className={`p-4 rounded-lg border-2 ${getRiskColor(entity.riskScore)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 font-bold text-sm text-gray-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{entity.node.label}</p>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${badge.class}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{entity.node.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{entity.riskScore}</p>
                    <p className="text-xs text-gray-600">Risk Score</p>
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Risk Factors:</p>
                  <div className="flex flex-wrap gap-2">
                    {entity.riskFactors.length > 0 ? (
                      entity.riskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-white rounded border border-gray-300 text-gray-700"
                        >
                          • {factor}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No specific risk factors identified</span>
                    )}
                  </div>
                </div>

                {/* Compliance Flags */}
                {entity.complianceFlags.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300 space-y-1">
                    <p className="text-xs font-semibold text-gray-700 uppercase flex items-center gap-1">
                      <Flag className="h-3 w-3" />
                      Compliance Flags:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entity.complianceFlags.map((flag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-red-100 rounded border border-red-300 text-red-700 font-medium"
                        >
                          ⚠ {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risk Factors */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            Common Risk Factors
          </h3>
          <div className="space-y-2">
            {riskAnalysis.topRiskFactors.length > 0 ? (
              riskAnalysis.topRiskFactors.map(([factor, count], index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm text-gray-700 flex-1">{factor}</span>
                  <span className="text-sm font-bold text-orange-600 ml-4">{count}x</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No risk factors identified</p>
            )}
          </div>
        </div>

        {/* Compliance Flags */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Compliance Issues
          </h3>
          <div className="space-y-2">
            {riskAnalysis.complianceFlags.length > 0 ? (
              riskAnalysis.complianceFlags.map(([flag, count], index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-200">
                  <span className="text-sm text-gray-700 flex-1">{flag}</span>
                  <span className="text-sm font-bold text-red-600 ml-4">{count} entities</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No compliance issues detected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskScoringReport;
