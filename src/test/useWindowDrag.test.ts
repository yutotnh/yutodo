import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWindowDrag } from '../hooks/useWindowDrag';

// Mock logger
vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

// Mock Tauri API functions
const mockStartDragging = vi.fn();

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    startDragging: mockStartDragging,
  })),
}));

describe('useWindowDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup Tauri environment by default
    if (typeof window !== 'undefined') {
      (window as any).__TAURI_INTERNALS__ = true;
    } else {
      (global as any).window = { __TAURI_INTERNALS__: true };
    }
  });

  afterEach(() => {
    // Clean up Tauri environment
    if (typeof window !== 'undefined') {
      delete (window as any).__TAURI_INTERNALS__;
    } else if ((global as any).window) {
      delete (global as any).window.__TAURI_INTERNALS__;
    }
  });

  describe('handleMouseDown', () => {
    it('should call startDragging in Tauri environment', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const mockEvent = {
        preventDefault: vi.fn(),
        target: document.createElement('div'),
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).toHaveBeenCalled();
    });

    it('should not call startDragging in non-Tauri environment', async () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__TAURI_INTERNALS__;
      } else {
        delete (global as any).window.__TAURI_INTERNALS__;
      }
      
      const { result } = renderHook(() => useWindowDrag());

      const mockEvent = {
        preventDefault: vi.fn(),
        target: document.createElement('div'),
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should ignore clicks on button elements', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const button = document.createElement('button');
      const mockEvent = {
        preventDefault: vi.fn(),
        target: button,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should ignore clicks on input elements', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const input = document.createElement('input');
      const mockEvent = {
        preventDefault: vi.fn(),
        target: input,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should ignore clicks on textarea elements', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const textarea = document.createElement('textarea');
      const mockEvent = {
        preventDefault: vi.fn(),
        target: textarea,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should ignore clicks on select elements', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const select = document.createElement('select');
      const mockEvent = {
        preventDefault: vi.fn(),
        target: select,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should ignore clicks on link elements', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const link = document.createElement('a');
      const mockEvent = {
        preventDefault: vi.fn(),
        target: link,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should ignore clicks on child elements of ignored elements', async () => {
      const { result } = renderHook(() => useWindowDrag());

      const button = document.createElement('button');
      const span = document.createElement('span');
      button.appendChild(span);
      document.body.appendChild(button);

      const mockEvent = {
        preventDefault: vi.fn(),
        target: span,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();

      document.body.removeChild(button);
    });

    it('should use custom ignore elements when provided', async () => {
      const { result } = renderHook(() => 
        useWindowDrag({ ignoreElements: ['button', '.custom-ignore'] })
      );

      const div = document.createElement('div');
      div.className = 'custom-ignore';
      const mockEvent = {
        preventDefault: vi.fn(),
        target: div,
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).not.toHaveBeenCalled();
    });

    it('should handle startDragging errors gracefully', async () => {
      const mockLogger = await import('../utils/logger');
      const consoleSpy = vi.spyOn(mockLogger.default, 'error');

      mockStartDragging.mockRejectedValueOnce(new Error('Drag failed'));

      const { result } = renderHook(() => useWindowDrag());

      const mockEvent = {
        preventDefault: vi.fn(),
        target: document.createElement('div'),
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to start window dragging:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should not log errors when logErrors is false', async () => {
      const mockLogger = await import('../utils/logger');
      const consoleSpy = vi.spyOn(mockLogger.default, 'error');

      mockStartDragging.mockRejectedValueOnce(new Error('Drag failed'));

      const { result } = renderHook(() => useWindowDrag({ logErrors: false }));

      const mockEvent = {
        preventDefault: vi.fn(),
        target: document.createElement('div'),
      } as any;

      await act(async () => {
        await result.current.handleMouseDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartDragging).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('isDragSupported', () => {
    it('should return true in Tauri environment', () => {
      const { result } = renderHook(() => useWindowDrag());
      expect(result.current.isDragSupported()).toBe(true);
    });
  });
});