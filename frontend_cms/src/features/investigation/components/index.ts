/**
 * Investigation Components - Barrel Export
 *
 * Centralized export for all investigation graph components.
 * Phase 5, Feature 2, Phase 3: UI Components extraction
 */

// ============================================================================
// TOOLBAR & CONTROLS
// ============================================================================

export { GraphToolbar } from './GraphToolbar';
export type {
  EntityType as ToolbarEntityType,
  GraphToolbarProps,
} from './GraphToolbar';

export { FloatingControls } from './FloatingControls';
export type { FloatingControlsProps } from './FloatingControls';

// ============================================================================
// CONTEXT MENUS
// ============================================================================

export { GraphContextMenus } from './GraphContextMenus';
export type {
  Node as ContextMenuNode,
  EntityType as ContextMenuEntityType,
  Transform,
  ContextMenuState,
  ContextMenuStage,
  GraphContextMenusProps,
} from './GraphContextMenus';

export { LinkContextMenu } from './LinkContextMenu';
export type {
  Link as LinkContextMenuLink,
  LinkContextMenuState,
  RelationshipType,
  EditingLinkData,
  LinkContextMenuProps,
} from './LinkContextMenu';

// ============================================================================
// MODALS
// ============================================================================

export { EntityDetailsModal } from './EntityDetailsModal';
export type {
  Node as EntityDetailsNode,
  EntityDetailsModalProps,
} from './EntityDetailsModal';

export { AnnotationModal } from './AnnotationModal';
export type {
  AnnotationTarget,
  AnnotationData,
  AnnotationModalProps,
} from './AnnotationModal';

// ============================================================================
// MENUS & PANELS
// ============================================================================

export { LayoutMenu } from './LayoutMenu';
export type {
  LayoutType,
  LayoutOption,
  LayoutMenuProps,
} from './LayoutMenu';

// LayerControl is already available at @/features/investigation/components/LayerControl
// It can be used directly as the layer menu component
export { LayerControl } from './LayerControl';

// ============================================================================
// GRAPH CANVAS & RENDERERS
// ============================================================================

export { GraphCanvas } from './GraphCanvas';
export type {
  Node as GraphCanvasNode,
  Link as GraphCanvasLink,
  LinkRenderType as GraphCanvasLinkRenderType,
  LayoutType as GraphCanvasLayoutType,
  GraphCanvasProps,
} from './GraphCanvas';

export { NodeRenderer } from './NodeRenderer';
export type {
  Node as NodeRendererNode,
  NodeRendererProps,
} from './NodeRenderer';

export { LinkRenderer } from './LinkRenderer';
export type {
  Node as LinkRendererNode,
  Link as LinkRendererLink,
  LinkRenderType,
  LayoutType as LinkRendererLayoutType,
  LinkRendererProps,
} from './LinkRenderer';

export { LayerControlsOverlay } from './LayerControlsOverlay';
export type {
  Node as LayerControlsNode,
  LayerControlsOverlayProps,
} from './LayerControlsOverlay';

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Common types used across multiple components
export type {
  Node,
  Link,
  EntityType,
} from '@/features/investigation/types';
