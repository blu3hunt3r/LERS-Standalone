/**
 * Phase 5, Feature 2, Phase 4: Unit Tests for useSelection Hook
 *
 * Tests node selection and highlighting functionality:
 * - Single and multi-select
 * - Search highlighting
 * - Selection helpers (selectAll, clearSelection, invertSelection)
 * - Maltego-style operations (neighbors, paths)
 * - Selection statistics
 * - Callbacks
 */

import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';
import type { Node, Link } from '../../types';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockNodes: Node[] = [
  { id: '1', label: 'John Doe', type: 'person', x: 0, y: 0, metadata: { age: 30 } },
  { id: '2', label: 'Jane Smith', type: 'person', x: 100, y: 100, metadata: { age: 25 } },
  { id: '3', label: 'Acme Corp', type: 'company', x: 200, y: 0, metadata: { employees: 100 } },
  { id: '4', label: 'Bank Account', type: 'account', x: 300, y: 100 },
  { id: '5', label: 'Transaction', type: 'transaction', x: 400, y: 0 },
];

const mockLinks: Link[] = [
  { id: 'l1', source: '1', target: '2', label: 'knows' },
  { id: 'l2', source: '2', target: '3', label: 'works_at' },
  { id: 'l3', source: '3', target: '4', label: 'owns' },
  { id: 'l4', source: '1', target: '3', label: 'knows' },
  { id: 'l5', source: '4', target: '5', label: 'transferred' },
];

describe('useSelection', () => {
  // ============================================================================
  // BASIC INITIALIZATION
  // ============================================================================

  test('initializes with empty selections', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    expect(result.current.selectedNodes.size).toBe(0);
    expect(result.current.highlightedNodes.size).toBe(0);
    expect(result.current.searchQuery).toBe('');
  });

  test('provides selection stats', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    expect(result.current.selectionStats.selectedCount).toBe(0);
    expect(result.current.selectionStats.highlightedCount).toBe(0);
    expect(result.current.selectionStats.totalCount).toBe(5);
  });

  // ============================================================================
  // SINGLE SELECT
  // ============================================================================

  test('selects single node without modifier keys', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.handleNodeClick('1', { ctrlKey: false, metaKey: false });
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);
    expect(result.current.selectedNodes.size).toBe(1);
  });

  test('replaces selection when clicking without modifier', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.handleNodeClick('1', { ctrlKey: false, metaKey: false });
    });

    act(() => {
      result.current.handleNodeClick('2', { ctrlKey: false, metaKey: false });
    });

    expect(result.current.selectedNodes.has('1')).toBe(false);
    expect(result.current.selectedNodes.has('2')).toBe(true);
    expect(result.current.selectedNodes.size).toBe(1);
  });

  // ============================================================================
  // MULTI-SELECT
  // ============================================================================

  test('adds to selection with Ctrl key', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.handleNodeClick('1', { ctrlKey: true, metaKey: false });
    });

    act(() => {
      result.current.handleNodeClick('2', { ctrlKey: true, metaKey: false });
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);
    expect(result.current.selectedNodes.has('2')).toBe(true);
    expect(result.current.selectedNodes.size).toBe(2);
  });

  test('adds to selection with Cmd key', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.handleNodeClick('1', { ctrlKey: false, metaKey: true });
    });

    act(() => {
      result.current.handleNodeClick('2', { ctrlKey: false, metaKey: true });
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);
    expect(result.current.selectedNodes.has('2')).toBe(true);
    expect(result.current.selectedNodes.size).toBe(2);
  });

  test('toggles selection with multi-select', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Select node 1
    act(() => {
      result.current.handleNodeClick('1', { ctrlKey: true, metaKey: false });
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);

    // Click again to deselect
    act(() => {
      result.current.handleNodeClick('1', { ctrlKey: true, metaKey: false });
    });

    expect(result.current.selectedNodes.has('1')).toBe(false);
    expect(result.current.selectedNodes.size).toBe(0);
  });

  // ============================================================================
  // SELECTION HELPERS
  // ============================================================================

  test('selects all nodes', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedNodes.size).toBe(5);
    mockNodes.forEach(node => {
      expect(result.current.selectedNodes.has(node.id)).toBe(true);
    });
  });

  test('clears all selections', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedNodes.size).toBe(5);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedNodes.size).toBe(0);
  });

  test('inverts selection', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Select nodes 1 and 2
    act(() => {
      result.current.selectNodes(['1', '2']);
    });

    expect(result.current.selectedNodes.size).toBe(2);

    // Invert selection (should select 3, 4, 5)
    act(() => {
      result.current.invertSelection();
    });

    expect(result.current.selectedNodes.size).toBe(3);
    expect(result.current.selectedNodes.has('1')).toBe(false);
    expect(result.current.selectedNodes.has('2')).toBe(false);
    expect(result.current.selectedNodes.has('3')).toBe(true);
    expect(result.current.selectedNodes.has('4')).toBe(true);
    expect(result.current.selectedNodes.has('5')).toBe(true);
  });

  test('selects nodes by IDs', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.selectNodes(['2', '3', '4']);
    });

    expect(result.current.selectedNodes.size).toBe(3);
    expect(result.current.selectedNodes.has('2')).toBe(true);
    expect(result.current.selectedNodes.has('3')).toBe(true);
    expect(result.current.selectedNodes.has('4')).toBe(true);
  });

  test('deselects nodes by IDs', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedNodes.size).toBe(5);

    act(() => {
      result.current.deselectNodes(['1', '3', '5']);
    });

    expect(result.current.selectedNodes.size).toBe(2);
    expect(result.current.selectedNodes.has('2')).toBe(true);
    expect(result.current.selectedNodes.has('4')).toBe(true);
  });

  test('toggles individual node selection', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Toggle on
    act(() => {
      result.current.toggleNode('1');
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);

    // Toggle off
    act(() => {
      result.current.toggleNode('1');
    });

    expect(result.current.selectedNodes.has('1')).toBe(false);
  });

  // ============================================================================
  // SEARCH HIGHLIGHTING
  // ============================================================================

  test('highlights nodes matching search query', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
      })
    );

    act(() => {
      result.current.setSearchQuery('john');
    });

    expect(result.current.highlightedNodes.has('1')).toBe(true);
    expect(result.current.highlightedNodes.size).toBe(1);
  });

  test('highlights nodes by type', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
      })
    );

    act(() => {
      result.current.setSearchQuery('person');
    });

    expect(result.current.highlightedNodes.has('1')).toBe(true);
    expect(result.current.highlightedNodes.has('2')).toBe(true);
    expect(result.current.highlightedNodes.size).toBe(2);
  });

  test('highlights nodes by metadata', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
      })
    );

    act(() => {
      result.current.setSearchQuery('age');
    });

    // Should match nodes 1 and 2 (have age in metadata)
    expect(result.current.highlightedNodes.has('1')).toBe(true);
    expect(result.current.highlightedNodes.has('2')).toBe(true);
    expect(result.current.highlightedNodes.size).toBe(2);
  });

  test('clears highlights when search is empty', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
      })
    );

    act(() => {
      result.current.setSearchQuery('john');
    });

    expect(result.current.highlightedNodes.size).toBe(1);

    act(() => {
      result.current.setSearchQuery('');
    });

    expect(result.current.highlightedNodes.size).toBe(0);
  });

  test('respects enableSearch option', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: false,
      })
    );

    act(() => {
      result.current.setSearchQuery('john');
    });

    // Should not highlight anything when search is disabled
    expect(result.current.highlightedNodes.size).toBe(0);
  });

  // ============================================================================
  // MALTEGO-STYLE OPERATIONS
  // ============================================================================

  test('selects all neighbors of a node', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Node 2 is connected to nodes 1 and 3
    act(() => {
      result.current.selectNeighbors('2', 'all');
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);
    expect(result.current.selectedNodes.has('3')).toBe(true);
    // Should not select node 2 itself (only neighbors)
  });

  test('selects incoming neighbors only', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Node 3 has incoming from 1 and 2, outgoing to 4
    act(() => {
      result.current.selectNeighbors('3', 'incoming');
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);
    expect(result.current.selectedNodes.has('2')).toBe(true);
    expect(result.current.selectedNodes.has('4')).toBe(false);
  });

  test('selects outgoing neighbors only', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Node 3 has incoming from 1 and 2, outgoing to 4
    act(() => {
      result.current.selectNeighbors('3', 'outgoing');
    });

    expect(result.current.selectedNodes.has('1')).toBe(false);
    expect(result.current.selectedNodes.has('2')).toBe(false);
    expect(result.current.selectedNodes.has('4')).toBe(true);
  });

  test('selects path between two nodes', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    // Path from 1 to 4: 1 -> 3 -> 4
    act(() => {
      result.current.selectPath('1', '4');
    });

    expect(result.current.selectedNodes.has('1')).toBe(true);
    expect(result.current.selectedNodes.has('3')).toBe(true);
    expect(result.current.selectedNodes.has('4')).toBe(true);
    expect(result.current.selectedNodes.size).toBe(3);
  });

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  test('checks if node is selected', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
      })
    );

    act(() => {
      result.current.selectNodes(['1', '2']);
    });

    expect(result.current.isNodeSelected('1')).toBe(true);
    expect(result.current.isNodeSelected('2')).toBe(true);
    expect(result.current.isNodeSelected('3')).toBe(false);
  });

  test('checks if node is highlighted', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
      })
    );

    act(() => {
      result.current.setSearchQuery('person');
    });

    expect(result.current.isNodeHighlighted('1')).toBe(true);
    expect(result.current.isNodeHighlighted('2')).toBe(true);
    expect(result.current.isNodeHighlighted('3')).toBe(false);
  });

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  test('calls onSelectionChange callback', () => {
    const onSelectionChange = jest.fn();

    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        onSelectionChange,
      })
    );

    act(() => {
      result.current.selectNodes(['1', '2']);
    });

    expect(onSelectionChange).toHaveBeenCalled();
    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
    expect(lastCall.has('1')).toBe(true);
    expect(lastCall.has('2')).toBe(true);
  });

  test('calls onHighlightChange callback', () => {
    const onHighlightChange = jest.fn();

    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
        onHighlightChange,
      })
    );

    act(() => {
      result.current.setSearchQuery('john');
    });

    expect(onHighlightChange).toHaveBeenCalled();
    const lastCall = onHighlightChange.mock.calls[onHighlightChange.mock.calls.length - 1][0];
    expect(lastCall.has('1')).toBe(true);
  });

  // ============================================================================
  // SELECTION STATS
  // ============================================================================

  test('updates selection stats correctly', () => {
    const { result } = renderHook(() =>
      useSelection({
        nodes: mockNodes,
        links: mockLinks,
        enableSearch: true,
      })
    );

    expect(result.current.selectionStats.selectedCount).toBe(0);
    expect(result.current.selectionStats.highlightedCount).toBe(0);
    expect(result.current.selectionStats.totalCount).toBe(5);

    act(() => {
      result.current.selectNodes(['1', '2', '3']);
    });

    expect(result.current.selectionStats.selectedCount).toBe(3);

    act(() => {
      result.current.setSearchQuery('person');
    });

    expect(result.current.selectionStats.highlightedCount).toBe(2);
  });
});
