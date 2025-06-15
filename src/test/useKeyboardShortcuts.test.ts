import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Mock handlers
const mockHandlers = {
  onNewTask: vi.fn(),
  onToggleSettings: vi.fn(),
  onFocusSearch: vi.fn(),
  onSelectAll: vi.fn(),
  onDeleteSelected: vi.fn(),
  onShowHelp: vi.fn(),
  onClearSelection: vi.fn(),
  onEditSelected: vi.fn(),
  onToggleSelectedCompletion: vi.fn(),
};

// Mock navigator.platform for OS detection
const mockNavigator = {
  platform: 'Linux x86_64',
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Mock document
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  activeElement: null as any
};

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

// Helper to simulate key events
const simulateKeyDown = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: modifiers.ctrlKey || false,
    metaKey: modifiers.metaKey || false,
    shiftKey: modifiers.shiftKey || false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  });

  // Get the registered event handler
  const keydownHandler = mockDocument.addEventListener.mock.calls.find(
    call => call[0] === 'keydown'
  )?.[1];

  if (keydownHandler) {
    keydownHandler(event);
  }

  return event;
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocument.activeElement = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization and OS detection', () => {
    it('should register keydown event listener', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should cleanup event listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      unmount();

      expect(mockDocument.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should detect Linux OS and use Ctrl modifier', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const newTaskShortcut = result.current.shortcuts.find(s => s.description === '新しいタスクを追加');
      expect(newTaskShortcut?.key).toBe('Ctrl + N');
    });

    it('should detect Mac OS and use Cmd modifier', () => {
      // Mock Mac platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'MacIntel',
        writable: true
      });

      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const newTaskShortcut = result.current.shortcuts.find(s => s.description === '新しいタスクを追加');
      expect(newTaskShortcut?.key).toBe('Cmd + N');

      // Restore Linux platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Linux x86_64',
        writable: true
      });
    });

    it('should detect Windows OS and use Ctrl modifier', () => {
      // Mock Windows platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Win32',
        writable: true
      });

      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const newTaskShortcut = result.current.shortcuts.find(s => s.description === '新しいタスクを追加');
      expect(newTaskShortcut?.key).toBe('Ctrl + N');

      // Restore Linux platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Linux x86_64',
        writable: true
      });
    });

    it('should detect Tauri environment', () => {
      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true
      });

      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      expect(result.current.shortcuts).toBeDefined();
      expect(result.current.shortcuts.length).toBeGreaterThan(0);

      // Cleanup
      delete (global.window as any).__TAURI_INTERNALS__;
    });
  });

  describe('basic keyboard shortcuts', () => {
    it('should handle Ctrl+N for new task', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('n', { ctrlKey: true });

      expect(mockHandlers.onNewTask).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Ctrl+, for settings', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown(',', { ctrlKey: true });

      expect(mockHandlers.onToggleSettings).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Ctrl+F for search', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('f', { ctrlKey: true });

      expect(mockHandlers.onFocusSearch).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Ctrl+D for toggle completion', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('d', { ctrlKey: true });

      expect(mockHandlers.onToggleSelectedCompletion).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Delete key for deleting selected tasks', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('Delete');

      expect(mockHandlers.onDeleteSelected).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Backspace key for deleting selected tasks', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('Backspace');

      expect(mockHandlers.onDeleteSelected).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle E key for editing selected tasks', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('e');

      expect(mockHandlers.onEditSelected).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle F2 key for editing selected tasks', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('F2');

      expect(mockHandlers.onEditSelected).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Escape key for clearing selection', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement with blur method
      const mockElement = { blur: vi.fn() };
      mockDocument.activeElement = mockElement;

      const event = simulateKeyDown('Escape');

      expect(mockHandlers.onClearSelection).toHaveBeenCalledTimes(1);
      expect(mockElement.blur).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('select all handling', () => {
    it('should handle Ctrl+A for select all when not in input field', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = simulateKeyDown('a', { ctrlKey: true });

      expect(mockHandlers.onSelectAll).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not handle Ctrl+A when in input field', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement as input
      const mockInput = {
        closest: vi.fn().mockReturnValue(true) // Returns truthy for input element
      };
      mockDocument.activeElement = mockInput;

      const event = simulateKeyDown('a', { ctrlKey: true });

      expect(mockHandlers.onSelectAll).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle Ctrl+A when in textarea', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement as textarea
      const mockTextarea = {
        closest: vi.fn().mockImplementation((selector) => selector.includes('textarea'))
      };
      mockDocument.activeElement = mockTextarea;

      const event = simulateKeyDown('a', { ctrlKey: true });

      expect(mockHandlers.onSelectAll).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle Ctrl+A when in contenteditable element', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement as contenteditable
      const mockContentEditable = {
        closest: vi.fn().mockImplementation((selector) => selector.includes('contenteditable'))
      };
      mockDocument.activeElement = mockContentEditable;

      const event = simulateKeyDown('a', { ctrlKey: true });

      expect(mockHandlers.onSelectAll).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('input field detection', () => {
    it('should not handle Delete when in input field', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement as input
      const mockInput = {
        closest: vi.fn().mockReturnValue(true)
      };
      mockDocument.activeElement = mockInput;

      const event = simulateKeyDown('Delete');

      expect(mockHandlers.onDeleteSelected).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle E when in input field', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement as input
      const mockInput = {
        closest: vi.fn().mockReturnValue(true)
      };
      mockDocument.activeElement = mockInput;

      const event = simulateKeyDown('e');

      expect(mockHandlers.onEditSelected).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not handle Ctrl+D when in input field', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement as input
      const mockInput = {
        closest: vi.fn().mockReturnValue(true)
      };
      mockDocument.activeElement = mockInput;

      const event = simulateKeyDown('d', { ctrlKey: true });

      expect(mockHandlers.onToggleSelectedCompletion).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('sequential key combinations', () => {
    it('should handle Ctrl+K, Ctrl+S for help', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // First press Ctrl+K
      const event1 = simulateKeyDown('k', { ctrlKey: true });
      expect(event1.preventDefault).toHaveBeenCalled();

      // Then press Ctrl+S within timeout
      const event2 = simulateKeyDown('s', { ctrlKey: true });

      expect(mockHandlers.onShowHelp).toHaveBeenCalledTimes(1);
      expect(event2.preventDefault).toHaveBeenCalled();
    });

    it('should timeout sequential key combinations', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // First press Ctrl+K
      simulateKeyDown('k', { ctrlKey: true });

      // Wait for timeout (2 seconds)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Then press Ctrl+S (should not trigger help)
      simulateKeyDown('s', { ctrlKey: true });

      expect(mockHandlers.onShowHelp).not.toHaveBeenCalled();
    });

    it('should reset sequential key combination on wrong second key', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // First press Ctrl+K
      simulateKeyDown('k', { ctrlKey: true });

      // Then press wrong key
      simulateKeyDown('x', { ctrlKey: true });

      // Then try correct sequence again
      simulateKeyDown('k', { ctrlKey: true });
      simulateKeyDown('s', { ctrlKey: true });

      expect(mockHandlers.onShowHelp).toHaveBeenCalledTimes(1);
    });

    it('should reset sequential key combination on any other key during wait', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // First press Ctrl+K
      simulateKeyDown('k', { ctrlKey: true });

      // Press any other key combination
      simulateKeyDown('n', { ctrlKey: true });

      // Should trigger new task (not waiting for second key anymore)
      expect(mockHandlers.onNewTask).toHaveBeenCalledTimes(1);

      // Then try Ctrl+S (should not trigger help)
      simulateKeyDown('s', { ctrlKey: true });

      expect(mockHandlers.onShowHelp).not.toHaveBeenCalled();
    });
  });

  describe('modal state handling', () => {
    it('should not handle Escape when modal is open', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers, { isModalOpen: true }));

      const event = simulateKeyDown('Escape');

      expect(mockHandlers.onClearSelection).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle Escape when modal is closed', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers, { isModalOpen: false }));

      const event = simulateKeyDown('Escape');

      expect(mockHandlers.onClearSelection).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle other shortcuts even when modal is open', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers, { isModalOpen: true }));

      const event = simulateKeyDown('n', { ctrlKey: true });

      expect(mockHandlers.onNewTask).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Enter key handling', () => {
    it('should prevent default Enter when not in add-todo form', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement not in add-todo form
      const mockElement = {
        closest: vi.fn().mockReturnValue(null)
      };
      mockDocument.activeElement = mockElement;

      const event = simulateKeyDown('Enter');

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not prevent default Enter when in add-todo form', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement in add-todo form
      const mockElement = {
        closest: vi.fn().mockImplementation((selector) => 
          selector.includes('.add-todo-form') || 
          selector.includes('.add-todo-input') || 
          selector.includes('.add-todo-description')
        )
      };
      mockDocument.activeElement = mockElement;

      const event = simulateKeyDown('Enter');

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('shortcuts information', () => {
    it('should return correct shortcuts for Linux/Windows', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      expect(result.current.shortcuts).toContainEqual({
        key: 'Ctrl + N',
        description: '新しいタスクを追加'
      });

      expect(result.current.shortcuts).toContainEqual({
        key: 'Ctrl + K, Ctrl + S',
        description: 'ヘルプを表示'
      });

      expect(result.current.shortcuts).toContainEqual({
        key: 'Delete',
        description: '選択されたタスクを削除'
      });
    });

    it('should return correct shortcuts for Mac', () => {
      // Mock Mac platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'MacIntel',
        writable: true
      });

      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      expect(result.current.shortcuts).toContainEqual({
        key: 'Cmd + N',
        description: '新しいタスクを追加'
      });

      expect(result.current.shortcuts).toContainEqual({
        key: 'Cmd + K, Cmd + S',
        description: 'ヘルプを表示'
      });

      // Restore Linux platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Linux x86_64',
        writable: true
      });
    });

    it('should include all expected shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      const expectedDescriptions = [
        '新しいタスクを追加',
        '設定を開く',
        '検索',
        '全選択',
        '選択されたタスクを削除',
        '選択解除・フォーカスを外す',
        'ヘルプを表示',
        'タスクを完了/未完了に切り替え',
        'タスクを編集',
        '個別選択/解除',
        '範囲選択'
      ];

      expectedDescriptions.forEach(description => {
        expect(result.current.shortcuts.some(s => s.description === description)).toBe(true);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing activeElement gracefully', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      mockDocument.activeElement = null;

      const event = simulateKeyDown('Delete');

      expect(mockHandlers.onDeleteSelected).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle activeElement without closest method', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement without closest method
      mockDocument.activeElement = {};

      const event = simulateKeyDown('a', { ctrlKey: true });

      // Should still work, treating as not in input field
      expect(mockHandlers.onSelectAll).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle activeElement without blur method on Escape', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock activeElement without blur method
      mockDocument.activeElement = {};

      const event = simulateKeyDown('Escape');

      expect(mockHandlers.onClearSelection).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should cleanup timeout on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Start sequential key combination
      simulateKeyDown('k', { ctrlKey: true });

      // Unmount before timeout
      unmount();

      // Advance timers (should not cause issues)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // No errors should occur
    });

    it('should handle rapid key presses', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Rapid fire Ctrl+N
      simulateKeyDown('n', { ctrlKey: true });
      simulateKeyDown('n', { ctrlKey: true });
      simulateKeyDown('n', { ctrlKey: true });

      expect(mockHandlers.onNewTask).toHaveBeenCalledTimes(3);
    });

    it('should handle unknown OS gracefully', () => {
      // Mock unknown platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'UnknownOS',
        writable: true
      });

      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Should default to Ctrl for unknown OS
      const newTaskShortcut = result.current.shortcuts.find(s => s.description === '新しいタスクを追加');
      expect(newTaskShortcut?.key).toBe('Ctrl + N');

      // Restore Linux platform
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Linux x86_64',
        writable: true
      });
    });
  });
});