/**
 * Phase 5, Feature 2, Phase 3: EntityDetailsModal Component
 *
 * Modal for displaying detailed entity information:
 * - Entity type, label, icon
 * - Layer information with badges
 * - Bank account details (account number, IFSC, bank name, amount)
 * - All metadata (key-value pairs)
 * - Risk level and confidence score
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 4387-4527)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

export interface Node {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  risk_level?: string;
  confidence?: number;
  metadata?: {
    layer?: number;
    is_victim_to_victim?: boolean;
    is_terminal?: boolean;
    account_number?: string;
    ifsc_code?: string;
    bank_name?: string;
    amount?: string | number;
    [key: string]: any;
  };
}

export interface EntityDetailsModalProps {
  /** Modal open state */
  open: boolean;

  /** Node data to display */
  node: Node | null;

  /** Close handler */
  onClose: () => void;

  /** Helper function to get entity icon */
  getEntityIcon?: (type: string) => string;

  /** Helper function to get layer color */
  getLayerColor?: (layer: number) => string;
}

// ============================================================================
// DEFAULT HELPERS
// ============================================================================

const defaultGetLayerColor = (layer: number): string => {
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
  ];
  return colors[layer % colors.length];
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EntityDetailsModal Component
 *
 * Displays comprehensive entity information in a modal
 *
 * @param props - EntityDetailsModalProps
 *
 * @example
 * ```tsx
 * <EntityDetailsModal
 *   open={entityDetailsModal.open}
 *   node={entityDetailsModal.node}
 *   onClose={() => setEntityDetailsModal({ open: false, node: null })}
 *   getEntityIcon={getEntityIcon}
 *   getLayerColor={getLayerColor}
 * />
 * ```
 */
export const EntityDetailsModal: React.FC<EntityDetailsModalProps> = ({
  open,
  node,
  onClose,
  getEntityIcon,
  getLayerColor = defaultGetLayerColor,
}) => {
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderLayerInformation = () => {
    if (!node?.metadata?.layer) return null;

    const layerColor = node.metadata.is_victim_to_victim
      ? '#F97316' // orange-500
      : node.metadata.is_terminal
      ? '#EF4444' // red-500
      : getLayerColor(node.metadata.layer);

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ backgroundColor: layerColor }}
          />
          <div>
            <div className="text-sm font-medium text-gray-700">
              Layer {node.metadata.layer}
              {node.metadata.is_victim_to_victim && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                  Victim Account
                </span>
              )}
              {node.metadata.is_terminal && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  Terminal Node
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {node.metadata.is_victim_to_victim
                ? 'Victim account (receives from other victims only)'
                : node.metadata.is_terminal
                ? 'Beneficiary - Money withdrawn/kept (no forward transfer)'
                : 'Transaction flow layer'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAccountDetails = () => {
    if (!node?.metadata) return null;

    const hasAccountDetails =
      node.metadata.account_number ||
      node.metadata.ifsc_code ||
      node.metadata.bank_name ||
      node.metadata.amount;

    if (!hasAccountDetails) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Account Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {node.metadata.account_number && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Account Number</div>
              <div className="text-sm font-mono font-semibold text-gray-900">
                {node.metadata.account_number}
              </div>
            </div>
          )}

          {node.metadata.ifsc_code && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">IFSC Code</div>
              <div className="text-sm font-mono font-semibold text-gray-900">
                {node.metadata.ifsc_code}
              </div>
            </div>
          )}

          {node.metadata.bank_name && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Bank Name</div>
              <div className="text-sm font-semibold text-gray-900">
                {node.metadata.bank_name}
              </div>
            </div>
          )}

          {node.metadata.amount && (
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Amount</div>
              <div className="text-sm font-semibold text-gray-900">
                ₹{' '}
                {parseFloat(String(node.metadata.amount)).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAllMetadata = () => {
    if (!node?.metadata || Object.keys(node.metadata).length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">All Metadata</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {Object.entries(node.metadata).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between text-sm border-b border-gray-200 pb-2 last:border-0"
            >
              <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-gray-900 font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRiskAndConfidence = () => {
    if (!node) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Risk Level</div>
          <div className="text-sm font-semibold text-gray-900 capitalize">
            {node.risk_level || 'Unknown'}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Confidence</div>
          <div className="text-sm font-semibold text-gray-900">{node.confidence || 0}%</div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!open || !node) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">
              {getEntityIcon ? getEntityIcon(node.type) : '📄'}
            </span>
            <div>
              <div className="text-lg font-semibold">{node.label}</div>
              <div className="text-sm text-gray-500 font-normal capitalize">
                {node.type.replace(/_/g, ' ')}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {renderLayerInformation()}
          {renderAccountDetails()}
          {renderAllMetadata()}
          {renderRiskAndConfidence()}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default EntityDetailsModal;
