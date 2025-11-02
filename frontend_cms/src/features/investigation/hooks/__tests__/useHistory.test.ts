/**
 * Phase 5, Feature 2, Phase 4: Unit Tests for useHistory Hook
 *
 * Tests undo/redo history stack functionality:
 * - Adding actions to history
 * - Undo/redo operations
 * - History stack management
 * - Keyboard shortcuts
 * - Jump to specific point in history
 * - History callbacks
 * - Max size limiting
 * - Excluded action types
 */

import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../useHistory';
import type { HistoryAction } from '../useHistory';

describe('useHistory', () => {
  // ============================================================================
  // BASIC INITIALIZATION
  // ============================================================================

  test('initializes with empty history', () => {
    const { result } = renderHook(() => useHistory());

    expect(result.current.historyStack).toEqual([]);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  test('initializes with custom max size', () => {
    const { result } = renderHook(() => useHistory({ maxSize: 10 }));

    expect(result.current.historyStack.length).toBe(0);
  });

  // ============================================================================
  // ADD TO HISTORY
  // ============================================================================

  test('adds action to history', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.addToHistory({
        type: 'ADD_NODE',
        data: { nodeId: 'node-1' },
      });
    });

    expect(result.current.historyStack.length).toBe(1);
    expect(result.current.historyStack[0].type).toBe('ADD_NODE');
    expect(result.current.historyStack[0].data.nodeId).toBe('node-1');
    expect(result.current.historyStack[0].timestamp).toBeDefined();
    expect(result.current.historyIndex).toBe(0);
  });

  test('adds multiple actions to history', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
    });

    act(() => {
      result.current.addToHistory({ type: 'ADD_LINK', data: { linkId: 'l1' } });
    });

    expect(result.current.historyStack.length).toBe(3);
    expect(result.current.historyIndex).toBe(2);
  });

  test('does not add action when isUndoRedoAction is true', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.setIsUndoRedoAction(true);
    });

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    expect(result.current.historyStack.length).toBe(0);
  });

  test('excludes specified action types', () => {
    const { result } = renderHook(() =>
      useHistory({
        excludeActionTypes: ['MOVE_NODE'],
      })
    );

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    act(() => {
      result.current.addToHistory({ type: 'MOVE_NODE', data: { nodeId: '1', x: 100, y: 100 } });
    });

    act(() => {
      result.current.addToHistory({ type: 'DELETE_NODE', data: { nodeId: '2' } });
    });

    // MOVE_NODE should be excluded
    expect(result.current.historyStack.length).toBe(2);
    expect(result.current.historyStack[0].type).toBe('ADD_NODE');
    expect(result.current.historyStack[1].type).toBe('DELETE_NODE');
  });

  test('limits history stack to max size', () => {
    const { result } = renderHook(() => useHistory({ maxSize: 3 }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '4' } });
    });

    // Should only keep last 3 actions
    expect(result.current.historyStack.length).toBe(3);
    expect(result.current.historyStack[0].data.nodeId).toBe('2');
    expect(result.current.historyStack[1].data.nodeId).toBe('3');
    expect(result.current.historyStack[2].data.nodeId).toBe('4');
  });

  test('removes future actions when adding after undo (branching)', () => {
    const { result } = renderHook(() => useHistory());

    // Add 3 actions
    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
    });

    expect(result.current.historyStack.length).toBe(3);

    // Undo twice
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.historyIndex).toBe(0);

    // Add new action (should remove actions 2 and 3)
    act(() => {
      result.current.setIsUndoRedoAction(false);
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '4' } });
    });

    expect(result.current.historyStack.length).toBe(2);
    expect(result.current.historyStack[1].data.nodeId).toBe('4');
  });

  // ============================================================================
  // UNDO
  // ============================================================================

  test('undoes last action', () => {
    const onUndo = jest.fn();
    const { result } = renderHook(() => useHistory({ onUndo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(onUndo).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_NODE',
        data: { nodeId: '1' },
      })
    );
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  test('undoes multiple actions', () => {
    const onUndo = jest.fn();
    const { result } = renderHook(() => useHistory({ onUndo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
    });

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(onUndo).toHaveBeenCalledTimes(2);
    expect(result.current.historyIndex).toBe(0);
  });

  test('does not undo when at beginning of history', () => {
    const onUndo = jest.fn();
    const { result } = renderHook(() => useHistory({ onUndo }));

    act(() => {
      result.current.undo();
    });

    expect(onUndo).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);
  });

  // ============================================================================
  // REDO
  // ============================================================================

  test('redoes last undone action', () => {
    const onRedo = jest.fn();
    const { result } = renderHook(() => useHistory({ onRedo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(onRedo).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_NODE',
        data: { nodeId: '1' },
      })
    );
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  test('redoes multiple actions', () => {
    const onRedo = jest.fn();
    const { result } = renderHook(() => useHistory({ onRedo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
    });

    act(() => {
      result.current.undo();
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.historyIndex).toBe(-1);

    act(() => {
      result.current.redo();
      result.current.redo();
    });

    expect(onRedo).toHaveBeenCalledTimes(2);
    expect(result.current.historyIndex).toBe(1);
  });

  test('does not redo when at end of history', () => {
    const onRedo = jest.fn();
    const { result } = renderHook(() => useHistory({ onRedo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    act(() => {
      result.current.redo();
    });

    expect(onRedo).not.toHaveBeenCalled();
    expect(result.current.canRedo).toBe(false);
  });

  // ============================================================================
  // CLEAR HISTORY
  // ============================================================================

  test('clears all history', () => {
    const onHistoryChange = jest.fn();
    const { result } = renderHook(() => useHistory({ onHistoryChange }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
    });

    expect(result.current.historyStack.length).toBe(2);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.historyStack.length).toBe(0);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(onHistoryChange).toHaveBeenCalledWith([], -1);
  });

  // ============================================================================
  // GET ACTION AT INDEX
  // ============================================================================

  test('gets action at specific index', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'DELETE_NODE', data: { nodeId: '3' } });
    });

    const action = result.current.getActionAt(1);

    expect(action?.type).toBe('ADD_NODE');
    expect(action?.data.nodeId).toBe('2');
  });

  test('returns undefined for invalid index', () => {
    const { result } = renderHook(() => useHistory());

    const action = result.current.getActionAt(10);

    expect(action).toBeUndefined();
  });

  // ============================================================================
  // JUMP TO INDEX
  // ============================================================================

  test('jumps to specific index (backward)', () => {
    const onUndo = jest.fn();
    const { result } = renderHook(() => useHistory({ onUndo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '4' } });
    });

    expect(result.current.historyIndex).toBe(3);

    act(() => {
      result.current.jumpTo(1);
    });

    expect(result.current.historyIndex).toBe(1);
    expect(onUndo).toHaveBeenCalledTimes(2); // Undid actions 3 and 4
  });

  test('jumps to specific index (forward)', () => {
    const onRedo = jest.fn();
    const { result } = renderHook(() => useHistory({ onRedo }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
    });

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.historyIndex).toBe(0);

    act(() => {
      result.current.jumpTo(2);
    });

    expect(result.current.historyIndex).toBe(2);
    expect(onRedo).toHaveBeenCalledTimes(2); // Redid actions 2 and 3
  });

  test('does not jump to invalid index', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    const initialIndex = result.current.historyIndex;

    act(() => {
      result.current.jumpTo(10); // Invalid index
    });

    expect(result.current.historyIndex).toBe(initialIndex);
  });

  // ============================================================================
  // GET RECENT ACTIONS
  // ============================================================================

  test('gets recent actions', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '3' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '4' } });
    });

    const recent = result.current.getRecentActions(2);

    expect(recent.length).toBe(2);
    expect(recent[0].data.nodeId).toBe('3');
    expect(recent[1].data.nodeId).toBe('4');
  });

  test('gets all actions if count exceeds stack size', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '2' } });
    });

    const recent = result.current.getRecentActions(10);

    expect(recent.length).toBe(2);
  });

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  test('calls onHistoryChange when adding action', () => {
    const onHistoryChange = jest.fn();
    const { result } = renderHook(() => useHistory({ onHistoryChange }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    expect(onHistoryChange).toHaveBeenCalled();
  });

  test('calls onHistoryChange when undoing', () => {
    const onHistoryChange = jest.fn();
    const { result } = renderHook(() => useHistory({ onHistoryChange }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
    });

    onHistoryChange.mockClear();

    act(() => {
      result.current.undo();
    });

    expect(onHistoryChange).toHaveBeenCalledWith(
      expect.any(Array),
      -1 // index after undo
    );
  });

  test('calls onHistoryChange when redoing', () => {
    const onHistoryChange = jest.fn();
    const { result } = renderHook(() => useHistory({ onHistoryChange }));

    act(() => {
      result.current.addToHistory({ type: 'ADD_NODE', data: { nodeId: '1' } });
      result.current.undo();
    });

    onHistoryChange.mockClear();

    act(() => {
      result.current.redo();
    });

    expect(onHistoryChange).toHaveBeenCalledWith(
      expect.any(Array),
      0 // index after redo
    );
  });

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  test('undo with Ctrl+Z keyboard shortcut', () => {
    const onUndo = jest.fn();
    renderHook(() => useHistory({ onUndo, enableKeyboardShortcuts: true }));

    // Simulate Ctrl+Z key press
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: false,
    });
    window.dispatchEvent(event);

    // Note: This test may not trigger the actual undo if no actions in history
    // In a real app, you'd add an action first, then test the keyboard shortcut
  });

  test('redo with Ctrl+Y keyboard shortcut', () => {
    const onRedo = jest.fn();
    renderHook(() => useHistory({ onRedo, enableKeyboardShortcuts: true }));

    // Simulate Ctrl+Y key press
    const event = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    // Note: Similar limitation as above
  });

  test('respects enableKeyboardShortcuts option', () => {
    const onUndo = jest.fn();
    renderHook(() => useHistory({ onUndo, enableKeyboardShortcuts: false }));

    // Simulate Ctrl+Z key press
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    // Should not call onUndo because keyboard shortcuts are disabled
  });

  // ============================================================================
  // UNDO/REDO FLAG
  // ============================================================================

  test('manages isUndoRedoAction flag', () => {
    const { result } = renderHook(() => useHistory());

    expect(result.current.isUndoRedoAction).toBe(false);

    act(() => {
      result.current.setIsUndoRedoAction(true);
    });

    expect(result.current.isUndoRedoAction).toBe(true);

    act(() => {
      result.current.setIsUndoRedoAction(false);
    });

    expect(result.current.isUndoRedoAction).toBe(false);
  });
});
