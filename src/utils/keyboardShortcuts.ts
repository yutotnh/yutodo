// Centralized keyboard shortcut definitions
import { detectOS } from './osDetection';

export interface KeyboardShortcut {
  id: string;
  key: string;
  description: string;
  handler: string; // matches handler name in KeyboardShortcutHandlers
  category: 'basic' | 'task' | 'navigation' | 'help';
  contextRequired?: boolean; // if true, only works with selected tasks
}

// Get modifier key based on OS
export const getModifierKey = () => {
  const os = detectOS();
  return os === 'mac' ? 'Cmd' : 'Ctrl';
};

// Get display key for shortcuts
export const getDisplayKey = (shortcut: string) => {
  const modifierKey = getModifierKey();
  return shortcut.replace('Ctrl', modifierKey).replace('Meta', modifierKey);
};

// Centralized keyboard shortcuts definition
export const keyboardShortcuts: KeyboardShortcut[] = [
  // Basic operations
  {
    id: 'new-task',
    key: 'Ctrl+N',
    description: 'Add new task',
    handler: 'onNewTask',
    category: 'basic'
  },
  {
    id: 'command-palette',
    key: 'Ctrl+Shift+P',
    description: 'Open command palette',
    handler: 'onOpenCommandPalette',
    category: 'basic'
  },
  {
    id: 'open-settings',
    key: 'Ctrl+,',
    description: 'Open settings',
    handler: 'onToggleSettings',
    category: 'basic'
  },
  {
    id: 'focus-search',
    key: 'Ctrl+F',
    description: 'Search',
    handler: 'onFocusSearch',
    category: 'basic'
  },
  
  // Task operations
  {
    id: 'select-all',
    key: 'Ctrl+A',
    description: 'Select all',
    handler: 'onSelectAll',
    category: 'task'
  },
  {
    id: 'delete-selected',
    key: 'Delete',
    description: 'Delete selected tasks',
    handler: 'onDeleteSelected',
    category: 'task',
    contextRequired: true
  },
  {
    id: 'toggle-completion',
    key: 'Ctrl+D',
    description: 'Toggle task completion',
    handler: 'onToggleSelectedCompletion',
    category: 'task',
    contextRequired: true
  },
  {
    id: 'edit-task-e',
    key: 'E',
    description: 'Edit task',
    handler: 'onEditSelected',
    category: 'task',
    contextRequired: true
  },
  {
    id: 'edit-task-f2',
    key: 'F2',
    description: 'Edit task',
    handler: 'onEditSelected',
    category: 'task',
    contextRequired: true
  },
  
  // Navigation and selection
  {
    id: 'clear-selection',
    key: 'Escape',
    description: 'Remove focus',
    handler: 'onClearSelection',
    category: 'navigation'
  },
  
  // Help
  {
    id: 'show-help',
    key: 'Ctrl+K Ctrl+S',
    description: 'Show shortcut help',
    handler: 'onShowHelp',
    category: 'help'
  }
];

// Get shortcuts by category
export const getShortcutsByCategory = (category: string) => {
  return keyboardShortcuts.filter(shortcut => shortcut.category === category);
};

// Get shortcut by handler name
export const getShortcutByHandler = (handlerName: string) => {
  return keyboardShortcuts.find(shortcut => shortcut.handler === handlerName);
};

// Get all shortcuts for display
export const getAllShortcutsForDisplay = () => {
  return keyboardShortcuts.map(shortcut => ({
    ...shortcut,
    displayKey: getDisplayKey(shortcut.key)
  }));
};

// Get shortcut key for command
export const getShortcutKey = (handlerName: string): string | undefined => {
  const shortcut = getShortcutByHandler(handlerName);
  return shortcut ? getDisplayKey(shortcut.key) : undefined;
};