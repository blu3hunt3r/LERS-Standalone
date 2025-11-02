/**
 * Phase 5, Feature 2, Phase 3: FloatingControls Component
 *
 * Floating control panel for graph interactions:
 * - Zoom in button
 * - Zoom out button
 * - Fullscreen toggle
 * - Fixed position (doesn't move with pan)
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 3769-3793)
 */

import React from 'react';
import { Plus, Maximize2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FloatingControlsProps {
  /** Handler for zoom in (positive delta) or zoom out (negative delta) */
  onZoom: (delta: number) => void;

  /** Handler for fullscreen toggle */
  onFullscreenToggle: () => void;

  /** Current fullscreen state */
  isFullscreen: boolean;

  /** Optional: Custom position (default: bottom-6 right-6) */
  position?: {
    bottom?: string;
    right?: string;
    top?: string;
    left?: string;
  };

  /** Optional: Custom z-index (default: 50) */
  zIndex?: number;

  /** Optional: Hide zoom controls */
  hideZoomControls?: boolean;

  /** Optional: Hide fullscreen control */
  hideFullscreenControl?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FloatingControls Component
 *
 * Floating control panel with zoom and fullscreen buttons
 *
 * @param props - FloatingControlsProps
 *
 * @example
 * ```tsx
 * <FloatingControls
 *   onZoom={(delta) => setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)))}
 *   onFullscreenToggle={toggleFullscreen}
 *   isFullscreen={isFullscreen}
 * />
 * ```
 */
export const FloatingControls: React.FC<FloatingControlsProps> = ({
  onZoom,
  onFullscreenToggle,
  isFullscreen,
  position = { bottom: '1.5rem', right: '1.5rem' },
  zIndex = 50,
  hideZoomControls = false,
  hideFullscreenControl = false,
}) => {
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className="fixed flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1.5 border border-gray-200"
      style={{
        bottom: position.bottom,
        right: position.right,
        top: position.top,
        left: position.left,
        zIndex: zIndex,
      }}
    >
      {!hideZoomControls && (
        <>
          <button
            onClick={() => onZoom(0.1)}
            className="p-2.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>

          <button
            onClick={() => onZoom(-0.1)}
            className="p-2.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <span className="text-gray-700 text-xl font-bold leading-none">−</span>
          </button>

          {!hideFullscreenControl && <div className="border-t border-gray-200 my-0.5"></div>}
        </>
      )}

      {!hideFullscreenControl && (
        <button
          onClick={onFullscreenToggle}
          className="p-2.5 hover:bg-gray-100 rounded transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default FloatingControls;
