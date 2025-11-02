/**
 * Export & Reports Component
 *
 * Provides various export and report generation options:
 * - PDF report generation
 * - Excel export
 * - Graph data export (JSON/CSV)
 * - Timeline export
 * - Custom report builder
 */

import React, { useState } from 'react';
import { Download, FileText, Table, FileJson, Calendar, Printer, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Node {
  id: string;
  label: string;
  type: string;
  [key: string]: any;
}

interface Link {
  id: string;
  source: string;
  target: string;
  [key: string]: any;
}

interface ExportReportsProps {
  nodes: Node[];
  links: Link[];
  caseId?: string;
  caseName?: string;
}

export const ExportReports: React.FC<ExportReportsProps> = ({
  nodes,
  links,
  caseId,
  caseName = 'Investigation',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const data = {
        case: {
          id: caseId,
          name: caseName,
          exportedAt: new Date().toISOString(),
        },
        nodes,
        links,
        statistics: {
          totalEntities: nodes.length,
          totalRelationships: links.length,
        },
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${caseName.replace(/\s+/g, '_')}_graph_data_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Graph data exported as JSON');
    } catch (error) {
      toast.error('Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      // Export nodes as CSV
      const nodeHeaders = ['ID', 'Label', 'Type', 'Risk Level'];
      const nodeRows = nodes.map(node => [
        node.id,
        node.label,
        node.type,
        node.risk_level || 'N/A',
      ]);

      const nodesCSV = [
        nodeHeaders.join(','),
        ...nodeRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Export links as CSV
      const linkHeaders = ['Source', 'Target', 'Type', 'Amount'];
      const linkRows = links.map(link => [
        link.source,
        link.target,
        link.label || 'Transaction',
        link.metadata?.amount || '0',
      ]);

      const linksCSV = [
        linkHeaders.join(','),
        ...linkRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Create zip-like structure (two separate files)
      const blob = new Blob([nodesCSV + '\n\n' + linksCSV], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${caseName.replace(/\s+/g, '_')}_data_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported as CSV');
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    toast.info('Excel export feature coming soon');
  };

  const handleGeneratePDFReport = () => {
    toast.info('PDF report generation coming soon');
  };

  const handleExportTimeline = () => {
    setIsExporting(true);
    try {
      // Extract transactions with timestamps
      const timelineData = links
        .filter(link => link.metadata?.timestamp || link.metadata?.date)
        .map(link => ({
          timestamp: link.metadata?.timestamp || link.metadata?.date,
          source: nodes.find(n => n.id === link.source)?.label || link.source,
          target: nodes.find(n => n.id === link.target)?.label || link.target,
          amount: link.metadata?.amount || 0,
          type: link.label || 'Transaction',
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const headers = ['Timestamp', 'From', 'To', 'Amount', 'Type'];
      const rows = timelineData.map(item => [
        item.timestamp,
        item.source,
        item.target,
        item.amount,
        item.type,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${caseName.replace(/\s+/g, '_')}_timeline_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Timeline exported successfully');
    } catch (error) {
      toast.error('Failed to export timeline');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportOptions = [
    {
      icon: FileJson,
      title: 'Export Graph Data (JSON)',
      description: 'Complete graph data with all nodes and relationships in JSON format',
      color: 'blue',
      action: handleExportJSON,
    },
    {
      icon: Table,
      title: 'Export Data (CSV)',
      description: 'Export nodes and links as CSV spreadsheet',
      color: 'green',
      action: handleExportCSV,
    },
    {
      icon: FileText,
      title: 'Export to Excel',
      description: 'Generate formatted Excel workbook with multiple sheets',
      color: 'emerald',
      action: handleExportExcel,
    },
    {
      icon: Calendar,
      title: 'Export Timeline',
      description: 'Chronological transaction timeline in CSV format',
      color: 'purple',
      action: handleExportTimeline,
    },
    {
      icon: FileText,
      title: 'Generate PDF Report',
      description: 'Comprehensive investigation report in PDF format',
      color: 'red',
      action: handleGeneratePDFReport,
    },
    {
      icon: Printer,
      title: 'Print Current View',
      description: 'Print the current investigation view',
      color: 'gray',
      action: handlePrint,
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export & Reports</h2>
          <p className="text-sm text-gray-600 mt-1">Generate reports and export investigation data</p>
        </div>
        <Download className="h-8 w-8 text-blue-600" />
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportOptions.map((option, index) => {
          const Icon = option.icon;
          const colorClasses = {
            blue: 'bg-blue-500 text-white',
            green: 'bg-green-500 text-white',
            emerald: 'bg-emerald-500 text-white',
            purple: 'bg-purple-500 text-white',
            red: 'bg-red-500 text-white',
            gray: 'bg-gray-500 text-white',
          };

          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
            >
              <div className={`p-4 ${colorClasses[option.color as keyof typeof colorClasses]}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{option.description}</p>
                <Button
                  onClick={option.action}
                  disabled={isExporting}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{nodes.length}</p>
            <p className="text-sm text-gray-600 mt-1">Entities</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{links.length}</p>
            <p className="text-sm text-gray-600 mt-1">Relationships</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {links.filter(l => l.metadata?.timestamp || l.metadata?.date).length}
            </p>
            <p className="text-sm text-gray-600 mt-1">With Timestamps</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">
              {nodes.filter(n => n.risk_level === 'critical' || n.risk_level === 'high').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">High Risk</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Export Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• JSON export includes complete graph structure for re-importing</li>
              <li>• CSV exports are compatible with Excel, Google Sheets, and other tools</li>
              <li>• Timeline exports are sorted chronologically for temporal analysis</li>
              <li>• PDF reports include summary statistics and risk assessments</li>
              <li>• All exports include a timestamp for version tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReports;
