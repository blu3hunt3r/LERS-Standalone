/**
 * Phase 5, Feature 2, Phase 3: GraphToolbar Component
 *
 * Main toolbar for the investigation graph with:
 * - Entity/link statistics badges
 * - Search bar with highlighting
 * - Undo/redo controls
 * - Entity type filters
 * - Link rendering type selector
 * - Path analysis toggle
 * - Export button
 * - Layout menu
 * - Layer visibility panel
 * - Quick tips
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 2137-2401)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  Undo2,
  Redo2,
  Download,
  Layout,
  Layers,
  Route,
  X,
  Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface EntityType {
  id: string;
  name: string;
  icon: string;
  category?: string;
}

export interface GraphToolbarProps {
  // Statistics
  filteredNodeCount: number;
  filteredLinkCount: number;
  selectedNodeCount: number;
  totalNodeCount: number;
  totalLinkCount: number;

  // Search
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  highlightedNodeCount: number;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Entity Filters
  showEntityFilters: boolean;
  onShowEntityFiltersChange: (show: boolean) => void;
  visibleEntityTypes: Set<string>;
  onVisibleEntityTypesChange: (types: Set<string>) => void;
  entityTypes: EntityType[];

  // Link Type
  linkRenderType: 'curved' | 'straight' | 'freehand';
  onLinkRenderTypeChange: (type: 'curved' | 'straight' | 'freehand') => void;
  showLinkTypeMenu: boolean;
  onShowLinkTypeMenuChange: (show: boolean) => void;

  // Path Analysis
  showPathAnalysis: boolean;
  onShowPathAnalysisChange: (show: boolean) => void;

  // Export
  onExport: () => void;

  // Layout Menu
  showLayoutMenu: boolean;
  onShowLayoutMenuChange: (show: boolean) => void;
  layoutMenuComponent?: React.ReactNode;

  // Layer Panel
  showLayerPanel: boolean;
  onShowLayerPanelChange: (show: boolean) => void;
  layerMenuComponent?: React.ReactNode;

  // Optional: Custom tips
  quickTips?: Array<{ icon?: string; text: string }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GraphToolbar Component
 *
 * Main toolbar for investigation graph with all controls and stats
 *
 * @param props - GraphToolbarProps
 *
 * @example
 * ```tsx
 * <GraphToolbar
 *   filteredNodeCount={nodes.length}
 *   filteredLinkCount={links.length}
 *   selectedNodeCount={selectedNodes.size}
 *   searchQuery={searchQuery}
 *   onSearchQueryChange={setSearchQuery}
 *   highlightedNodeCount={highlightedNodes.size}
 *   canUndo={historyIndex >= 0}
 *   canRedo={historyIndex < historyStack.length - 1}
 *   onUndo={handleUndo}
 *   onRedo={handleRedo}
 *   visibleEntityTypes={visibleEntityTypes}
 *   onVisibleEntityTypesChange={setVisibleEntityTypes}
 *   entityTypes={ENTITY_TYPES}
 *   linkRenderType={linkRenderType}
 *   onLinkRenderTypeChange={setLinkRenderType}
 *   onExport={exportGraphAsJSON}
 *   layoutMenuComponent={<LayoutMenu />}
 *   layerMenuComponent={<LayerMenu />}
 * />
 * ```
 */
export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  filteredNodeCount,
  filteredLinkCount,
  selectedNodeCount,
  totalNodeCount,
  totalLinkCount,
  searchQuery,
  onSearchQueryChange,
  highlightedNodeCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showEntityFilters,
  onShowEntityFiltersChange,
  visibleEntityTypes,
  onVisibleEntityTypesChange,
  entityTypes,
  linkRenderType,
  onLinkRenderTypeChange,
  showLinkTypeMenu,
  onShowLinkTypeMenuChange,
  showPathAnalysis,
  onShowPathAnalysisChange,
  onExport,
  showLayoutMenu,
  onShowLayoutMenuChange,
  layoutMenuComponent,
  showLayerPanel,
  onShowLayerPanelChange,
  layerMenuComponent,
  quickTips,
}) => {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectAllEntityTypes = () => {
    const allTypes = new Set(entityTypes.map(et => et.id));
    onVisibleEntityTypesChange(allTypes);
    toast.success(`Selected all ${allTypes.size} entity types`);
  };

  const handleClearAllEntityTypes = () => {
    onVisibleEntityTypesChange(new Set());
    toast('Cleared all filters - no entities visible');
  };

  const handleToggleEntityType = (typeId: string, checked: boolean) => {
    const newVisible = new Set(visibleEntityTypes);
    if (checked) {
      newVisible.add(typeId);
    } else {
      newVisible.delete(typeId);
    }
    onVisibleEntityTypesChange(newVisible);
  };

  const handleLinkTypeSelect = (type: 'curved' | 'straight' | 'freehand') => {
    onLinkRenderTypeChange(type);
    onShowLinkTypeMenuChange(false);
  };

  // Group entity types by category
  const categorizedEntityTypes = React.useMemo(() => {
    const categorized: Record<string, EntityType[]> = {};
    entityTypes.forEach(entityType => {
      const category = entityType.category || 'Other';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(entityType);
    });
    return categorized;
  }, [entityTypes]);

  // Default quick tips
  const defaultQuickTips = [
    { icon: '💡', text: 'Hover and drag blue dot to create link' },
    { text: 'Click node to view details' },
    { text: 'Scroll to pan, Ctrl+Scroll to zoom' },
    { text: 'Right-click canvas to add entity' },
  ];

  const tips = quickTips || defaultQuickTips;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title & Stats */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-normal text-gray-900">Investigation Graph</h2>
          <Badge variant="outline" className="font-mono">
            {filteredNodeCount} entities
          </Badge>
          <Badge variant="outline" className="font-mono">
            {filteredLinkCount} links
          </Badge>
          {selectedNodeCount > 0 && (
            <Badge variant="default" className="font-mono">
              {selectedNodeCount} selected
            </Badge>
          )}
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          {highlightedNodeCount > 0 && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-600">
              {highlightedNodeCount} found
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300"></div>

          {/* Entity Filters Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowEntityFiltersChange(!showEntityFilters)}
              title="Filter by Entity Type"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Entity Filters
            </Button>

            {showEntityFilters && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[500px] overflow-y-auto">
                <div className="py-2 px-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Entity Type Filters
                    </h3>
                    <button
                      onClick={() => onShowEntityFiltersChange(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Select All / Clear All */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={handleSelectAllEntityTypes}
                      className="flex-1 px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-gray-300 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleClearAllEntityTypes}
                      className="flex-1 px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-gray-300 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Result Count */}
                  <div className="mb-3 px-2 py-1.5 bg-blue-50 rounded text-xs text-gray-700 border border-blue-200">
                    Showing{' '}
                    <span className="font-bold text-gray-900">{filteredNodeCount}</span> of{' '}
                    <span className="font-bold">{totalNodeCount}</span> entities
                    {filteredLinkCount < totalLinkCount && (
                      <span className="ml-1 text-gray-500">
                        ({filteredLinkCount}/{totalLinkCount} links)
                      </span>
                    )}
                  </div>

                  {/* Entity Categories */}
                  <div className="space-y-2">
                    {Object.entries(categorizedEntityTypes).map(([category, types]) => (
                      <div
                        key={category}
                        className="border-b border-gray-200 pb-2 last:border-0"
                      >
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 px-1">
                          {category}
                        </div>
                        <div className="space-y-1">
                          {types.map(entityType => (
                            <label
                              key={entityType.id}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer group transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={visibleEntityTypes.has(entityType.id)}
                                onChange={(e) =>
                                  handleToggleEntityType(entityType.id, e.target.checked)
                                }
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors flex items-center gap-1.5">
                                <span>{entityType.icon}</span>
                                <span>{entityType.name}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Link Type Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowLinkTypeMenuChange(!showLinkTypeMenu)}
              title="Link Rendering Type"
            >
              <Link2 className="h-4 w-4 mr-1.5" />
              {linkRenderType === 'curved'
                ? 'Curved'
                : linkRenderType === 'straight'
                ? 'Straight'
                : 'Freehand'}{' '}
              Links
            </Button>

            {showLinkTypeMenu && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50 link-type-menu-content">
                <div className="py-1">
                  <button
                    onClick={() => handleLinkTypeSelect('curved')}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                      linkRenderType === 'curved' ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        linkRenderType === 'curved' ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                    ></div>
                    Curved
                  </button>
                  <button
                    onClick={() => handleLinkTypeSelect('straight')}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                      linkRenderType === 'straight' ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        linkRenderType === 'straight' ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                    ></div>
                    Straight
                  </button>
                  <button
                    onClick={() => handleLinkTypeSelect('freehand')}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                      linkRenderType === 'freehand' ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        linkRenderType === 'freehand' ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                    ></div>
                    Freehand
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Path Analysis Button */}
          <Button
            variant={showPathAnalysis ? 'default' : 'outline'}
            size="sm"
            onClick={() => onShowPathAnalysisChange(!showPathAnalysis)}
            title="Path Analysis"
          >
            <Route className="h-4 w-4 mr-1.5" />
            Paths
          </Button>

          {/* Export Button */}
          <Button variant="outline" size="sm" onClick={onExport} title="Export Graph">
            <Download className="h-4 w-4" />
          </Button>

          {/* Layout Dropdown */}
          <div className="relative">
            <Button
              variant={showLayoutMenu ? 'default' : 'outline'}
              size="sm"
              onClick={() => onShowLayoutMenuChange(!showLayoutMenu)}
              title="Auto Layout Options"
            >
              <Layout className="h-4 w-4 mr-1.5" />
              Layout
            </Button>

            {showLayoutMenu && layoutMenuComponent}
          </div>

          {/* Layer Visibility Dropdown */}
          <div className="relative">
            <Button
              variant={showLayerPanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => onShowLayerPanelChange(!showLayerPanel)}
              title="Layer Visibility"
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Layers
            </Button>

            {showLayerPanel && layerMenuComponent}
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        {tips.map((tip, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-slate-300">•</span>}
            <span>
              {tip.icon && <>{tip.icon} </>}
              {/* SECURITY FIX: Replaced dangerouslySetInnerHTML with safe rendering */}
              <span>
                {tip.text.split(/(\*\*.*?\*\*)/g).map((part, partIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={partIdx} className="text-slate-700">{part.slice(2, -2)}</strong>;
                  }
                  return <span key={partIdx}>{part}</span>;
                })}
              </span>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default GraphToolbar;
