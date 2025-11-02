/**
 * Phase 5, Feature 2, Phase 4: Unit Tests for useContextMenu Hook
 *
 * Tests context menu functionality:
 * - Show/hide menu
 * - Position adjustment to keep in viewport
 * - Click-outside detection
 * - Escape key handling
 * - Multiple context menus
 * - Dropdown menu variant
 * - Nested menus
 * - Callbacks
 */

import { renderHook, act } from '@testing-library/react';
import { useContextMenu, useMultipleContextMenus, useDropdownMenu, useNestedContextMenu } from '../useContextMenu';
import React from 'react';

describe('useContextMenu', () => {
  // ============================================================================
  // BASIC INITIALIZATION
  // ============================================================================

  test('initializes with menu hidden', () => {
    const { result } = renderHook(() => useContextMenu());

    expect(result.current.contextMenu.visible).toBe(false);
    expect(result.current.contextMenu.x).toBe(0);
    expect(result.current.contextMenu.y).toBe(0);
    expect(result.current.contextMenu.target).toBeNull();
    expect(result.current.isVisible).toBe(false);
  });

  test('initializes with custom options', () => {
    const onShow = jest.fn();
    const onHide = jest.fn();

    const { result } = renderHook(() =>
      useContextMenu({
        menuId: 'custom-menu',
        menuClassName: 'custom-context-menu',
        onShow,
        onHide,
        enableEscapeKey: false,
        enableClickOutside: false,
      })
    );

    expect(result.current.contextMenu.visible).toBe(false);
  });

  // ============================================================================
  // SHOW / HIDE MENU
  // ============================================================================

  test('shows context menu at position', () => {
    const { result } = renderHook(() => useContextMenu());

    const target = { id: 'node-1', label: 'Test Node' };

    act(() => {
      result.current.showContextMenu(100, 200, target);
    });

    expect(result.current.contextMenu.visible).toBe(true);
    expect(result.current.contextMenu.target).toEqual(target);
    expect(result.current.isVisible).toBe(true);
    expect(result.current.position.x).toBe(100);
    expect(result.current.position.y).toBe(200);
  });

  test('hides context menu', () => {
    const { result } = renderHook(() => useContextMenu());

    const target = { id: 'node-1' };

    act(() => {
      result.current.showContextMenu(100, 200, target);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.hideContextMenu();
    });

    expect(result.current.isVisible).toBe(false);
  });

  test('shows menu with context data', () => {
    const { result } = renderHook(() => useContextMenu());

    const target = { id: 'node-1' };
    const context = { additional: 'data' };

    act(() => {
      result.current.showContextMenu(100, 200, target, context);
    });

    expect(result.current.contextMenu.target).toEqual(target);
    expect(result.current.contextMenu.context).toEqual(context);
  });

  // ============================================================================
  // POSITION ADJUSTMENT
  // ============================================================================

  test('adjusts position to keep menu in viewport (right edge)', () => {
    // Mock window size
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 500 });

    const { result } = renderHook(() =>
      useContextMenu({
        adjustPosition: true,
        menuWidth: 200,
        menuHeight: 300,
      })
    );

    // Try to show menu near right edge (would overflow)
    act(() => {
      result.current.showContextMenu(450, 100, { id: '1' });
    });

    // Should be adjusted to fit (500 - 200 - 10 = 290)
    expect(result.current.position.x).toBeLessThan(450);
  });

  test('adjusts position to keep menu in viewport (bottom edge)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 500 });

    const { result } = renderHook(() =>
      useContextMenu({
        adjustPosition: true,
        menuWidth: 200,
        menuHeight: 300,
      })
    );

    // Try to show menu near bottom edge (would overflow)
    act(() => {
      result.current.showContextMenu(100, 450, { id: '1' });
    });

    // Should be adjusted to fit (500 - 300 - 10 = 190)
    expect(result.current.position.y).toBeLessThan(450);
  });

  test('respects adjustPosition option disabled', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 500 });

    const { result } = renderHook(() =>
      useContextMenu({
        adjustPosition: false,
        menuWidth: 200,
        menuHeight: 300,
      })
    );

    act(() => {
      result.current.showContextMenu(450, 450, { id: '1' });
    });

    // Should NOT be adjusted
    expect(result.current.position.x).toBe(450);
    expect(result.current.position.y).toBe(450);
  });

  test('prevents menu from going off-screen on left/top', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 500 });

    const { result } = renderHook(() =>
      useContextMenu({
        adjustPosition: true,
        menuWidth: 200,
        menuHeight: 300,
      })
    );

    // Try to show menu at negative position
    act(() => {
      result.current.showContextMenu(-50, -50, { id: '1' });
    });

    // Should be adjusted to minimum (10px)
    expect(result.current.position.x).toBe(10);
    expect(result.current.position.y).toBe(10);
  });

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  test('calls onShow callback when menu is shown', () => {
    const onShow = jest.fn();

    const { result } = renderHook(() =>
      useContextMenu({
        onShow,
      })
    );

    const target = { id: 'node-1' };

    act(() => {
      result.current.showContextMenu(100, 200, target);
    });

    expect(onShow).toHaveBeenCalledWith(target, expect.any(Number), expect.any(Number));
  });

  test('calls onHide callback when menu is hidden', () => {
    const onHide = jest.fn();

    const { result } = renderHook(() =>
      useContextMenu({
        onHide,
      })
    );

    act(() => {
      result.current.showContextMenu(100, 200, { id: '1' });
    });

    act(() => {
      result.current.hideContextMenu();
    });

    expect(onHide).toHaveBeenCalled();
  });

  // ============================================================================
  // CLICK OUTSIDE DETECTION
  // ============================================================================

  test('sets up click-outside listener when menu is visible', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    const { result } = renderHook(() =>
      useContextMenu({
        enableClickOutside: true,
        menuClassName: 'test-menu',
      })
    );

    act(() => {
      result.current.showContextMenu(100, 200, { id: '1' });
    });

    // Wait for timeout
    jest.advanceTimersByTime(100);

    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  test('respects enableClickOutside option', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    const { result } = renderHook(() =>
      useContextMenu({
        enableClickOutside: false,
      })
    );

    act(() => {
      result.current.showContextMenu(100, 200, { id: '1' });
    });

    // Should not add click listener
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('click', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  // ============================================================================
  // ESCAPE KEY HANDLING
  // ============================================================================

  test('closes menu on Escape key', () => {
    const { result } = renderHook(() =>
      useContextMenu({
        enableEscapeKey: true,
      })
    );

    act(() => {
      result.current.showContextMenu(100, 200, { id: '1' });
    });

    expect(result.current.isVisible).toBe(true);

    // Simulate Escape key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });

    expect(result.current.isVisible).toBe(false);
  });

  test('respects enableEscapeKey option', () => {
    const { result } = renderHook(() =>
      useContextMenu({
        enableEscapeKey: false,
      })
    );

    act(() => {
      result.current.showContextMenu(100, 200, { id: '1' });
    });

    expect(result.current.isVisible).toBe(true);

    // Simulate Escape key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });

    // Menu should still be visible
    expect(result.current.isVisible).toBe(true);
  });

  test('ignores non-Escape keys', () => {
    const { result } = renderHook(() =>
      useContextMenu({
        enableEscapeKey: true,
      })
    );

    act(() => {
      result.current.showContextMenu(100, 200, { id: '1' });
    });

    expect(result.current.isVisible).toBe(true);

    // Simulate other key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);
    });

    // Menu should still be visible
    expect(result.current.isVisible).toBe(true);
  });

  // ============================================================================
  // MENU ID
  // ============================================================================

  test('supports custom menu ID', () => {
    const { result } = renderHook(() =>
      useContextMenu({
        menuId: 'custom-menu-id',
      })
    );

    // Menu ID is internal, but we can verify the hook initializes correctly
    expect(result.current.contextMenu.visible).toBe(false);
  });
});

// ============================================================================
// MULTIPLE CONTEXT MENUS
// ============================================================================

describe('useMultipleContextMenus', () => {
  test('manages multiple context menus independently', () => {
    const { result } = renderHook(() => useMultipleContextMenus());

    expect(result.current.nodeMenu.isVisible).toBe(false);
    expect(result.current.linkMenu.isVisible).toBe(false);
    expect(result.current.canvasMenu.isVisible).toBe(false);
  });

  test('shows node menu and hides others', () => {
    const { result } = renderHook(() => useMultipleContextMenus());

    const mockEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    const node = { id: 'node-1' };

    act(() => {
      result.current.showNodeMenu(mockEvent, node);
    });

    expect(result.current.nodeMenu.isVisible).toBe(true);
    expect(result.current.linkMenu.isVisible).toBe(false);
    expect(result.current.canvasMenu.isVisible).toBe(false);
  });

  test('shows link menu and hides others', () => {
    const { result } = renderHook(() => useMultipleContextMenus());

    const mockEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    const link = { id: 'link-1' };

    act(() => {
      result.current.showLinkMenu(mockEvent, link);
    });

    expect(result.current.nodeMenu.isVisible).toBe(false);
    expect(result.current.linkMenu.isVisible).toBe(true);
    expect(result.current.canvasMenu.isVisible).toBe(false);
  });

  test('shows canvas menu and hides others', () => {
    const { result } = renderHook(() => useMultipleContextMenus());

    const mockEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.showCanvasMenu(mockEvent);
    });

    expect(result.current.nodeMenu.isVisible).toBe(false);
    expect(result.current.linkMenu.isVisible).toBe(false);
    expect(result.current.canvasMenu.isVisible).toBe(true);
  });

  test('hides all menus', () => {
    const { result } = renderHook(() => useMultipleContextMenus());

    const mockEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    // Show all menus
    act(() => {
      result.current.showNodeMenu(mockEvent, { id: '1' });
    });

    act(() => {
      result.current.hideAll();
    });

    expect(result.current.nodeMenu.isVisible).toBe(false);
    expect(result.current.linkMenu.isVisible).toBe(false);
    expect(result.current.canvasMenu.isVisible).toBe(false);
  });
});

// ============================================================================
// DROPDOWN MENU
// ============================================================================

describe('useDropdownMenu', () => {
  test('initializes with menu closed', () => {
    const { result } = renderHook(() => useDropdownMenu());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.position.x).toBe(0);
    expect(result.current.position.y).toBe(0);
  });

  test('opens dropdown menu', () => {
    const { result } = renderHook(() => useDropdownMenu());

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        bottom: 80,
        right: 200,
        width: 100,
        height: 30,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }),
    } as Element;

    act(() => {
      result.current.open(mockElement);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.position.x).toBe(100); // left + offsetX (0)
    expect(result.current.position.y).toBe(85); // bottom + offsetY (5)
  });

  test('closes dropdown menu', () => {
    const { result } = renderHook(() => useDropdownMenu());

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        bottom: 80,
        right: 200,
        width: 100,
        height: 30,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }),
    } as Element;

    act(() => {
      result.current.open(mockElement);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  test('toggles dropdown menu', () => {
    const { result } = renderHook(() => useDropdownMenu());

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        bottom: 80,
        right: 200,
        width: 100,
        height: 30,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }),
    } as Element;

    // Toggle open
    act(() => {
      result.current.toggle(mockElement);
    });

    expect(result.current.isOpen).toBe(true);

    // Toggle closed
    act(() => {
      result.current.toggle(mockElement);
    });

    expect(result.current.isOpen).toBe(false);
  });

  test('uses custom offsets', () => {
    const { result } = renderHook(() =>
      useDropdownMenu({
        offsetX: 10,
        offsetY: 20,
      })
    );

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        bottom: 80,
        right: 200,
        width: 100,
        height: 30,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }),
    } as Element;

    act(() => {
      result.current.open(mockElement);
    });

    expect(result.current.position.x).toBe(110); // left + offsetX (10)
    expect(result.current.position.y).toBe(100); // bottom + offsetY (20)
  });

  test('provides menu style', () => {
    const { result } = renderHook(() => useDropdownMenu());

    expect(result.current.menuStyle).toEqual({
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 1000,
    });
  });
});

// ============================================================================
// NESTED CONTEXT MENU
// ============================================================================

describe('useNestedContextMenu', () => {
  test('manages main and sub menus', () => {
    const { result } = renderHook(() => useNestedContextMenu());

    expect(result.current.mainMenu.isVisible).toBe(false);
    expect(result.current.subMenu.isVisible).toBe(false);
  });

  test('shows main menu and hides sub menu', () => {
    const { result } = renderHook(() => useNestedContextMenu());

    act(() => {
      result.current.showMainMenu(100, 200, { id: 'main-target' });
    });

    expect(result.current.mainMenu.isVisible).toBe(true);
    expect(result.current.subMenu.isVisible).toBe(false);
  });

  test('shows sub menu', () => {
    const { result } = renderHook(() => useNestedContextMenu());

    const mockEvent = {
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          right: 200,
          bottom: 80,
          width: 100,
          height: 30,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        }),
      },
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.showSubMenu(mockEvent, { id: 'sub-target' });
    });

    expect(result.current.subMenu.isVisible).toBe(true);
    // Sub menu should be positioned to the right of the main menu item
    expect(result.current.subMenu.position.x).toBe(205); // right + 5
    expect(result.current.subMenu.position.y).toBe(50); // top
  });

  test('hides all menus', () => {
    const { result } = renderHook(() => useNestedContextMenu());

    act(() => {
      result.current.showMainMenu(100, 200, { id: 'main' });
    });

    act(() => {
      result.current.hideAll();
    });

    expect(result.current.mainMenu.isVisible).toBe(false);
    expect(result.current.subMenu.isVisible).toBe(false);
  });
});
