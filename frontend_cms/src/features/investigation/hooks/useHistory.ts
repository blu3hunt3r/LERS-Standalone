/**
 * Phase 5, Feature 2, Phase 2: useHistory Hook
 *
 * Manages undo/redo history stack with support for graph operations.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 188-189, 291-295, 793-1050).
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type HistoryActionType =
  | 'ADD_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'ADD_LINK'
  | 'DELETE_LINK'
  | 'EDIT_LINK'
  | 'LAYOUT_APPLY';

export interface HistoryAction {
  type: HistoryActionType;
  data: any;
  timestamp: number;
}

export interface UseHistoryOptions {
  /** Maximum number of actions to keep in history (default: 50) */
  maxSize?: number;
  /** Callback when undo is triggered */
  onUndo?: (action: HistoryAction) => void;
  /** Callback when redo is triggered */
  onRedo?: (action: HistoryAction) => void;
  /** Callback when history changes */
  onHistoryChange?: (stack: HistoryAction[], index: number) => void;
  /** Enable keyboard shortcuts (default: true) */
  enableKeyboardShortcuts?: boolean;
  /** Action types to exclude from history */
  excludeActionTypes?: HistoryActionType[];
}

export interface UseHistoryReturn {
  /** Add action to history */
  addToHistory: (action: Omit<HistoryAction, 'timestamp'>) => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Can undo (history index >= 0) */
  canUndo: boolean;
  /** Can redo (history index < stack length - 1) */
  canRedo: boolean;
  /** Current history stack */
  historyStack: HistoryAction[];
  /** Current position in history */
  historyIndex: number;
  /** Clear all history */
  clearHistory: () => void;
  /** Get action at specific index */
  getActionAt: (index: number) => HistoryAction | undefined;
  /** Jump to specific point in history */
  jumpTo: (index: number) => void;
  /** Get recent actions */
  getRecentActions: (count: number) => HistoryAction[];
  /** Flag to prevent infinite loops */
  isUndoRedoAction: boolean;
  /** Set undo/redo action flag */
  setIsUndoRedoAction: (value: boolean) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing undo/redo history
 *
 * @param options - Configuration options
 * @returns History state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   addToHistory,
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo,
 *   isUndoRedoAction,
 *   setIsUndoRedoAction,
 * } = useHistory({
 *   maxSize: 50,
 *   onUndo: (action) => {
 *     // Handle undo based on action type
 *     switch (action.type) {
 *       case 'ADD_NODE':
 *         deleteNode(action.data.nodeId);
 *         break;
 *       // ... other cases
 *     }
 *   },
 *   onRedo: (action) => {
 *     // Handle redo based on action type
 *     switch (action.type) {
 *       case 'ADD_NODE':
 *         createNode(action.data.node);
 *         break;
 *       // ... other cases
 *     }
 *   },
 * });
 *
 * // Add action before mutation
 * if (!isUndoRedoAction) {
 *   addToHistory({
 *     type: 'ADD_NODE',
 *     data: { nodeId: 'node-123', node },
 *   });
 * }
 * createNode(node);
 *
 * // Undo/redo with keyboard
 * // Ctrl+Z / Cmd+Z: Undo
 * // Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 * ```
 */
export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const {
    maxSize = 50,
    onUndo,
    onRedo,
    onHistoryChange,
    enableKeyboardShortcuts = true,
    excludeActionTypes = [],
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState<boolean>(false);

  // ============================================================================
  // HISTORY MANAGEMENT
  // ============================================================================

  /**
   * Add action to history stack
   */
  const addToHistory = useCallback((action: Omit<HistoryAction, 'timestamp'>) => {
    // Don't add to history if it's an undo/redo action (prevent infinite loops)
    if (isUndoRedoAction) {
      return;
    }

    // Don't add excluded action types
    if (excludeActionTypes.includes(action.type)) {
      return;
    }

    // Create action with timestamp
    const historyAction: HistoryAction = {
      ...action,
      timestamp: Date.now(),
    };

    setHistoryStack(prev => {
      // Remove any actions after current index (branching)
      const newStack = prev.slice(0, historyIndex + 1);

      // Add new action
      newStack.push(historyAction);

      // Limit stack size
      const limitedStack = newStack.slice(-maxSize);

      // Notify of change
      if (onHistoryChange) {
        onHistoryChange(limitedStack, limitedStack.length - 1);
      }

      return limitedStack;
    });

    setHistoryIndex(prev => Math.min(prev + 1, maxSize - 1));
  }, [isUndoRedoAction, excludeActionTypes, historyIndex, maxSize, onHistoryChange]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (historyIndex < 0) {
      console.warn('Nothing to undo');
      return;
    }

    const action = historyStack[historyIndex];

    // Call undo callback
    if (onUndo) {
      onUndo(action);
    }

    // Move index back
    setHistoryIndex(prev => prev - 1);

    // Notify of change
    if (onHistoryChange) {
      onHistoryChange(historyStack, historyIndex - 1);
    }
  }, [historyIndex, historyStack, onUndo, onHistoryChange]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (historyIndex >= historyStack.length - 1) {
      console.warn('Nothing to redo');
      return;
    }

    const nextIndex = historyIndex + 1;
    const action = historyStack[nextIndex];

    // Call redo callback
    if (onRedo) {
      onRedo(action);
    }

    // Move index forward
    setHistoryIndex(nextIndex);

    // Notify of change
    if (onHistoryChange) {
      onHistoryChange(historyStack, nextIndex);
    }
  }, [historyIndex, historyStack, onRedo, onHistoryChange]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistoryStack([]);
    setHistoryIndex(-1);

    if (onHistoryChange) {
      onHistoryChange([], -1);
    }
  }, [onHistoryChange]);

  /**
   * Get action at specific index
   */
  const getActionAt = useCallback((index: number): HistoryAction | undefined => {
    return historyStack[index];
  }, [historyStack]);

  /**
   * Jump to specific point in history
   */
  const jumpTo = useCallback((index: number) => {
    if (index < -1 || index >= historyStack.length) {
      console.warn(`Invalid history index: ${index}`);
      return;
    }

    const currentIndex = historyIndex;

    if (index < currentIndex) {
      // Undo multiple times
      for (let i = currentIndex; i > index; i--) {
        const action = historyStack[i];
        if (onUndo) {
          onUndo(action);
        }
      }
    } else if (index > currentIndex) {
      // Redo multiple times
      for (let i = currentIndex + 1; i <= index; i++) {
        const action = historyStack[i];
        if (onRedo) {
          onRedo(action);
        }
      }
    }

    setHistoryIndex(index);

    if (onHistoryChange) {
      onHistoryChange(historyStack, index);
    }
  }, [historyIndex, historyStack, onUndo, onRedo, onHistoryChange]);

  /**
   * Get recent actions
   */
  const getRecentActions = useCallback((count: number): HistoryAction[] => {
    const startIndex = Math.max(0, historyIndex - count + 1);
    return historyStack.slice(startIndex, historyIndex + 1);
  }, [historyStack, historyIndex]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y, Cmd+Y, or Ctrl+Shift+Z, Cmd+Shift+Z
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, enableKeyboardShortcuts]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < historyStack.length - 1;

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyStack,
    historyIndex,
    clearHistory,
    getActionAt,
    jumpTo,
    getRecentActions,
    isUndoRedoAction,
    setIsUndoRedoAction,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for visualizing history timeline
 *
 * @param history - History hook return value
 * @returns Timeline data for rendering
 *
 * @example
 * ```typescript
 * const history = useHistory();
 * const timeline = useHistoryTimeline(history);
 *
 * <HistoryTimeline
 *   actions={timeline.actions}
 *   currentIndex={timeline.currentIndex}
 *   onJumpTo={(index) => history.jumpTo(index)}
 * />
 * ```
 */
export function useHistoryTimeline(history: UseHistoryReturn) {
  const [actions, setActions] = useState<Array<HistoryAction & { active: boolean }>>([]);

  useEffect(() => {
    const actionsWithState = history.historyStack.map((action, index) => ({
      ...action,
      active: index <= history.historyIndex,
    }));
    setActions(actionsWithState);
  }, [history.historyStack, history.historyIndex]);

  return {
    actions,
    currentIndex: history.historyIndex,
    totalCount: history.historyStack.length,
  };
}

/**
 * Hook for history statistics
 *
 * @param history - History hook return value
 * @returns Statistics about history usage
 */
export function useHistoryStats(history: UseHistoryReturn) {
  const [stats, setStats] = useState({
    totalActions: 0,
    actionsByType: {} as Record<HistoryActionType, number>,
    averageActionAge: 0,
    oldestAction: null as Date | null,
    newestAction: null as Date | null,
  });

  useEffect(() => {
    if (history.historyStack.length === 0) {
      setStats({
        totalActions: 0,
        actionsByType: {},
        averageActionAge: 0,
        oldestAction: null,
        newestAction: null,
      });
      return;
    }

    // Count by type
    const actionsByType: Record<string, number> = {};
    history.historyStack.forEach(action => {
      actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
    });

    // Calculate ages
    const now = Date.now();
    const ages = history.historyStack.map(a => now - a.timestamp);
    const averageActionAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

    // Oldest and newest
    const timestamps = history.historyStack.map(a => a.timestamp);
    const oldestAction = new Date(Math.min(...timestamps));
    const newestAction = new Date(Math.max(...timestamps));

    setStats({
      totalActions: history.historyStack.length,
      actionsByType: actionsByType as Record<HistoryActionType, number>,
      averageActionAge,
      oldestAction,
      newestAction,
    });
  }, [history.historyStack]);

  return stats;
}

/**
 * Hook for automatically saving/loading history to localStorage
 *
 * @param history - History hook return value
 * @param storageKey - localStorage key
 *
 * @example
 * ```typescript
 * const history = useHistory();
 * useHistoryPersistence(history, `investigation-history-${caseId}`);
 * // History is now automatically saved and restored
 * ```
 */
export function useHistoryPersistence(
  history: UseHistoryReturn,
  storageKey: string
) {
  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { stack, index } = JSON.parse(saved);

        // Restore stack by adding each action
        stack.forEach((action: HistoryAction) => {
          history.addToHistory(action);
        });

        // Jump to saved index
        if (index >= 0) {
          history.jumpTo(index);
        }
      } catch (error) {
        console.error('Failed to load history from localStorage:', error);
      }
    }
  }, [storageKey]); // Only run on mount

  // Save to localStorage whenever history changes
  useEffect(() => {
    const data = {
      stack: history.historyStack,
      index: history.historyIndex,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [history.historyStack, history.historyIndex, storageKey]);

  // Clear localStorage on unmount (optional)
  useEffect(() => {
    return () => {
      // Optionally clear history on unmount
      // localStorage.removeItem(storageKey);
    };
  }, [storageKey]);
}
