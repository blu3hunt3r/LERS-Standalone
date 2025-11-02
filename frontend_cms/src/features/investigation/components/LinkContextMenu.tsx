/**
 * Phase 5, Feature 2, Phase 3: LinkContextMenu Component
 *
 * Context menu and edit modal for graph links/relationships:
 * - Right-click context menu with delete option
 * - Double-click to edit relationship type
 * - Dropdown selector for relationship types
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 4248-4313)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// ============================================================================
// TYPES
// ============================================================================

export interface Link {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  metadata?: any;
}

export interface LinkContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  link: Link | null;
}

export interface RelationshipType {
  value: string;
  label: string;
  category?: string;
}

export interface EditingLinkData {
  id: string;
  currentType: string;
}

export interface LinkContextMenuProps {
  // Context menu state
  contextMenu: LinkContextMenuState;
  onClose: () => void;

  // Edit modal state
  showEditModal: boolean;
  onEditModalChange: (show: boolean) => void;
  editingLinkData: EditingLinkData | null;
  onEditingLinkDataChange: (data: EditingLinkData | null) => void;

  // Relationship types
  relationshipTypes: RelationshipType[];

  // Actions
  onDelete: (link: Link) => void;
  onTypeChange: (linkId: string, newType: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LinkContextMenu Component
 *
 * Context menu and edit modal for graph links
 *
 * @param props - LinkContextMenuProps
 *
 * @example
 * ```tsx
 * <LinkContextMenu
 *   contextMenu={linkContextMenu}
 *   onClose={() => setLinkContextMenu({ visible: false, x: 0, y: 0, link: null })}
 *   showEditModal={showLinkEditModal}
 *   onEditModalChange={setShowLinkEditModal}
 *   editingLinkData={editingLinkData}
 *   onEditingLinkDataChange={setEditingLinkData}
 *   relationshipTypes={RELATIONSHIP_TYPES}
 *   onDelete={handleDeleteLink}
 *   onTypeChange={handleLinkTypeChange}
 * />
 * ```
 */
export const LinkContextMenu: React.FC<LinkContextMenuProps> = ({
  contextMenu,
  onClose,
  showEditModal,
  onEditModalChange,
  editingLinkData,
  onEditingLinkDataChange,
  relationshipTypes,
  onDelete,
  onTypeChange,
}) => {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleDelete = () => {
    if (contextMenu.link) {
      onDelete(contextMenu.link);
      onClose();
    }
  };

  const handleTypeChange = (newType: string) => {
    if (editingLinkData) {
      onTypeChange(editingLinkData.id, newType);
      onEditModalChange(false);
      onEditingLinkDataChange(null);
    }
  };

  const handleEditModalClose = () => {
    onEditModalChange(false);
    onEditingLinkDataChange(null);
  };

  // ============================================================================
  // RENDER: CONTEXT MENU
  // ============================================================================

  const renderContextMenu = () => {
    if (!contextMenu.visible || !contextMenu.link) return null;

    return (
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] context-menu"
        style={{
          left: `${contextMenu.x}px`,
          top: `${contextMenu.y}px`,
        }}
      >
        <div className="px-4 py-1 text-xs text-gray-500 border-b border-gray-100">
          💡 Double-click to edit relationship
        </div>

        <button
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          onClick={handleDelete}
        >
          <span>🗑️</span>
          <span>Delete Relationship</span>
        </button>
      </div>
    );
  };

  // ============================================================================
  // RENDER: EDIT MODAL
  // ============================================================================

  const renderEditModal = () => {
    if (!showEditModal || !editingLinkData) return null;

    return (
      <Dialog open={showEditModal} onOpenChange={onEditModalChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Relationship</DialogTitle>
            <DialogDescription>
              Double-clicked to quickly change this relationship type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="relationship-type">Relationship Type</Label>
              <select
                id="relationship-type"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                defaultValue={editingLinkData.currentType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {relationshipTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleEditModalClose}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      {renderContextMenu()}
      {renderEditModal()}
    </>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default LinkContextMenu;
