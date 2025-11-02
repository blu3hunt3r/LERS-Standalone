/**
 * Phase 5, Feature 2, Phase 2: useViewport Hook
 *
 * Manages viewport state (zoom, pan) with localStorage persistence.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 109-134, 629-660).
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ViewportState {
  /** Current zoom level (0.3 - 3.0) */
  zoom: number;
  /** Current pan offset */
  pan: { x: number; y: number };
}

export interface UseViewportOptions {
  /** Unique key for localStorage persistence (e.g., caseId) */
  storageKey: string;
  /** Initial zoom level (default: 1.0) */
  initialZoom?: number;
  /** Initial pan offset (default: { x: 0, y: 0 }) */
  initialPan?: { x: number; y: number };
  /** Minimum zoom level (default: 0.3) */
  minZoom?: number;
  /** Maximum zoom level (default: 3.0) */
  maxZoom?: number;
  /** Enable localStorage persistence (default: true) */
  persist?: boolean;
}

export interface UseViewportReturn extends ViewportState {
  /** Set zoom level directly */
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  /** Set pan offset directly */
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  /** Zoom in/out by delta */
  handleZoom: (delta: number) => void;
  /** Handle mouse wheel event (pan or zoom) */
  handleWheel: (e: React.WheelEvent) => void;
  /** Zoom in by 0.1 */
  zoomIn: () => void;
  /** Zoom out by 0.1 */
  zoomOut: () => void;
  /** Reset to initial viewport */
  resetViewport: () => void;
  /** Fit content to viewport */
  fitToView: (bounds: { minX: number; maxX: number; minY: number; maxY: number; }, containerWidth: number, containerHeight: number, padding?: number) => void;
  /** Center on specific point */
  centerOn: (x: number, y: number, containerWidth: number, containerHeight: number) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing viewport state (zoom and pan) with localStorage persistence
 *
 * @param options - Configuration options
 * @returns Viewport state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   zoom,
 *   pan,
 *   setZoom,
 *   setPan,
 *   handleWheel,
 *   zoomIn,
 *   zoomOut,
 *   resetViewport,
 * } = useViewport({
 *   storageKey: caseId,
 *   initialZoom: 1.0,
 *   persist: true,
 * });
 *
 * // Use in SVG transform
 * <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
 *   {/* content *\/}
 * </g>
 *
 * // Handle wheel events
 * <svg onWheel={handleWheel}>
 *   {/* ... *\/}
 * </svg>
 * ```
 */
export function useViewport(options: UseViewportOptions): UseViewportReturn {
  const {
    storageKey,
    initialZoom = 1.0,
    initialPan = { x: 0, y: 0 },
    minZoom = 0.3,
    maxZoom = 3.0,
    persist = true,
  } = options;

  // ============================================================================
  // STATE WITH LOCALSTORAGE PERSISTENCE
  // ============================================================================

  const [zoom, setZoom] = useState<number>(() => {
    if (!persist) return initialZoom;

    const saved = localStorage.getItem(`investigation-zoom-${storageKey}`);
    return saved ? parseFloat(saved) : initialZoom;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    if (!persist) return initialPan;

    const saved = localStorage.getItem(`investigation-pan-${storageKey}`);
    return saved ? JSON.parse(saved) : initialPan;
  });

  // ============================================================================
  // PERSISTENCE EFFECTS
  // ============================================================================

  // Save zoom to localStorage whenever it changes
  useEffect(() => {
    if (persist) {
      localStorage.setItem(`investigation-zoom-${storageKey}`, zoom.toString());
    }
  }, [zoom, storageKey, persist]);

  // Save pan to localStorage whenever it changes
  useEffect(() => {
    if (persist) {
      localStorage.setItem(`investigation-pan-${storageKey}`, JSON.stringify(pan));
    }
  }, [pan, storageKey, persist]);

  // ============================================================================
  // ZOOM HANDLERS
  // ============================================================================

  /**
   * Handle zoom by delta (clamps to min/max)
   */
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(minZoom, Math.min(maxZoom, prev + delta)));
  }, [minZoom, maxZoom]);

  /**
   * Zoom in by 0.1
   */
  const zoomIn = useCallback(() => {
    handleZoom(0.1);
  }, [handleZoom]);

  /**
   * Zoom out by 0.1
   */
  const zoomOut = useCallback(() => {
    handleZoom(-0.1);
  }, [handleZoom]);

  // ============================================================================
  // WHEEL HANDLER
  // ============================================================================

  /**
   * Handle mouse wheel event
   * - Ctrl/Cmd + Wheel: Zoom (smooth, 0.02 increments)
   * - Wheel: Pan (smooth, 0.5x sensitivity)
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl + Scroll = Zoom (very smooth)
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      handleZoom(delta);
    } else {
      // Normal scroll = Pan canvas (smooth, reduced sensitivity)
      setPan((prev: { x: number; y: number }) => ({
        x: prev.x - (e.deltaX * 0.5),
        y: prev.y - (e.deltaY * 0.5),
      }));
    }
  }, [handleZoom]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Reset viewport to initial state
   */
  const resetViewport = useCallback(() => {
    setZoom(initialZoom);
    setPan(initialPan);
  }, [initialZoom, initialPan]);

  /**
   * Fit content to viewport
   *
   * @param bounds - Bounding box of content
   * @param containerWidth - Container width in pixels
   * @param containerHeight - Container height in pixels
   * @param padding - Optional padding around content (default: 50)
   */
  const fitToView = useCallback((
    bounds: { minX: number; maxX: number; minY: number; maxY: number; },
    containerWidth: number,
    containerHeight: number,
    padding: number = 50
  ) => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    if (contentWidth === 0 || contentHeight === 0) return;

    // Calculate zoom to fit content with padding
    const scaleX = (containerWidth - padding * 2) / contentWidth;
    const scaleY = (containerHeight - padding * 2) / contentHeight;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, Math.min(scaleX, scaleY)));

    // Calculate pan to center content
    const contentCenterX = bounds.minX + contentWidth / 2;
    const contentCenterY = bounds.minY + contentHeight / 2;
    const newPan = {
      x: containerWidth / 2 - contentCenterX * newZoom,
      y: containerHeight / 2 - contentCenterY * newZoom,
    };

    setZoom(newZoom);
    setPan(newPan);
  }, [minZoom, maxZoom]);

  /**
   * Center viewport on specific point
   *
   * @param x - X coordinate to center on
   * @param y - Y coordinate to center on
   * @param containerWidth - Container width in pixels
   * @param containerHeight - Container height in pixels
   */
  const centerOn = useCallback((
    x: number,
    y: number,
    containerWidth: number,
    containerHeight: number
  ) => {
    const newPan = {
      x: containerWidth / 2 - x * zoom,
      y: containerHeight / 2 - y * zoom,
    };
    setPan(newPan);
  }, [zoom]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    zoom,
    pan,
    setZoom,
    setPan,
    handleZoom,
    handleWheel,
    zoomIn,
    zoomOut,
    resetViewport,
    fitToView,
    centerOn,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for fullscreen functionality
 *
 * @param containerRef - Ref to container element
 * @returns Fullscreen state and toggle function
 *
 * @example
 * ```typescript
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
 *
 * <div ref={containerRef}>
 *   <button onClick={toggleFullscreen}>
 *     {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
 *   </button>
 * </div>
 * ```
 */
export function useFullscreen(containerRef: React.RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, [containerRef]);

  // Listen for fullscreen changes (user pressing Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}

/**
 * Convert screen coordinates to graph coordinates
 *
 * Utility function to transform mouse/pointer coordinates from screen space
 * to graph space, accounting for zoom and pan.
 *
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @param pan - Current pan offset
 * @param zoom - Current zoom level
 * @returns Graph coordinates
 */
export function screenToGraph(
  screenX: number,
  screenY: number,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  };
}

/**
 * Convert graph coordinates to screen coordinates
 *
 * Inverse of screenToGraph.
 *
 * @param graphX - Graph X coordinate
 * @param graphY - Graph Y coordinate
 * @param pan - Current pan offset
 * @param zoom - Current zoom level
 * @returns Screen coordinates
 */
export function graphToScreen(
  graphX: number,
  graphY: number,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: graphX * zoom + pan.x,
    y: graphY * zoom + pan.y,
  };
}
