import { CommandAction, CommandContext } from '../types/commands';
import { commandRegistry } from '../utils/commandRegistry';
import { TFunction } from 'i18next';
import { getShortcutKey } from '../utils/keyboardShortcuts';
import logger from '../utils/logger';

// File Operations Commands
const createFileCommands = (t: TFunction): CommandAction[] => [
  {
    id: 'file.export.tasks',
    title: t('commandPalette.commands.file.exportTasks.title', 'Export Tasks'),
    description: t('commandPalette.commands.file.exportTasks.description', 'Export all tasks to TOML file'),
    category: 'file',
    keywords: ['export', 'save', 'toml', 'backup'],
    icon: 'download',
    execute: (context: CommandContext) => {
      context.onExportTasks();
    }
  },
  {
    id: 'file.import.tasks',
    title: t('commandPalette.commands.file.importTasks.title', 'Import Tasks'),
    description: t('commandPalette.commands.file.importTasks.description', 'Import tasks from TOML file'),
    category: 'file',
    keywords: ['import', 'load', 'toml', 'restore'],
    icon: 'upload',
    execute: (context: CommandContext) => {
      context.onImportTasks();
    }
  }
];

// View Commands
const createViewCommands = (t: TFunction): CommandAction[] => [
  {
    id: 'view.tasks.detailed',
    title: t('commandPalette.commands.view.switchToTasks.title', 'Switch to Tasks View (Detailed)'),
    description: t('commandPalette.commands.view.switchToTasks.description', 'Switch to detailed tasks management view'),
    category: 'view',
    keywords: ['tasks', 'todo', 'switch', 'detailed'],
    icon: 'list',
    execute: (context: CommandContext) => {
      context.onViewChange('tasks-detailed');
    },
    isEnabled: () => true,
    isVisible: (context?: CommandContext) => context?.startupView !== 'tasks-detailed'
  },
  {
    id: 'view.tasks.simple',
    title: t('commandPalette.commands.view.switchToTasks.title', 'Switch to Tasks View (Simple)'),
    description: t('commandPalette.commands.view.switchToTasks.description', 'Switch to simple tasks management view'),
    category: 'view',
    keywords: ['tasks', 'todo', 'switch', 'simple', 'compact'],
    icon: 'list',
    execute: (context: CommandContext) => {
      context.onViewChange('tasks-simple');
    },
    isEnabled: () => true,
    isVisible: (context?: CommandContext) => context?.startupView !== 'tasks-simple'
  },
  {
    id: 'view.schedules',
    title: t('commandPalette.commands.view.switchToSchedules.title', 'Switch to Schedules View'),
    description: t('commandPalette.commands.view.switchToSchedules.description', 'Switch to schedules management view'),
    category: 'view',
    keywords: ['schedules', 'calendar', 'switch'],
    icon: 'calendar',
    execute: (context: CommandContext) => {
      context.onViewChange('schedules');
    },
    isEnabled: () => true,
    isVisible: (context?: CommandContext) => context?.startupView !== 'schedules'
  },
  {
    id: 'view.toggle.dark',
    title: t('commandPalette.commands.view.toggleDarkMode.title', 'Toggle Dark Mode'),
    description: t('commandPalette.commands.view.toggleDarkMode.description', 'Switch between light and dark themes'),
    category: 'view',
    keywords: ['dark', 'light', 'theme', 'mode'],
    icon: 'moon',
    execute: (context: CommandContext) => {
      context.onToggleDarkMode();
    }
  },
  {
    id: 'view.toggle.slim',
    title: t('commandPalette.commands.view.toggleSlimMode.title', 'Toggle Slim Mode'),
    description: t('commandPalette.commands.view.toggleSlimMode.description', 'Switch between detailed and compact view'),
    category: 'view',
    keywords: ['slim', 'compact', 'detailed', 'mode'],
    icon: 'minimize',
    execute: (context: CommandContext) => {
      context.onToggleSlimMode();
    }
  },
  {
    id: 'view.toggle.alwaysOnTop',
    title: t('commandPalette.commands.view.toggleAlwaysOnTop.title', 'Toggle Always on Top'),
    description: t('commandPalette.commands.view.toggleAlwaysOnTop.description', 'Keep window always on top of other windows'),
    category: 'view',
    keywords: ['always', 'top', 'window', 'float'],
    icon: 'pin',
    execute: (context: CommandContext) => {
      context.onToggleAlwaysOnTop();
    }
  }
];

// Task Commands
const createTaskCommands = (t: TFunction): CommandAction[] => [
  {
    id: 'task.new',
    title: t('commandPalette.commands.task.newTask.title', 'New Task'),
    description: t('commandPalette.commands.task.newTask.description', 'Create a new task'),
    category: 'task',
    keywords: ['new', 'create', 'add', 'task'],
    keybinding: getShortcutKey('onNewTask'),
    icon: 'plus',
    execute: (context: CommandContext) => {
      context.onNewTask();
    }
  },
  {
    id: 'task.selectAll',
    title: t('commandPalette.commands.task.selectAll.title', 'Select All Tasks'),
    description: t('commandPalette.commands.task.selectAll.description', 'Select all visible tasks'),
    category: 'task',
    keywords: ['select', 'all', 'tasks'],
    keybinding: getShortcutKey('onSelectAll'),
    icon: 'check-square',
    execute: (context: CommandContext) => {
      context.onSelectAll();
    },
    isVisible: (context?: CommandContext) => context?.startupView === 'tasks-detailed' || context?.startupView === 'tasks-simple'
  },
  {
    id: 'task.clearSelection',
    title: t('commandPalette.commands.task.clearSelection.title', 'Clear Selection'),
    description: t('commandPalette.commands.task.clearSelection.description', 'Clear all selected tasks'),
    category: 'task',
    keywords: ['clear', 'deselect', 'selection'],
    keybinding: getShortcutKey('onClearSelection'),
    icon: 'x',
    execute: (context: CommandContext) => {
      context.onClearSelection();
    },
    isEnabled: (context?: CommandContext) => (context?.selectedTasks.size || 0) > 0,
    isVisible: (context?: CommandContext) => context?.startupView === 'tasks-detailed' || context?.startupView === 'tasks-simple'
  },
  {
    id: 'task.deleteSelected',
    title: t('commandPalette.commands.task.deleteSelected.title', 'Delete Selected Tasks'),
    description: t('commandPalette.commands.task.deleteSelected.description', 'Delete all selected tasks'),
    category: 'task',
    keywords: ['delete', 'remove', 'selected'],
    keybinding: getShortcutKey('onDeleteSelected'),
    icon: 'trash',
    execute: (context: CommandContext) => {
      context.onDeleteSelected();
    },
    isEnabled: (context?: CommandContext) => (context?.selectedTasks.size || 0) > 0,
    isVisible: (context?: CommandContext) => context?.startupView === 'tasks-detailed' || context?.startupView === 'tasks-simple'
  },
  {
    id: 'task.editSelected',
    title: t('commandPalette.commands.task.editSelected.title', 'Edit Selected Task'),
    description: t('commandPalette.commands.task.editSelected.description', 'Edit the selected task'),
    category: 'task',
    keywords: ['edit', 'modify', 'selected'],
    keybinding: getShortcutKey('onEditSelected'),
    icon: 'edit',
    execute: (context: CommandContext) => {
      context.onEditSelected();
    },
    isEnabled: (context?: CommandContext) => (context?.selectedTasks.size || 0) === 1,
    isVisible: (context?: CommandContext) => context?.startupView === 'tasks-detailed' || context?.startupView === 'tasks-simple'
  },
  {
    id: 'task.toggleCompletion',
    title: t('commandPalette.commands.task.toggleCompletion.title', 'Toggle Task Completion'),
    description: t('commandPalette.commands.task.toggleCompletion.description', 'Mark selected tasks as complete/incomplete'),
    category: 'task',
    keywords: ['complete', 'done', 'finish', 'toggle'],
    keybinding: getShortcutKey('onToggleSelectedCompletion'),
    icon: 'check',
    execute: (context: CommandContext) => {
      context.onToggleSelectedCompletion();
    },
    isEnabled: (context?: CommandContext) => (context?.selectedTasks.size || 0) > 0,
    isVisible: (context?: CommandContext) => context?.startupView === 'tasks-detailed' || context?.startupView === 'tasks-simple'
  }
];

// Search Commands
const createSearchCommands = (t: TFunction): CommandAction[] => [
  {
    id: 'search.toggle',
    title: t('commandPalette.commands.search.toggleSearch.title', 'Toggle Search'),
    description: t('commandPalette.commands.search.toggleSearch.description', 'Show or hide the search bar'),
    category: 'search',
    keywords: ['search', 'find', 'toggle', 'show', 'hide'],
    keybinding: getShortcutKey('onToggleSearch'),
    icon: 'search',
    execute: (context: CommandContext) => {
      context.onToggleSearch();
    }
  },
  {
    id: 'search.toggleFilter',
    title: t('commandPalette.commands.search.toggleFilter.title', 'Toggle Filter'),
    description: t('commandPalette.commands.search.toggleFilter.description', 'Show or hide the filter options'),
    category: 'search',
    keywords: ['filter', 'toggle', 'show', 'hide', 'status'],
    keybinding: getShortcutKey('onToggleFilter'),
    icon: 'filter',
    execute: (context: CommandContext) => {
      context.onToggleFilter();
    }
  },
  {
    id: 'search.focus',
    title: t('commandPalette.commands.search.focusSearch.title', 'Focus Search'),
    description: t('commandPalette.commands.search.focusSearch.description', 'Focus on the search input field'),
    category: 'search',
    keywords: ['search', 'find', 'filter', 'focus'],
    keybinding: getShortcutKey('onFocusSearch'),
    icon: 'search',
    execute: (context: CommandContext) => {
      context.onFocusSearch();
    }
  },
  {
    id: 'search.toggleCaseSensitive',
    title: t('commandPalette.commands.search.toggleCaseSensitive.title', 'Toggle Case Sensitive'),
    description: t('commandPalette.commands.search.toggleCaseSensitive.description', 'Toggle case sensitive search'),
    category: 'search',
    keywords: ['case', 'sensitive', 'toggle', 'search'],
    keybinding: getShortcutKey('onToggleCaseSensitive'),
    icon: 'type',
    execute: (context: CommandContext) => {
      context.onToggleCaseSensitive();
    }
  },
  {
    id: 'search.toggleRegex',
    title: t('commandPalette.commands.search.toggleRegex.title', 'Toggle Regex Mode'),
    description: t('commandPalette.commands.search.toggleRegex.description', 'Toggle regular expression search'),
    category: 'search',
    keywords: ['regex', 'regular', 'expression', 'toggle', 'search'],
    keybinding: getShortcutKey('onToggleRegex'),
    icon: 'code',
    execute: (context: CommandContext) => {
      context.onToggleRegex();
    }
  },
  {
    id: 'search.toggleWholeWord',
    title: t('commandPalette.commands.search.toggleWholeWord.title', 'Toggle Whole Word'),
    description: t('commandPalette.commands.search.toggleWholeWord.description', 'Toggle whole word search'),
    category: 'search',
    keywords: ['whole', 'word', 'toggle', 'search'],
    keybinding: getShortcutKey('onToggleWholeWord'),
    icon: 'type',
    execute: (context: CommandContext) => {
      context.onToggleWholeWord();
    }
  }
];

// Settings Commands
const createSettingsCommands = (t: TFunction): CommandAction[] => [
  {
    id: 'settings.open',
    title: t('commandPalette.commands.settings.openSettings.title', 'Open Settings'),
    description: t('commandPalette.commands.settings.openSettings.description', 'Open application settings'),
    category: 'settings',
    keywords: ['settings', 'preferences', 'config'],
    keybinding: getShortcutKey('onToggleSettings'),
    icon: 'settings',
    execute: (context: CommandContext) => {
      context.onToggleSettings();
    }
  },
  {
    id: 'help.shortcuts',
    title: t('commandPalette.commands.settings.showShortcuts.title', 'Show Keyboard Shortcuts'),
    description: t('commandPalette.commands.settings.showShortcuts.description', 'Display all keyboard shortcuts'),
    category: 'settings',
    keywords: ['help', 'shortcuts', 'keys', 'hotkeys'],
    keybinding: getShortcutKey('onShowHelp'),
    icon: 'keyboard',
    execute: (context: CommandContext) => {
      context.onShowHelp();
    }
  }
];

// Register all default commands
export function registerDefaultCommands(t: TFunction): void {
  const fileCommands = createFileCommands(t);
  const viewCommands = createViewCommands(t);
  const taskCommands = createTaskCommands(t);
  const searchCommands = createSearchCommands(t);
  const settingsCommands = createSettingsCommands(t);

  const allCommands = [
    ...fileCommands,
    ...viewCommands,
    ...taskCommands,
    ...searchCommands,
    ...settingsCommands
  ];

  logger.debug(`Registering ${allCommands.length} default commands`);
  
  for (const command of allCommands) {
    commandRegistry.register(command);
  }
  
  logger.debug('Default commands registration completed');
}

// Export command creation functions for testing and reference
export {
  createFileCommands,
  createViewCommands,
  createTaskCommands,
  createSearchCommands,
  createSettingsCommands
};