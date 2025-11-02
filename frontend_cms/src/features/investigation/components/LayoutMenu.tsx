/**
 * Phase 5, Feature 2, Phase 3: LayoutMenu Component
 *
 * Dropdown menu for selecting graph layout algorithms:
 * - 14 layout options (force, hierarchical, tree, etc.)
 * - Grouped by category (Auto, Manual, Transform-based)
 * - Current layout indicator
 * - Icons for visual layouts
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 2073-2110)
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type LayoutType =
  | 'force'
  | 'hierarchical'
  | 'tree'
  | 'circular'
  | 'grid'
  | 'chakra'
  | 'horizontal'
  | 'block'
  | 'centrality'
  | 'orthogonal'
  | 'radial'
  | 'sankey'
  | 'timeline'
  | 'bankCluster';

export interface LayoutOption {
  label: string;
  layout: LayoutType;
  icon?: string;
  category?: 'auto' | 'manual' | 'transform';
}

export interface LayoutMenuProps {
  /** Currently active layout */
  currentLayout: LayoutType;

  /** Callback when layout is selected */
  onLayoutChange: (layout: LayoutType) => void;

  /** Callback when menu should close */
  onClose: () => void;

  /** Optional: Custom layout options */
  customLayouts?: LayoutOption[];

  /** Optional: Custom menu class name */
  className?: string;

  /** Optional: Custom menu position */
  position?: 'left' | 'right';
}

// ============================================================================
// DEFAULT LAYOUTS
// ============================================================================

const DEFAULT_LAYOUTS: LayoutOption[] = [
  // Auto Layouts (intelligent, data-driven)
  { label: 'Force-Directed', layout: 'force', category: 'auto' },
  { label: 'Hierarchical', layout: 'hierarchical', category: 'auto' },
  { label: 'Tree (Layer-based)', layout: 'tree', icon: '🌳', category: 'auto' },
  { label: 'Radial (Degree Rings)', layout: 'radial', icon: '🟠', category: 'auto' },
  { label: 'Flow / Sankey', layout: 'sankey', icon: '📈', category: 'auto' },
  { label: 'Timeline (Left → Right)', layout: 'timeline', icon: '🕒', category: 'auto' },
  { label: 'Cluster by Bank', layout: 'bankCluster', icon: '🏦', category: 'auto' },

  // Manual Layouts (user-controlled, geometric)
  { label: 'Circular', layout: 'circular', category: 'manual' },
  { label: 'Grid', layout: 'grid', category: 'manual' },
  { label: 'Horizontal Flow', layout: 'horizontal', category: 'manual' },
  { label: 'Ashoka Chakra', layout: 'chakra', category: 'manual' },

  // Transform-based Layouts (analysis-specific)
  { label: 'Block (by Type)', layout: 'block', icon: '🧱', category: 'transform' },
  { label: 'Centrality', layout: 'centrality', icon: '⭐', category: 'transform' },
  { label: 'Orthogonal', layout: 'orthogonal', icon: '📐', category: 'transform' },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LayoutMenu Component
 *
 * Dropdown menu for selecting graph layout algorithm
 *
 * @param props - LayoutMenuProps
 *
 * @example
 * ```tsx
 * <LayoutMenu
 *   currentLayout={currentLayout}
 *   onLayoutChange={(layout) => {
 *     applyLayout(layout);
 *     setCurrentLayout(layout);
 *   }}
 *   onClose={() => setShowLayoutMenu(false)}
 * />
 * ```
 */
export const LayoutMenu: React.FC<LayoutMenuProps> = ({
  currentLayout,
  onLayoutChange,
  onClose,
  customLayouts,
  className,
  position = 'right',
}) => {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLayoutSelect = (layout: LayoutType) => {
    onLayoutChange(layout);
    onClose();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const layouts = customLayouts || DEFAULT_LAYOUTS;

  // Group layouts by category
  const groupedLayouts = layouts.reduce(
    (acc, layout) => {
      const category = layout.category || 'auto';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(layout);
      return acc;
    },
    {} as Record<string, LayoutOption[]>
  );

  const renderLayoutItem = (option: LayoutOption) => {
    const isActive = currentLayout === option.layout;

    return (
      <button
        key={option.layout}
        onClick={() => handleLayoutSelect(option.layout)}
        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
          isActive ? 'bg-slate-100 text-slate-900 font-medium' : ''
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-blue-500' : 'bg-slate-300'
          }`}
        ></div>
        <span className="flex items-center gap-2">
          {option.icon && <span>{option.icon}</span>}
          {option.label}
        </span>
      </button>
    );
  };

  const renderCategory = (category: string, options: LayoutOption[], index: number) => {
    const shouldShowDivider = index > 0;

    return (
      <React.Fragment key={category}>
        {shouldShowDivider && <div className="border-t border-gray-200 my-1"></div>}
        {options.map(renderLayoutItem)}
      </React.Fragment>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const positionClass = position === 'left' ? 'left-0' : 'right-0';

  return (
    <div
      className={`absolute top-full ${positionClass} mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 layout-menu-content ${
        className || ''
      }`}
    >
      <div className="py-1">
        {Object.keys(groupedLayouts).length > 0
          ? Object.entries(groupedLayouts).map(([category, options], index) =>
              renderCategory(category, options, index)
            )
          : layouts.map(renderLayoutItem)}
      </div>
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default LayoutMenu;
