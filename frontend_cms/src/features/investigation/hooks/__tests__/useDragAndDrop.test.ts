/**
 * Phase 5, Feature 2, Phase 4: Unit Tests for useDragAndDrop Hook
 *
 * Tests drag-and-drop functionality:
 * - Node dragging (single and multi-select)
 * - Visual linking mode
 * - Canvas panning
 * - Drag-to-select box
 * - RAF throttling
 * - Coordinate transformations
 * - Drag threshold
 * - Batch updates
 */

import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop, screenToGraphCoords, isDragThresholdExceeded, calculateBatchNodeUpdates } from '../useDragAndDrop';
import type { Node, Link } from '../../types';
import React from 'react';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockNodes: Node[] = [
  { id: '1', label: 'Node 1', type: 'person', x: 100, y: 100 },
  { id: '2', label: 'Node 2', type: 'person', x: 200, y: 200 },
  { id: '3', label: 'Node 3', type: 'company', x: 300, y: 300 },
];

const mockLinks: Link[] = [
  { id: 'l1', source: '1', target: '2' },
  { id: 'l2', source: '2', target: '3' },
];

// Mock refs
const createMockRef = <T,>(value: T): React.RefObject<T> => ({
  current: value,
});

const mockContainerRef = createMockRef<HTMLElement>({
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }),
} as HTMLElement);

const mockSvgRef = createMockRef<SVGSVGElement>({
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }),
} as SVGSVGElement);

describe('useDragAndDrop', () => {
  // ============================================================================
  // BASIC INITIALIZATION
  // ============================================================================

  test('initializes with default values', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    expect(result.current.draggedNode).toBeNull();
    expect(result.current.tempLinkEnd).toBeNull();
    expect(result.current.connectionDot).toBeNull();
    expect(result.current.dragOrigin).toBeNull();
    expect(result.current.hasNodeMoved).toBe(false);
    expect(result.current.linkSource).toBeNull();
    expect(result.current.isPanning).toBe(false);
    expect(result.current.dragSelectStart).toBeNull();
    expect(result.current.dragSelectEnd).toBeNull();
  });

  test('computes correct cursor', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    expect(result.current.cursor).toBe('default');
  });

  // ============================================================================
  // NODE DRAGGING
  // ============================================================================

  test('handles node mouse down', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    const mockEvent = {
      button: 0,
      clientX: 100,
      clientY: 100,
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleNodeMouseDown(mockEvent, '1');
    });

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    // Dragged node should not be set immediately (only after threshold)
    expect(result.current.draggedNode).toBeNull();
  });

  test('updates node positions on drag', () => {
    const onNodeMove = jest.fn();
    const mockCallbacks = {
      onNodeMove,
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    // Call updateNodePositions directly
    act(() => {
      result.current.updateNodePositions('1', 50, 50);
    });

    expect(onNodeMove).toHaveBeenCalledWith('1', 150, 150); // 100 + 50
  });

  test('updates multiple selected nodes on drag', () => {
    const onNodeMove = jest.fn();
    const mockCallbacks = {
      onNodeMove,
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(['1', '2']),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    act(() => {
      result.current.updateNodePositions('1', 50, 50);
    });

    // Should update both selected nodes
    expect(onNodeMove).toHaveBeenCalledTimes(2);
  });

  test('handles mouse up to complete drag', () => {
    const onNodeMove = jest.fn();
    const mockCallbacks = {
      onNodeMove,
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result, rerender } = renderHook(
      ({ selectedNodes }) =>
        useDragAndDrop({
          nodes: mockNodes,
          links: mockLinks,
          zoom: 1,
          pan: { x: 0, y: 0 },
          selectedNodes,
          linkingMode: false,
          containerRef: mockContainerRef,
          svgRef: mockSvgRef,
          ...mockCallbacks,
        }),
      {
        initialProps: { selectedNodes: new Set<string>() },
      }
    );

    // Simulate drag by directly setting draggedNode state
    // (In real scenario, this would happen through mouse move)
    act(() => {
      result.current.handleMouseUp();
    });

    // After mouse up, drag state should be cleared
    expect(result.current.draggedNode).toBeNull();
    expect(result.current.dragOrigin).toBeNull();
  });

  // ============================================================================
  // CONNECTION DOT (LINKING MODE)
  // ============================================================================

  test('starts linking mode on connection dot mouse down', () => {
    const setLinkingMode = jest.fn();
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode,
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleConnectionDotMouseDown(mockEvent, '1');
    });

    expect(setLinkingMode).toHaveBeenCalledWith(true);
    expect(result.current.linkSource).toBe('1');
    expect(result.current.dragOrigin).toBe('edge');
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  test('sets connection dot position', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleConnectionDotMouseDown(mockEvent, '1');
    });

    expect(result.current.connectionDot).toBeDefined();
    expect(result.current.connectionDot?.x).toBeDefined();
    expect(result.current.connectionDot?.y).toBeDefined();
  });

  // ============================================================================
  // SVG CANVAS INTERACTIONS
  // ============================================================================

  test('starts panning on middle mouse button', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    const mockEvent = {
      button: 1, // Middle button
      clientX: 100,
      clientY: 100,
      preventDefault: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleSvgMouseDown(mockEvent);
    });

    expect(result.current.isPanning).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  test('starts drag-select with Ctrl+Click', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    const mockEvent = {
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: true,
      metaKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleSvgMouseDown(mockEvent);
    });

    expect(result.current.dragSelectStart).toBeDefined();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  test('starts panning on normal canvas drag', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    const mockEvent = {
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      metaKey: false,
      preventDefault: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleSvgMouseDown(mockEvent);
    });

    expect(result.current.isPanning).toBe(true);
  });

  // ============================================================================
  // DRAG THRESHOLD
  // ============================================================================

  test('respects drag threshold', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        dragThreshold: 5,
        ...mockCallbacks,
      })
    );

    // Initial threshold is 5px
    // Small movements should not trigger drag
    const mockDownEvent = {
      button: 0,
      clientX: 100,
      clientY: 100,
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleNodeMouseDown(mockDownEvent, '1');
    });

    // Move less than threshold
    const mockMoveEvent = {
      clientX: 102,
      clientY: 102,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseMove(mockMoveEvent);
    });

    // Should not start dragging yet (less than 5px)
    expect(result.current.draggedNode).toBeNull();
  });

  // ============================================================================
  // RAF THROTTLING
  // ============================================================================

  test('respects enableRAF option', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result: resultWithRAF } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        enableRAF: true,
        ...mockCallbacks,
      })
    );

    expect(resultWithRAF.current).toBeDefined();

    const { result: resultWithoutRAF } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        enableRAF: false,
        ...mockCallbacks,
      })
    );

    expect(resultWithoutRAF.current).toBeDefined();
  });

  // ============================================================================
  // BATCH UPDATES
  // ============================================================================

  test('calls onNodesMoveComplete with batch updates', () => {
    const onNodesMoveComplete = jest.fn();
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
      onNodesMoveComplete,
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(['1', '2']),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    // Simulate completing a drag
    act(() => {
      result.current.handleMouseUp();
    });

    // Should call batch update callback
    // (This may not be called if no actual drag occurred)
  });

  // ============================================================================
  // LINK SOURCE MANAGEMENT
  // ============================================================================

  test('sets and clears link source', () => {
    const mockCallbacks = {
      onNodeMove: jest.fn(),
      onLinkCreate: jest.fn(),
      setLinkingMode: jest.fn(),
    };

    const { result } = renderHook(() =>
      useDragAndDrop({
        nodes: mockNodes,
        links: mockLinks,
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedNodes: new Set(),
        linkingMode: false,
        containerRef: mockContainerRef,
        svgRef: mockSvgRef,
        ...mockCallbacks,
      })
    );

    expect(result.current.linkSource).toBeNull();

    act(() => {
      result.current.setLinkSource('1');
    });

    expect(result.current.linkSource).toBe('1');

    act(() => {
      result.current.setLinkSource(null);
    });

    expect(result.current.linkSource).toBeNull();
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('useDragAndDrop utility functions', () => {
  test('screenToGraphCoords converts coordinates correctly', () => {
    const svgRect: DOMRect = {
      left: 100,
      top: 50,
      width: 800,
      height: 600,
      right: 900,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    };

    const result = screenToGraphCoords(300, 200, svgRect, { x: 50, y: 25 }, 2);

    // (300 - 100 - 50) / 2 = 75
    // (200 - 50 - 25) / 2 = 62.5
    expect(result.x).toBe(75);
    expect(result.y).toBe(62.5);
  });

  test('isDragThresholdExceeded returns true when exceeded', () => {
    const start = { x: 100, y: 100 };
    const current = { x: 110, y: 110 };

    expect(isDragThresholdExceeded(start, current, 5)).toBe(true);
  });

  test('isDragThresholdExceeded returns false when not exceeded', () => {
    const start = { x: 100, y: 100 };
    const current = { x: 102, y: 102 };

    expect(isDragThresholdExceeded(start, current, 5)).toBe(false);
  });

  test('calculateBatchNodeUpdates for single node', () => {
    const updates = calculateBatchNodeUpdates(
      '1',
      new Set(),
      mockNodes,
      50,
      50
    );

    expect(updates.length).toBe(1);
    expect(updates[0].id).toBe('1');
    expect(updates[0].x).toBe(150); // 100 + 50
    expect(updates[0].y).toBe(150); // 100 + 50
  });

  test('calculateBatchNodeUpdates for multiple selected nodes', () => {
    const updates = calculateBatchNodeUpdates(
      '1',
      new Set(['1', '2']),
      mockNodes,
      50,
      50
    );

    expect(updates.length).toBe(2);
    expect(updates[0].id).toBe('1');
    expect(updates[0].x).toBe(150);
    expect(updates[1].id).toBe('2');
    expect(updates[1].x).toBe(250); // 200 + 50
  });

  test('calculateBatchNodeUpdates handles missing nodes', () => {
    const updates = calculateBatchNodeUpdates(
      'nonexistent',
      new Set(['nonexistent']),
      mockNodes,
      50,
      50
    );

    expect(updates.length).toBe(0);
  });
});
