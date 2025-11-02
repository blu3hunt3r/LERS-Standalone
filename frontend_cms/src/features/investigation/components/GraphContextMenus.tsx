/**
 * Phase 5, Feature 2, Phase 3: GraphContextMenus Component
 *
 * Comprehensive context menu system for the investigation graph:
 * - Canvas context menu (add entity with multi-stage workflow)
 * - Node context menu (edit, transforms, LERS, delete)
 * - Multi-stage navigation (main → search → input, transforms)
 * - Smart positioning to keep menus on screen
 * - Dark Maltego-style theme
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 3256-3767)
 */

import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Sparkles,
  FileText,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface Node {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  metadata?: any;
  entity?: any;
}

export interface EntityType {
  id: string;
  name: string;
  icon: string;
  category?: string;
}

export interface Transform {
  id: string;
  name: string;
  icon: string;
  type: 'Financial' | 'Telecom' | 'Social';
  desc: string;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: Node | null;
  isCanvas: boolean;
}

export type ContextMenuStage = 'main' | 'search' | 'input' | 'transforms' | 'edit';

export interface GraphContextMenusProps {
  // Context menu state
  contextMenu: ContextMenuState;
  onClose: () => void;

  // Stage management
  contextMenuStage: ContextMenuStage;
  onStageChange: (stage: ContextMenuStage) => void;

  // Entity management
  entityTypes: EntityType[];
  selectedEntityType: string;
  onSelectedEntityTypeChange: (typeId: string) => void;
  entityValue: string;
  onEntityValueChange: (value: string) => void;
  entitySearchQuery: string;
  onEntitySearchQueryChange: (query: string) => void;

  // Transform management
  uploadedFile: File | null;
  onUploadedFileChange: (file: File | null) => void;
  onTransformRun: (transform: Transform, file: File) => Promise<void>;

  // Actions
  onCreateEntity: (typeId: string, value: string) => void;
  onUpdateEntityLabel: (entityId: string, value: string) => void;
  onDeleteEntity: (nodeId: string) => void;
  onCreateLersRequest: (node: Node) => void;

  // Mutations (for loading states)
  isCreatingEntity?: boolean;

  // Optional: Custom transforms list
  customTransforms?: Transform[];

  // Helper function
  getEntityIcon?: (type: string) => string;
}

// ============================================================================
// DEFAULT TRANSFORMS
// ============================================================================

const DEFAULT_TRANSFORMS: Transform[] = [
  {
    id: 'money-flow',
    name: 'Money Flow Analysis',
    icon: '💰',
    type: 'Financial',
    desc: 'Trace money movement across accounts',
  },
  {
    id: 'velocity',
    name: 'Velocity Detection',
    icon: '⚡',
    type: 'Financial',
    desc: 'Detect rapid fund transfers',
  },
  {
    id: 'mule',
    name: 'Mule Detection',
    icon: '🎯',
    type: 'Financial',
    desc: 'Identify mule accounts',
  },
  {
    id: 'contact-network',
    name: 'Contact Network',
    icon: '📞',
    type: 'Telecom',
    desc: 'Map call relationships',
  },
  {
    id: 'night-stay',
    name: 'Night Stay Location',
    icon: '🏠',
    type: 'Telecom',
    desc: 'Find residence location',
  },
  {
    id: 'movement',
    name: 'Movement Pattern',
    icon: '🗺️',
    type: 'Telecom',
    desc: 'Track movement over time',
  },
  {
    id: 'profile-scrape',
    name: 'Profile Scraping',
    icon: '📸',
    type: 'Social',
    desc: 'Extract social media data',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GraphContextMenus Component
 *
 * Comprehensive context menu system with multi-stage workflows
 *
 * @param props - GraphContextMenusProps
 *
 * @example
 * ```tsx
 * <GraphContextMenus
 *   contextMenu={contextMenu}
 *   onClose={hideContextMenu}
 *   contextMenuStage={contextMenuStage}
 *   onStageChange={setContextMenuStage}
 *   entityTypes={ENTITY_TYPES}
 *   selectedEntityType={selectedEntityType}
 *   onSelectedEntityTypeChange={setSelectedEntityType}
 *   entityValue={entityValue}
 *   onEntityValueChange={setEntityValue}
 *   entitySearchQuery={entitySearchQuery}
 *   onEntitySearchQueryChange={setEntitySearchQuery}
 *   uploadedFile={uploadedFile}
 *   onUploadedFileChange={setUploadedFile}
 *   onTransformRun={handleTransformRun}
 *   onCreateEntity={handleCreateEntity}
 *   onUpdateEntityLabel={updateEntityLabel}
 *   onDeleteEntity={handleDeleteEntity}
 *   onCreateLersRequest={handleCreateLersRequest}
 *   getEntityIcon={getEntityIcon}
 * />
 * ```
 */
export const GraphContextMenus: React.FC<GraphContextMenusProps> = ({
  contextMenu,
  onClose,
  contextMenuStage,
  onStageChange,
  entityTypes,
  selectedEntityType,
  onSelectedEntityTypeChange,
  entityValue,
  onEntityValueChange,
  entitySearchQuery,
  onEntitySearchQueryChange,
  uploadedFile,
  onUploadedFileChange,
  onTransformRun,
  onCreateEntity,
  onUpdateEntityLabel,
  onDeleteEntity,
  onCreateLersRequest,
  isCreatingEntity = false,
  customTransforms,
  getEntityIcon,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const transforms = customTransforms || DEFAULT_TRANSFORMS;

  // ============================================================================
  // POSITIONING LOGIC
  // ============================================================================

  // Smart positioning to keep menu on screen
  const menuWidth = contextMenuStage === 'search' ? 400 : 260;
  const menuHeight = contextMenuStage === 'search' ? 500 : 300;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left = contextMenu.x;
  let top = contextMenu.y;

  // Adjust horizontal position if menu would go off-screen
  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 10;
  }

  // Adjust vertical position if menu would go off-screen
  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 10;
  }

  // ============================================================================
  // ENTITY FILTERING
  // ============================================================================

  // Group entity types by category and filter by search query
  const groupedEntityTypes = React.useMemo(() => {
    const filtered = entityTypes.filter(
      (type) =>
        type.name.toLowerCase().includes(entitySearchQuery.toLowerCase()) ||
        type.category?.toLowerCase().includes(entitySearchQuery.toLowerCase())
    );

    const grouped: Record<string, EntityType[]> = {};
    filtered.forEach((type) => {
      const category = type.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(type);
    });

    return grouped;
  }, [entityTypes, entitySearchQuery]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleContextAction = (action: string, ...args: any[]) => {
    switch (action) {
      case 'add-entity':
        onStageChange('search');
        break;

      case 'select-type':
        onSelectedEntityTypeChange(args[0]);
        onStageChange('input');
        break;

      case 'create-entity':
        if (args[1]?.trim()) {
          onCreateEntity(args[0], args[1].trim());
          onClose();
          onStageChange('main');
          onEntityValueChange('');
          onSelectedEntityTypeChange('');
        }
        break;

      case 'delete':
        if (contextMenu.node) {
          onDeleteEntity(contextMenu.node.id);
          onClose();
        }
        break;

      default:
        console.warn('Unknown context action:', action);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadedFileChange(file);
      toast.success(`File "${file.name}" ready for transform`);
    }
  };

  const handleTransformClick = async (transform: Transform) => {
    if (!uploadedFile) {
      toast.error('Please upload a file first');
      return;
    }

    await onTransformRun(transform, uploadedFile);
    onClose();
    onStageChange('main');
    onUploadedFileChange(null);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Get transform badge color based on type
   */
  const getTransformBadgeStyle = (type: Transform['type']) => {
    const styles = {
      Financial: {
        background: 'rgba(34, 197, 94, 0.2)',
        color: '#86efac',
      },
      Telecom: {
        background: 'rgba(59, 130, 246, 0.2)',
        color: '#93c5fd',
      },
      Social: {
        background: 'rgba(168, 85, 247, 0.2)',
        color: '#d8b4fe',
      },
    };
    return styles[type];
  };

  // ============================================================================
  // RENDER: CANVAS CONTEXT MENU
  // ============================================================================

  const renderCanvasContextMenu = () => {
    if (contextMenuStage === 'main') {
      return (
        <div className="py-2">
          <button
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 text-white font-medium transition-colors rounded"
            onClick={() => handleContextAction('add-entity')}
          >
            <span className="text-lg">➕</span>
            <span>Add Entity</span>
          </button>
        </div>
      );
    }

    if (contextMenuStage === 'search') {
      return (
        <div className="p-3 flex flex-col" style={{ width: '380px', maxHeight: '480px' }}>
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search entity types..."
            value={entitySearchQuery}
            onChange={(e) => onEntitySearchQueryChange(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />

          {/* Entity Type List */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
            {Object.entries(groupedEntityTypes).map(([category, types]) => (
              <div key={category} className="mb-3 last:mb-0">
                <div className="text-xs font-medium uppercase text-slate-400 mb-1 px-2 sticky top-0 bg-slate-800">
                  {category}
                </div>
                <div className="space-y-0.5">
                  {types.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleContextAction('select-type', type.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left text-sm rounded transition-colors text-white"
                    >
                      <span className="text-lg">{type.icon}</span>
                      <span>{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Back Button */}
          <button
            onClick={() => {
              onStageChange('main');
              onEntitySearchQueryChange('');
            }}
            className="mt-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
          >
            ← Back
          </button>
        </div>
      );
    }

    if (contextMenuStage === 'input') {
      const selectedType = entityTypes.find((t) => t.id === selectedEntityType);

      return (
        <div className="p-4" style={{ width: '280px' }}>
          {/* Selected Type Display */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-600">
            <span className="text-2xl">{selectedType?.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{selectedType?.name}</div>
              <div className="text-xs text-slate-400">{selectedType?.category}</div>
            </div>
          </div>

          {/* Value Input */}
          <input
            type="text"
            placeholder={`Enter ${selectedType?.name.toLowerCase()}`}
            value={entityValue}
            onChange={(e) => onEntityValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && entityValue.trim()) {
                handleContextAction('create-entity', selectedEntityType, entityValue);
              }
            }}
            className="w-full px-3 py-2 mb-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onStageChange('search');
                onSelectedEntityTypeChange('');
                onEntityValueChange('');
              }}
              className="flex-1 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() =>
                handleContextAction('create-entity', selectedEntityType, entityValue)
              }
              disabled={!entityValue.trim() || isCreatingEntity}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingEntity ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================================================
  // RENDER: NODE CONTEXT MENU
  // ============================================================================

  const renderNodeContextMenu = () => {
    if (contextMenuStage === 'main') {
      return (
        <>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-all rounded"
            onClick={() => {
              onStageChange('edit');
              onEntityValueChange(contextMenu.node?.label || '');
            }}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Entity</span>
          </button>

          <div className="border-t border-slate-600 my-1"></div>

          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 hover:text-white flex items-center justify-between transition-all rounded"
            onClick={() => onStageChange('transforms')}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Run Transforms</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="border-t border-slate-600 my-1"></div>

          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-all rounded"
            onClick={() => {
              if (contextMenu.node) {
                onCreateLersRequest(contextMenu.node);
                onClose();
              }
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Create LERS Request</span>
          </button>

          <div className="border-t border-slate-600 my-1"></div>

          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-600 hover:text-white text-red-400 flex items-center gap-2 transition-all rounded"
            onClick={() => handleContextAction('delete')}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Entity</span>
          </button>
        </>
      );
    }

    if (contextMenuStage === 'edit' && contextMenu.node) {
      const nodeType = entityTypes.find((t) => t.id === contextMenu.node?.type);

      return (
        <div className="p-4" style={{ width: '280px' }}>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-600">
            <span className="text-2xl">
              {getEntityIcon ? getEntityIcon(contextMenu.node.type) : nodeType?.icon}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Edit Entity</div>
              <div className="text-xs text-slate-400">
                {nodeType?.name || contextMenu.node.type}
              </div>
            </div>
          </div>

          {/* Value Input */}
          <input
            type="text"
            placeholder="Enter new label"
            value={entityValue}
            onChange={(e) => onEntityValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && entityValue.trim() && contextMenu.node) {
                onUpdateEntityLabel(contextMenu.node.id, entityValue.trim());
                onClose();
                onStageChange('main');
                onEntityValueChange('');
              }
            }}
            className="w-full px-3 py-2 mb-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onStageChange('main');
                onEntityValueChange('');
              }}
              className="flex-1 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (entityValue.trim() && contextMenu.node) {
                  onUpdateEntityLabel(contextMenu.node.id, entityValue.trim());
                  onClose();
                  onStageChange('main');
                  onEntityValueChange('');
                }
              }}
              disabled={!entityValue.trim()}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================================================
  // RENDER: TRANSFORMS SUBMENU
  // ============================================================================

  const renderTransformsSubmenu = () => {
    if (contextMenuStage !== 'transforms' || !contextMenu.node) return null;

    // Smart positioning for submenu
    const submenuWidth = 340;
    const submenuHeight = 520;
    const mainMenuRect = document
      .querySelector('.fixed.text-white.rounded-xl')
      ?.getBoundingClientRect();

    let submenuStyle: React.CSSProperties = {
      minWidth: '340px',
      maxHeight: '520px',
    };

    if (mainMenuRect) {
      // Horizontal positioning
      if (mainMenuRect.right + submenuWidth > windowWidth) {
        submenuStyle.right = '100%';
        submenuStyle.marginRight = '12px';
      } else {
        submenuStyle.left = '100%';
        submenuStyle.marginLeft = '12px';
      }

      // Vertical positioning
      const availableSpaceBelow = windowHeight - mainMenuRect.top;
      const availableSpaceAbove = mainMenuRect.top;

      if (submenuHeight > availableSpaceBelow && availableSpaceAbove > availableSpaceBelow) {
        submenuStyle.bottom = 0;
        submenuStyle.maxHeight = `${Math.min(availableSpaceAbove - 20, submenuHeight)}px`;
      } else {
        submenuStyle.top = 0;
        submenuStyle.maxHeight = `${Math.min(availableSpaceBelow - 20, submenuHeight)}px`;
      }
    }

    return (
      <div
        className="absolute text-white rounded-xl p-4 overflow-y-auto"
        style={{
          ...submenuStyle,
          background: 'rgba(30, 41, 59, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow:
            '0 25px 30px -5px rgba(0, 0, 0, 0.5), 0 15px 15px -5px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="mb-4">
          <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Run Transforms
          </div>
          <div className="text-xs text-slate-400 mb-3">
            Upload a file (Bank Statement, CDR, etc.) to run analysis transforms
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-xs text-slate-200 mb-2 font-medium">Upload File</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.eml"
            onChange={handleFileUpload}
            className="block w-full text-xs text-white rounded-lg cursor-pointer transition-all focus:outline-none file:mr-3 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:text-white file:transition-all hover:file:scale-105"
            style={{
              background: 'rgba(51, 65, 85, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          {uploadedFile && (
            <div
              className="mt-2 text-xs text-emerald-300 flex items-center gap-1.5 px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium">{uploadedFile.name}</span>
            </div>
          )}
        </div>

        {/* Transform Options */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4 pr-1">
          {transforms.map((transform) => {
            const badgeStyle = getTransformBadgeStyle(transform.type);

            return (
              <button
                key={transform.id}
                onClick={() => handleTransformClick(transform)}
                className="w-full flex items-start gap-2.5 px-3 py-3 text-xs rounded-lg transition-all text-left group relative overflow-hidden"
                style={{
                  background: 'rgba(51, 65, 85, 0.4)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(71, 85, 105, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(51, 65, 85, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span className="text-lg mt-0.5 transition-transform group-hover:scale-110">
                  {transform.icon}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-white group-hover:text-blue-200 transition-colors">
                    {transform.name}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                    {transform.desc}
                  </div>
                  <div
                    className="text-[9px] mt-1.5 uppercase tracking-wider font-medium px-2 py-0.5 rounded inline-block"
                    style={badgeStyle}
                  >
                    {transform.type}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            onStageChange('main');
            onUploadedFileChange(null);
          }}
          className="w-full px-3 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
          style={{
            background: 'rgba(51, 65, 85, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#cbd5e1',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(71, 85, 105, 0.7)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(51, 65, 85, 0.5)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!contextMenu.visible) return null;

  return (
    <div
      className="fixed text-white rounded-xl z-50"
      style={{
        left: left,
        top: top,
        maxWidth: contextMenuStage === 'search' ? '400px' : '260px',
        maxHeight: contextMenuStage === 'search' ? '500px' : 'auto',
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow:
          '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.isCanvas ? renderCanvasContextMenu() : renderNodeContextMenu()}
      {renderTransformsSubmenu()}
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default GraphContextMenus;
