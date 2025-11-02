/**
 * Phase 5, Feature 2, Phase 2: useContextMenu Hook
 *
 * Manages context menus with click-outside and escape key handling.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 100-102, 1789-1897).
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ContextMenuState<T = any> {
  /** Is menu visible */
  visible: boolean;
  /** Menu X position (screen coordinates) */
  x: number;
  /** Menu Y position (screen coordinates) */
  y: number;
  /** Target data (node, link, etc.) */
  target: T | null;
  /** Additional context data */
  context?: any;
}

export interface UseContextMenuOptions {
  /** Menu ID for multi-menu scenarios */
  menuId?: string;
  /** Callback when menu is shown */
  onShow?: (target: any, x: number, y: number) => void;
  /** Callback when menu is hidden */
  onHide?: () => void;
  /** Enable escape key to close (default: true) */
  enableEscapeKey?: boolean;
  /** Enable click-outside to close (default: true) */
  enableClickOutside?: boolean;
  /** CSS class for menu container (for click-outside detection) */
  menuClassName?: string;
  /** Adjust position to keep menu in viewport (default: true) */
  adjustPosition?: boolean;
  /** Menu width for position adjustment (default: 200) */
  menuWidth?: number;
  /** Menu height for position adjustment (default: 300) */
  menuHeight?: number;
}

export interface UseContextMenuReturn<T = any> {
  /** Current menu state */
  contextMenu: ContextMenuState<T>;
  /** Show context menu at position with target */
  showContextMenu: (x: number, y: number, target: T, context?: any) => void;
  /** Hide context menu */
  hideContextMenu: () => void;
  /** Is menu currently visible */
  isVisible: boolean;
  /** Adjusted position (for rendering) */
  position: { x: number; y: number };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing context menus
 *
 * @param options - Configuration options
 * @returns Context menu state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   contextMenu,
 *   showContextMenu,
 *   hideContextMenu,
 *   isVisible,
 *   position,
 * } = useContextMenu({
 *   menuId: 'node-menu',
 *   menuClassName: 'node-context-menu',
 *   onShow: (node) => console.log('Menu opened for', node.label),
 *   onHide: () => console.log('Menu closed'),
 * });
 *
 * // Show menu on right-click
 * <circle
 *   onContextMenu={(e) => {
 *     e.preventDefault();
 *     showContextMenu(e.clientX, e.clientY, node);
 *   }}
 * />
 *
 * // Render menu
 * {isVisible && (
 *   <div
 *     className="node-context-menu"
 *     style={{ position: 'fixed', left: position.x, top: position.y }}
 *   >
 *     <button onClick={() => handleAction(contextMenu.target)}>
 *       Delete {contextMenu.target?.label}
 *     </button>
 *   </div>
 * )}
 * ```
 */
export function useContextMenu<T = any>(
  options: UseContextMenuOptions = {}
): UseContextMenuReturn<T> {
  const {
    menuId = 'default',
    onShow,
    onHide,
    enableEscapeKey = true,
    enableClickOutside = true,
    menuClassName = 'context-menu',
    adjustPosition = true,
    menuWidth = 200,
    menuHeight = 300,
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const [contextMenu, setContextMenu] = useState<ContextMenuState<T>>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  // ============================================================================
  // POSITION ADJUSTMENT
  // ============================================================================

  /**
   * Adjust menu position to keep it in viewport
   */
  const adjustMenuPosition = useCallback((x: number, y: number): { x: number; y: number } => {
    if (!adjustPosition) {
      return { x, y };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust X position if menu would overflow right edge
    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 10; // 10px padding
    }

    // Adjust Y position if menu would overflow bottom edge
    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 10; // 10px padding
    }

    // Ensure menu is not off-screen on left/top
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);

    return { x: adjustedX, y: adjustedY };
  }, [adjustPosition, menuWidth, menuHeight]);

  // ============================================================================
  // SHOW / HIDE FUNCTIONS
  // ============================================================================

  /**
   * Show context menu at position
   */
  const showContextMenu = useCallback((x: number, y: number, target: T, context?: any) => {
    const adjustedPosition = adjustMenuPosition(x, y);

    setContextMenu({
      visible: true,
      x: adjustedPosition.x,
      y: adjustedPosition.y,
      target,
      context,
    });

    if (onShow) {
      onShow(target, adjustedPosition.x, adjustedPosition.y);
    }
  }, [adjustMenuPosition, onShow]);

  /**
   * Hide context menu
   */
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({
      ...prev,
      visible: false,
    }));

    if (onHide) {
      onHide();
    }
  }, [onHide]);

  // ============================================================================
  // CLICK OUTSIDE DETECTION
  // ============================================================================

  useEffect(() => {
    if (!enableClickOutside || !contextMenu.visible) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Element;

      // Check if click is outside menu
      if (!target.closest(`.${menuClassName}`)) {
        hideContextMenu();
      }
    };

    // Small delay to prevent immediate close on menu open
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [contextMenu.visible, enableClickOutside, menuClassName, hideContextMenu]);

  // ============================================================================
  // ESCAPE KEY HANDLING
  // ============================================================================

  useEffect(() => {
    if (!enableEscapeKey || !contextMenu.visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [contextMenu.visible, enableEscapeKey, hideContextMenu]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isVisible = contextMenu.visible;
  const position = { x: contextMenu.x, y: contextMenu.y };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    isVisible,
    position,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for managing multiple context menus
 *
 * @example
 * ```typescript
 * const {
 *   nodeMenu,
 *   linkMenu,
 *   canvasMenu,
 *   showNodeMenu,
 *   showLinkMenu,
 *   showCanvasMenu,
 *   hideAll,
 * } = useMultipleContextMenus();
 *
 * // Show different menus
 * <circle onContextMenu={(e) => showNodeMenu(e, node)} />
 * <line onContextMenu={(e) => showLinkMenu(e, link)} />
 * <svg onContextMenu={(e) => showCanvasMenu(e)} />
 * ```
 */
export function useMultipleContextMenus() {
  const nodeMenu = useContextMenu({ menuId: 'node-menu', menuClassName: 'node-context-menu' });
  const linkMenu = useContextMenu({ menuId: 'link-menu', menuClassName: 'link-context-menu' });
  const canvasMenu = useContextMenu({ menuId: 'canvas-menu', menuClassName: 'canvas-context-menu' });

  const showNodeMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault();
    e.stopPropagation();
    nodeMenu.showContextMenu(e.clientX, e.clientY, node);
    linkMenu.hideContextMenu();
    canvasMenu.hideContextMenu();
  }, [nodeMenu, linkMenu, canvasMenu]);

  const showLinkMenu = useCallback((e: React.MouseEvent, link: any) => {
    e.preventDefault();
    e.stopPropagation();
    linkMenu.showContextMenu(e.clientX, e.clientY, link);
    nodeMenu.hideContextMenu();
    canvasMenu.hideContextMenu();
  }, [nodeMenu, linkMenu, canvasMenu]);

  const showCanvasMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    canvasMenu.showContextMenu(e.clientX, e.clientY, null);
    nodeMenu.hideContextMenu();
    linkMenu.hideContextMenu();
  }, [nodeMenu, linkMenu, canvasMenu]);

  const hideAll = useCallback(() => {
    nodeMenu.hideContextMenu();
    linkMenu.hideContextMenu();
    canvasMenu.hideContextMenu();
  }, [nodeMenu, linkMenu, canvasMenu]);

  return {
    nodeMenu,
    linkMenu,
    canvasMenu,
    showNodeMenu,
    showLinkMenu,
    showCanvasMenu,
    hideAll,
  };
}

/**
 * Hook for dropdown menu management (similar to context menu but for click-to-open)
 *
 * @example
 * ```typescript
 * const dropdown = useDropdownMenu();
 *
 * <button onClick={(e) => dropdown.toggle(e.currentTarget)}>
 *   Options
 * </button>
 *
 * {dropdown.isOpen && (
 *   <div style={dropdown.menuStyle}>
 *     <button>Action 1</button>
 *     <button>Action 2</button>
 *   </div>
 * )}
 * ```
 */
export function useDropdownMenu(options: {
  menuClassName?: string;
  offsetX?: number;
  offsetY?: number;
} = {}) {
  const {
    menuClassName = 'dropdown-menu',
    offsetX = 0,
    offsetY = 5,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<Element | null>(null);

  const open = useCallback((trigger: Element) => {
    const rect = trigger.getBoundingClientRect();
    setPosition({
      x: rect.left + offsetX,
      y: rect.bottom + offsetY,
    });
    triggerRef.current = trigger;
    setIsOpen(true);
  }, [offsetX, offsetY]);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current = null;
  }, []);

  const toggle = useCallback((trigger: Element) => {
    if (isOpen && triggerRef.current === trigger) {
      close();
    } else {
      open(trigger);
    }
  }, [isOpen, open, close]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(`.${menuClassName}`) && target !== triggerRef.current) {
        close();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 100);

    return () => document.removeEventListener('click', handleClick);
  }, [isOpen, menuClassName, close]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 1000,
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    position,
    menuStyle,
  };
}

/**
 * Hook for nested context menus (submenu support)
 *
 * @example
 * ```typescript
 * const { mainMenu, subMenu, showMainMenu, showSubMenu } = useNestedContextMenu();
 *
 * {mainMenu.isVisible && (
 *   <div className="main-menu">
 *     <button onMouseEnter={(e) => showSubMenu(e, 'transform')}>
 *       Transform →
 *     </button>
 *   </div>
 * )}
 *
 * {subMenu.isVisible && (
 *   <div className="sub-menu">
 *     <button>Money Flow</button>
 *     <button>Network Analysis</button>
 *   </div>
 * )}
 * ```
 */
export function useNestedContextMenu() {
  const mainMenu = useContextMenu({ menuId: 'main-menu' });
  const subMenu = useContextMenu({ menuId: 'sub-menu' });

  const showMainMenu = useCallback((x: number, y: number, target: any) => {
    mainMenu.showContextMenu(x, y, target);
    subMenu.hideContextMenu();
  }, [mainMenu, subMenu]);

  const showSubMenu = useCallback((e: React.MouseEvent, submenuTarget: any) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    subMenu.showContextMenu(rect.right + 5, rect.top, submenuTarget);
  }, [subMenu]);

  const hideAll = useCallback(() => {
    mainMenu.hideContextMenu();
    subMenu.hideContextMenu();
  }, [mainMenu, subMenu]);

  return {
    mainMenu,
    subMenu,
    showMainMenu,
    showSubMenu,
    hideAll,
  };
}
