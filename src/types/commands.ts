// Command Palette Types
export interface CommandAction {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  keywords?: string[];
  keybinding?: string;
  icon?: string;
  execute: (...args: any[]) => void | Promise<void>;
  isEnabled?: (context?: CommandContext) => boolean;
  isVisible?: (context?: CommandContext) => boolean;
}

export type CommandCategory = 
  | 'file'
  | 'view' 
  | 'task'
  | 'schedule'
  | 'search'
  | 'settings'
  | 'navigation';

export interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  filteredCommands: CommandAction[];
}

export interface CommandContext {
  // App state context for command execution
  startupView: 'tasks' | 'schedules';
  selectedTasks: Set<string>;
  searchQuery: string;
  settings: any;
  // Handler functions
  onNewTask: () => void;
  onToggleSettings: () => void;
  onFocusSearch: () => void;
  onToggleSearch: () => void;
  onToggleFilter: () => void;
  onToggleCaseSensitive: () => void;
  onToggleRegex: () => void;
  onToggleWholeWord: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onEditSelected: () => void;
  onToggleSelectedCompletion: () => void;
  onExportTasks: () => void;
  onImportTasks: () => void;
  onViewChange: (view: 'tasks' | 'schedules') => void;
  onToggleDarkMode: () => void;
  onToggleSlimMode: () => void;
  onToggleAlwaysOnTop: () => void;
  onShowHelp: () => void;
  // Schedule handlers
  onDeleteInactiveSchedules?: () => void;
  onCreateSchedule?: () => void;
}

export interface CommandRegistry {
  commands: Map<string, CommandAction>;
  register: (command: CommandAction) => void;
  unregister: (commandId: string) => void;
  getCommand: (commandId: string) => CommandAction | undefined;
  getAllCommands: () => CommandAction[];
  getFilteredCommands: (query: string, context?: CommandContext) => CommandAction[];
  executeCommand: (commandId: string, context: CommandContext, ...args: any[]) => Promise<void>;
}