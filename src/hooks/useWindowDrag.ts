import { useCallback } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import logger from '../utils/logger';

interface UseWindowDragOptions {
  /** Elements to ignore when starting drag (default: ['button', 'input', 'textarea', 'select', 'a']) */
  ignoreElements?: string[];
  /** Whether to log errors (default: true) */
  logErrors?: boolean;
}

/**
 * Reusable hook for enabling window dragging on modal headers and title bars.
 * 
 * This hook provides a mouse down handler that enables window dragging in Tauri environments.
 * It automatically ignores interactive elements to prevent conflicts.
 * 
 * @param options Configuration options for the drag behavior
 * @returns Object containing the drag handler and utilities
 * 
 * @example
 * ```tsx
 * const { handleMouseDown } = useWindowDrag();
 * 
 * return (
 *   <div className="modal-header" onMouseDown={handleMouseDown}>
 *     <h2>Modal Title</h2>
 *     <button>Close</button>
 *   </div>
 * );
 * ```
 */
export const useWindowDrag = (options: UseWindowDragOptions = {}) => {
  const {
    ignoreElements = ['button', 'input', 'textarea', 'select', 'a'],
    logErrors = true
  } = options;

  /**
   * Handle mouse down event to start window dragging.
   * Automatically ignores clicks on interactive elements.
   */
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check if click is on an element that should be ignored
    const target = e.target as HTMLElement;
    for (const selector of ignoreElements) {
      if (target.closest(selector)) {
        return;
      }
    }

    try {
      // Only enable dragging in Tauri environment
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const appWindow = getCurrentWebviewWindow();
        await appWindow.startDragging();
      }
    } catch (error) {
      if (logErrors) {
        logger.error('Failed to start window dragging:', error);
      }
    }
  }, [ignoreElements, logErrors]);

  /**
   * Check if current environment supports window dragging
   */
  const isDragSupported = useCallback(() => {
    return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
  }, []);

  return {
    handleMouseDown,
    isDragSupported
  };
};

export default useWindowDrag;