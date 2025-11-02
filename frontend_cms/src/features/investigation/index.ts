/**
 * ============================================================================
 * INVESTIGATION WORKBENCH - MODULE EXPORTS
 * ============================================================================
 * Central export point for all investigation features
 */

// Types
export * from './types';

// Constants
export * from './constants/entityTypes';
export * from './constants/relationshipTypes';

// Utilities
export * from './utils/graphAlgorithms';
export * from './utils/colorUtils';
export * from './utils/focusMode';
export * from './utils/graphHierarchy';

// Hooks
export * from './hooks/useGraphData';

// Components
export { LayerControl } from './components/LayerControl';
export { PathAnalysisPanel } from './components/PathAnalysisPanel';
export { GraphStatisticsPanel } from './components/GraphStatisticsPanel';
export { MiniMap } from './components/MiniMap';
export { TimelineFilter } from './components/TimelineFilter';
export { EnhancedEdge } from './components/EnhancedEdge';
export { CommunityVisualization } from './components/CommunityVisualization';
export { TransformResultContainer } from './components/TransformResultContainer';
export { SankeyDiagram } from './components/SankeyDiagram';
export { RiskAnalysisDisplay } from './components/RiskAnalysisDisplay';
export { GraphSkeleton, NodeSkeleton, TransformLoadingState } from './components/LoadingStates';
export { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary';
export { KeyboardShortcutsModal, useKeyboardShortcuts, SHORTCUTS } from './components/KeyboardShortcuts';

// Core
export { ModuleRegistry } from './core/moduleRegistry';
export type { DataSourceModule } from './core/moduleRegistry';

// Modules - Financial
export * from './modules/financial';

// Modules - Telecom
export * from './modules/telecom';

// Modules - Social Media
export * from './modules/socialmedia';

// Modules - Correlation
export { IdentityResolver } from './modules/correlation/identityResolution';
export { CrossSourceLinker } from './modules/correlation/crossSourceLinking';
export { LocationTriangulator } from './modules/correlation/locationTriangulation';
export type { LocationSource } from './modules/correlation/locationTriangulation';
export { LifestyleChecker } from './modules/correlation/lifestyleConsistency';

// Modules - Automation
export { FileUploadHandler } from './modules/automation/fileUploadHandler';
export { EntityExtractor } from './modules/automation/entityExtraction';
export { TransformQueue } from './modules/automation/transformQueue';
export { AlertGenerator } from './modules/automation/alertGeneration';
export type { Alert } from './modules/automation/alertGeneration';

// Modules - Intelligence
export { EmailAnalyzer } from './modules/intelligence/emailAnalyzer';
export { WebAnalyzer } from './modules/intelligence/webAnalyzer';
export { LocationAnalyzer } from './modules/intelligence/locationAnalyzer';
export { DeviceAnalyzer } from './modules/intelligence/deviceAnalyzer';

// Performance
export { PerformanceOptimizer } from './utils/performance';
