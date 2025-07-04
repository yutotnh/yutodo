import { useEffect, useCallback, useState, useRef } from 'react';
import { useFileSettings } from './useFileSettings';
import { detectOS } from '../utils/osDetection';
import logger from '../utils/logger';

export interface KeyboardShortcutHandlers {
  // Basic operations
  onNewTask: () => void;
  onNewWindow: () => void;
  onToggleSettings: () => void;
  onFocusSearch: () => void;
  onOpenCommandPalette: () => void;
  
  // Search/Filter operations
  onToggleSearch?: () => void;
  onToggleFilter?: () => void;
  onToggleCaseSensitive?: () => void;
  onToggleRegex?: () => void;
  onToggleWholeWord?: () => void;
  
  // Task operations
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onEditSelected: () => void;
  onToggleSelectedCompletion: () => void;
  
  // Navigation
  onClearSelection: () => void;
  
  // Help
  onShowHelp: () => void;
  
  // View switching
  onShowTasksDetailed?: () => void;
  onShowTasksSimple?: () => void;
  onShowSchedules?: () => void;
  
  // Legacy view switching handlers for backward compatibility
  onViewTasksDetailed?: () => void;
  onViewTasksSimple?: () => void;
  onViewSchedules?: () => void;
  
  // Navigation
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  onFirstTask?: () => void;
  onLastTask?: () => void;
}

interface KeyboardShortcutOptions {
  isModalOpen?: boolean;
}

interface ParsedKeybinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  command: string;
  when?: string;
}

// Parse key string like "Ctrl+Shift+P" into components
function parseKeyString(keyStr: string): ParsedKeybinding {
  const parts = keyStr.split('+').map(p => p.trim().toLowerCase());
  const key = parts[parts.length - 1];
  
  return {
    key: key === 'delete' ? 'Delete' : 
         key === 'backspace' ? 'Backspace' :
         key === 'escape' ? 'Escape' :
         key === 'enter' ? 'Enter' :
         key === 'space' ? ' ' :
         key === 'arrowup' ? 'ArrowUp' :
         key === 'arrowdown' ? 'ArrowDown' :
         key === 'arrowleft' ? 'ArrowLeft' :
         key === 'arrowright' ? 'ArrowRight' :
         key === 'home' ? 'Home' :
         key === 'end' ? 'End' :
         key.length === 1 ? key : key.charAt(0).toUpperCase() + key.slice(1),
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    command: ''
  };
}

// Check if a keybinding matches the current event
function matchesKeybinding(event: KeyboardEvent, binding: ParsedKeybinding): boolean {
  const keyMatches = event.key.toLowerCase() === binding.key.toLowerCase() ||
                     (event.key === binding.key);
  
  return keyMatches &&
         event.ctrlKey === binding.ctrl &&
         event.shiftKey === binding.shift &&
         event.altKey === binding.alt &&
         event.metaKey === binding.meta;
}

// Evaluate 'when' clause
function evaluateWhenClause(when: string | undefined, context: any): boolean {
  if (!when) return true;
  
  // Simple when clause evaluation
  // Supports: !inputFocus, taskSelected, editing, etc.
  const conditions = when.split('&&').map(c => c.trim());
  
  for (const condition of conditions) {
    const isNegated = condition.startsWith('!');
    const conditionName = isNegated ? condition.slice(1) : condition;
    
    let result = false;
    switch (conditionName) {
      case 'inputFocus': {
        const activeElement = document.activeElement;
        result = !!activeElement?.closest('input, textarea, [contenteditable="true"]');
        break;
      }
      case 'taskSelected':
        result = context.hasSelectedTasks || false;
        break;
      case 'editing':
        result = context.isEditing || false;
        break;
      default:
        result = false;
    }
    
    if (isNegated ? result : !result) {
      return false;
    }
  }
  
  return true;
}

export const useKeyboardShortcuts = (
  handlers: KeyboardShortcutHandlers, 
  options: KeyboardShortcutOptions = {}
) => {
  const { keybindings } = useFileSettings();
  
  // Fallback keybindings for when file-based settings are not available
  const fallbackKeybindings = [
    { key: 'Ctrl+Shift+P', command: 'openCommandPalette' },
    { key: 'Ctrl+N', command: 'newTask', when: '!inputFocus' },
    { key: 'Ctrl+Shift+N', command: 'newWindow' },
    { key: 'Ctrl+,', command: 'openSettings' },
    { key: 'Ctrl+F', command: 'toggleSearch' },
    { key: 'Ctrl+Shift+F', command: 'toggleFilter' },
    { key: 'Ctrl+K Ctrl+S', command: 'showKeybindings' },
    { key: 'Alt+C', command: 'toggleCaseSensitive' },
    { key: 'Alt+R', command: 'toggleRegex' },
    { key: 'Alt+W', command: 'toggleWholeWord' },
    { key: 'Ctrl+A', command: 'selectAll', when: '!inputFocus' },
    { key: 'Ctrl+D', command: 'toggleTaskComplete', when: 'taskSelected && !inputFocus' },
    { key: 'Delete', command: 'deleteSelected', when: 'taskSelected && !inputFocus' },
    { key: 'F2', command: 'editTask', when: 'taskSelected && !inputFocus' },
    { key: 'E', command: 'editTask', when: 'taskSelected && !inputFocus' },
    { key: 'Escape', command: 'cancelAction' },
    { key: 'Ctrl+1', command: 'showTasksDetailed' },
    { key: 'Ctrl+2', command: 'showTasksSimple' },
    { key: 'Ctrl+3', command: 'showSchedules' }
  ];
  
  const effectiveKeybindings = keybindings.length > 0 ? keybindings : fallbackKeybindings;
  
  // Debug: Log keybindings to check if newWindow is present
  useEffect(() => {
    logger.debug('Effective keybindings count:', effectiveKeybindings.length);
    logger.debug('Using file-based keybindings:', keybindings.length > 0);
    const newWindowBinding = effectiveKeybindings.find(kb => kb.command === 'newWindow');
    logger.debug('newWindow keybinding found:', !!newWindowBinding, newWindowBinding);
  }, [effectiveKeybindings, keybindings.length]);
  
  // Sequential key handling
  const [isWaitingForSecondKey, setIsWaitingForSecondKey] = useState(false);
  const [firstKeyBinding, setFirstKeyBinding] = useState<ParsedKeybinding | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Context for when clause evaluation
  const [context, setContext] = useState({
    hasSelectedTasks: false,
    isEditing: false
  });
  
  // Update context (this should be called from the parent component)
  const updateContext = useCallback((newContext: Partial<typeof context>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  const resetKeySequence = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsWaitingForSecondKey(false);
    setFirstKeyBinding(null);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if modal is open (except for Escape key)
    if (options.isModalOpen && event.key !== 'Escape') {
      return;
    }
    
    
    // Process keybindings
    for (const keybinding of effectiveKeybindings) {
      const parts = keybinding.key.split(' ').filter(p => p.trim());
      
      // Sequential keybinding (e.g., "Ctrl+K Ctrl+S")
      if (parts.length === 2) {
        const firstParsed = parseKeyString(parts[0]);
        const secondParsed = parseKeyString(parts[1]);
        
        // Check if this is the first key of a sequence
        if (!isWaitingForSecondKey && matchesKeybinding(event, firstParsed)) {
          event.preventDefault();
          setIsWaitingForSecondKey(true);
          setFirstKeyBinding(firstParsed);
          
          // Set timeout for sequence
          timeoutRef.current = setTimeout(() => {
            resetKeySequence();
          }, 2000);
          return;
        }
        
        // Check if this is the second key of a sequence
        if (isWaitingForSecondKey && firstKeyBinding && 
            keybinding.key.startsWith(parts[0]) && 
            matchesKeybinding(event, secondParsed)) {
          event.preventDefault();
          resetKeySequence();
          
          // Evaluate when clause and execute command
          if (evaluateWhenClause(keybinding.when, context)) {
            executeCommand(keybinding.command, handlers);
          }
          return;
        }
      } else {
        // Single keybinding
        const parsed = parseKeyString(keybinding.key);
        
        if (matchesKeybinding(event, parsed)) {
          // Evaluate when clause
          if (evaluateWhenClause(keybinding.when, context)) {
            event.preventDefault();
            event.stopPropagation();
            executeCommand(keybinding.command, handlers);
            return;
          }
        }
      }
    }
    
    // Reset sequence if unexpected key
    if (isWaitingForSecondKey) {
      resetKeySequence();
    }
  }, [effectiveKeybindings, isWaitingForSecondKey, firstKeyBinding, resetKeySequence, context, handlers, options.isModalOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // Get display shortcuts for UI
  const getDisplayShortcuts = useCallback(() => {
    const os = detectOS();
    const modifierKey = os === 'mac' ? 'Cmd' : 'Ctrl';
    
    return effectiveKeybindings.map(kb => ({
      key: kb.key.replace(/Ctrl/g, modifierKey).replace(/Meta/g, modifierKey),
      command: kb.command,
      description: getCommandDescription(kb.command),
      when: kb.when
    }));
  }, [effectiveKeybindings]);

  // Additional non-keyboard shortcuts
  const additionalShortcuts = [
    { 
      key: `${detectOS() === 'mac' ? 'Cmd' : 'Ctrl'} + Click`, 
      description: 'Toggle individual selection' 
    },
    { 
      key: 'Shift + Click', 
      description: 'Select range' 
    },
    { 
      key: 'Double Click', 
      description: 'Edit task' 
    }
  ];
  
  const shortcuts = [...getDisplayShortcuts(), ...additionalShortcuts];

  return { 
    shortcuts, 
    updateContext 
  };
};

// Execute command based on command name
function executeCommand(command: string, handlers: KeyboardShortcutHandlers) {
  logger.debug(`Executing command: ${command}`);
  
  // Debug: Check if newWindow handler exists
  if (command === 'newWindow') {
    logger.debug('newWindow command triggered, handler exists:', typeof handlers.onNewWindow === 'function');
  }
  
  switch (command) {
    // Basic operations
    case 'newTask':
      handlers.onNewTask();
      break;
    case 'newWindow':
      handlers.onNewWindow();
      break;
    case 'openSettings':
      handlers.onToggleSettings();
      break;
    case 'focusSearch':
      handlers.onFocusSearch();
      break;
    case 'toggleSearch':
      handlers.onToggleSearch?.();
      break;
    case 'toggleFilter':
      handlers.onToggleFilter?.();
      break;
    case 'toggleCaseSensitive':
      handlers.onToggleCaseSensitive?.();
      break;
    case 'toggleRegex':
      handlers.onToggleRegex?.();
      break;
    case 'toggleWholeWord':
      handlers.onToggleWholeWord?.();
      break;
    case 'openCommandPalette':
      handlers.onOpenCommandPalette();
      break;
      
    // Task operations
    case 'selectAll':
      handlers.onSelectAll();
      break;
    case 'deleteSelected':
      handlers.onDeleteSelected();
      break;
    case 'editTask':
      handlers.onEditSelected();
      break;
    case 'toggleTaskComplete':
      handlers.onToggleSelectedCompletion();
      break;
      
    // Navigation
    case 'cancelAction':
      handlers.onClearSelection();
      break;
      
    // Help
    case 'showKeybindings':
      handlers.onShowHelp();
      break;
      
    // View switching
    case 'showTasksDetailed':
      handlers.onShowTasksDetailed?.();
      break;
    case 'showTasksSimple':
      handlers.onShowTasksSimple?.();
      break;
    case 'showSchedules':
      handlers.onShowSchedules?.();
      break;
      
    // Legacy view switching commands for backward compatibility  
    case 'viewTasksDetailed':
      handlers.onViewTasksDetailed?.();
      break;
    case 'viewTasksSimple':
      handlers.onViewTasksSimple?.();
      break;
    case 'viewSchedules':
      handlers.onViewSchedules?.();
      break;
      
    // Navigation
    case 'nextTask':
      handlers.onNextTask?.();
      break;
    case 'previousTask':
      handlers.onPreviousTask?.();
      break;
    case 'firstTask':
      handlers.onFirstTask?.();
      break;
    case 'lastTask':
      handlers.onLastTask?.();
      break;
      
    default:
      logger.warn(`Unknown command: ${command}`);
  }
}

// Get human-readable description for command
function getCommandDescription(command: string): string {
  const descriptions: Record<string, string> = {
    newTask: 'Add new task',
    openSettings: 'Open settings',
    focusSearch: 'Search',
    toggleSearch: 'Toggle search',
    toggleFilter: 'Toggle filter',
    toggleCaseSensitive: 'Toggle case sensitive',
    toggleRegex: 'Toggle regex mode',
    toggleWholeWord: 'Toggle whole word',
    openCommandPalette: 'Open command palette',
    selectAll: 'Select all',
    deleteSelected: 'Delete selected',
    editTask: 'Edit task',
    toggleTaskComplete: 'Toggle completion',
    cancelAction: 'Cancel/Clear selection',
    showKeybindings: 'Show keyboard shortcuts',
    showTasksDetailed: 'Show tasks detailed view',
    showTasksSimple: 'Show tasks simple view',
    showSchedules: 'Show schedules view',
    viewTasksDetailed: 'Switch to detailed tasks view',
    viewTasksSimple: 'Switch to simple tasks view', 
    viewSchedules: 'Switch to schedules view',
    nextTask: 'Next task',
    previousTask: 'Previous task',
    firstTask: 'First task',
    lastTask: 'Last task',
    confirmEdit: 'Confirm edit',
    showHelp: 'Show help'
  };
  
  return descriptions[command] || command;
}