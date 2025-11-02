/**
 * Phase 5, Feature 2, Phase 4: Unit Tests for useViewport Hook
 *
 * Tests viewport management functionality:
 * - Zoom in/out
 * - Pan controls
 * - Fit to view
 * - Center on node
 * - Reset viewport
 * - LocalStorage persistence
 * - Coordinate conversion
 */

import { renderHook, act } from '@testing-library/react';
import { useViewport } from '../useViewport';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useViewport', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // ============================================================================
  // BASIC INITIALIZATION
  // ============================================================================

  test('initializes with default values', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.zoom).toBe(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  test('initializes with custom default values', () => {
    const { result } = renderHook(() =>
      useViewport({ initialZoom: 2, initialPan: { x: 100, y: 200 } })
    );

    expect(result.current.zoom).toBe(2);
    expect(result.current.pan).toEqual({ x: 100, y: 200 });
  });

  test('loads from localStorage if available', () => {
    localStorageMock.setItem('investigation-zoom-case-123', '1.5');
    localStorageMock.setItem('investigation-pan-case-123', JSON.stringify({ x: 50, y: 75 }));

    const { result } = renderHook(() => useViewport({ storageKey: 'case-123' }));

    expect(result.current.zoom).toBe(1.5);
    expect(result.current.pan).toEqual({ x: 50, y: 75 });
  });

  // ============================================================================
  // ZOOM FUNCTIONS
  // ============================================================================

  test('zooms in correctly', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.zoom).toBe(1.2); // 1 + 0.2
  });

  test('zooms out correctly', () => {
    const { result } = renderHook(() => useViewport({ initialZoom: 2 }));

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.zoom).toBe(1.8); // 2 - 0.2
  });

  test('respects min zoom limit', () => {
    const { result } = renderHook(() => useViewport({ minZoom: 0.5, zoomStep: 0.6 }));

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.zoom).toBe(0.5); // Clamped to minZoom
  });

  test('respects max zoom limit', () => {
    const { result } = renderHook(() => useViewport({ initialZoom: 2.8, maxZoom: 3, zoomStep: 0.5 }));

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.zoom).toBe(3); // Clamped to maxZoom
  });

  test('handleZoom with positive delta increases zoom', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.handleZoom(0.3);
    });

    expect(result.current.zoom).toBe(1.3);
  });

  test('handleZoom with negative delta decreases zoom', () => {
    const { result } = renderHook(() => useViewport({ initialZoom: 2 }));

    act(() => {
      result.current.handleZoom(-0.5);
    });

    expect(result.current.zoom).toBe(1.5);
  });

  // ============================================================================
  // PAN FUNCTIONS
  // ============================================================================

  test('pans correctly', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.handlePan(100, 50);
    });

    expect(result.current.pan).toEqual({ x: 100, y: 50 });
  });

  test('pans relative to current position', () => {
    const { result } = renderHook(() => useViewport({ initialPan: { x: 50, y: 25 } }));

    act(() => {
      result.current.handlePan(30, 40);
    });

    expect(result.current.pan).toEqual({ x: 80, y: 65 });
  });

  // ============================================================================
  // FIT TO VIEW
  // ============================================================================

  test('fit to view centers nodes with padding', () => {
    const nodes = [
      { x: 0, y: 0 },
      { x: 1000, y: 500 },
    ];

    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.fitToView(nodes, 800, 600, 50);
    });

    // Should calculate zoom to fit nodes with padding
    expect(result.current.zoom).toBeGreaterThan(0);
    expect(result.current.zoom).toBeLessThanOrEqual(3);
    // Pan should center the bounding box
    expect(result.current.pan.x).not.toBe(0);
    expect(result.current.pan.y).not.toBe(0);
  });

  test('fit to view handles empty nodes array', () => {
    const { result } = renderHook(() => useViewport());

    const initialZoom = result.current.zoom;
    const initialPan = result.current.pan;

    act(() => {
      result.current.fitToView([], 800, 600);
    });

    // Should not change viewport for empty nodes
    expect(result.current.zoom).toBe(initialZoom);
    expect(result.current.pan).toEqual(initialPan);
  });

  // ============================================================================
  // CENTER ON NODE
  // ============================================================================

  test('centers on specific node', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.centerOn(500, 300, 800, 600);
    });

    // Should pan to center the point
    expect(result.current.pan.x).toBe(400 - 500); // (800/2) - 500
    expect(result.current.pan.y).toBe(300 - 300); // (600/2) - 300
  });

  // ============================================================================
  // RESET VIEWPORT
  // ============================================================================

  test('resets viewport to defaults', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.handleZoom(0.5);
      result.current.handlePan(100, 200);
    });

    expect(result.current.zoom).toBe(1.5);
    expect(result.current.pan).toEqual({ x: 100, y: 200 });

    act(() => {
      result.current.resetViewport();
    });

    expect(result.current.zoom).toBe(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  // ============================================================================
  // LOCALSTORAGE PERSISTENCE
  // ============================================================================

  test('persists zoom to localStorage', () => {
    const { result } = renderHook(() => useViewport({ storageKey: 'case-456' }));

    act(() => {
      result.current.zoomIn();
    });

    expect(localStorageMock.getItem('investigation-zoom-case-456')).toBe('1.2');
  });

  test('persists pan to localStorage', () => {
    const { result } = renderHook(() => useViewport({ storageKey: 'case-789' }));

    act(() => {
      result.current.handlePan(150, 250);
    });

    const stored = localStorageMock.getItem('investigation-pan-case-789');
    expect(JSON.parse(stored!)).toEqual({ x: 150, y: 250 });
  });

  test('does not persist if no storageKey', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.zoomIn();
    });

    expect(localStorageMock.getItem('investigation-zoom-undefined')).toBeNull();
  });

  // ============================================================================
  // COORDINATE CONVERSION
  // ============================================================================

  test('converts screen to graph coordinates', () => {
    const { result } = renderHook(() => useViewport({ initialZoom: 2, initialPan: { x: 100, y: 50 } }));

    const graphCoords = result.current.screenToGraph(400, 300);

    expect(graphCoords.x).toBe((400 - 100) / 2); // (screenX - pan.x) / zoom
    expect(graphCoords.y).toBe((300 - 50) / 2); // (screenY - pan.y) / zoom
  });

  test('converts graph to screen coordinates', () => {
    const { result } = renderHook(() => useViewport({ initialZoom: 2, initialPan: { x: 100, y: 50 } }));

    const screenCoords = result.current.graphToScreen(150, 125);

    expect(screenCoords.x).toBe(150 * 2 + 100); // graphX * zoom + pan.x
    expect(screenCoords.y).toBe(125 * 2 + 50); // graphY * zoom + pan.y
  });

  // ============================================================================
  // WHEEL HANDLER
  // ============================================================================

  test('handleWheel with Ctrl key zooms', () => {
    const { result } = renderHook(() => useViewport());

    const mockEvent = {
      deltaY: -100, // Scroll up
      ctrlKey: true,
      preventDefault: jest.fn(),
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.zoom).toBeGreaterThan(1); // Zoomed in
  });

  test('handleWheel without Ctrl key pans', () => {
    const { result } = renderHook(() => useViewport());

    const mockEvent = {
      deltaX: 50,
      deltaY: 100,
      ctrlKey: false,
      metaKey: false,
      preventDefault: jest.fn(),
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.pan.x).toBe(-25); // -deltaX * 0.5
    expect(result.current.pan.y).toBe(-50); // -deltaY * 0.5
  });
});
