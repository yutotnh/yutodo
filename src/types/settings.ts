// File-based settings type definitions

export interface AppSettingsFile {
  // Application settings
  app: {
    theme: 'auto' | 'light' | 'dark';
    language: 'auto' | 'en' | 'ja';
    startupAlwaysOnTop: boolean;
    confirmDelete: boolean;
    startupView: 'tasks-detailed' | 'tasks-simple' | 'schedules';
  };
  
  // Server settings
  server: {
    url: string;
    reconnectInterval: number;
    timeout: number;
  };
  
  // UI settings
  ui: {
    autoHideHeader: boolean;
    fontSize: number;
    fontFamily: string;
  };
  
  // Appearance settings
  appearance: {
    customCss: string;
  };
}

export interface Keybinding {
  key: string;          // e.g., "Ctrl+N", "Cmd+Shift+P"
  command: string;      // e.g., "newTask", "openCommandPalette"
  when?: string;        // e.g., "!inputFocus && taskSelected"
  args?: Record<string, any>;  // Optional arguments for the command
}

export interface KeybindingsFile {
  keybindings: Keybinding[];
}

// File paths configuration
export interface SettingsPaths {
  settingsFile: string;
  keybindingsFile: string;
  settingsSchema: string;
  keybindingsSchema: string;
  backupDir: string;
}

// Events for settings changes
export interface SettingsChangeEvent {
  type: 'settings' | 'keybindings';
  previous: AppSettingsFile | Keybinding[];
  current: AppSettingsFile | Keybinding[];
  source: 'file' | 'app';
}

// Default settings
export const DEFAULT_APP_SETTINGS: AppSettingsFile = {
  app: {
    theme: 'auto',
    language: 'auto',
    startupAlwaysOnTop: false,
    confirmDelete: true,
    startupView: 'tasks-detailed'
  },
  server: {
    url: 'http://localhost:3001',
    reconnectInterval: 5000,
    timeout: 30000
  },
  ui: {
    autoHideHeader: true,
    fontSize: 14,
    fontFamily: 'Inter, sans-serif'
  },
  appearance: {
    customCss: ''
  }
};

// Default keybindings
export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // Global commands
  { key: 'Ctrl+Shift+P', command: 'openCommandPalette' },
  { key: 'Ctrl+N', command: 'newTask', when: '!inputFocus' },
  { key: 'Ctrl+,', command: 'openSettings' },
  { key: 'Ctrl+F', command: 'toggleSearch' },
  { key: 'Ctrl+Shift+F', command: 'toggleFilter' },
  { key: 'Alt+C', command: 'toggleCaseSensitive' },
  { key: 'Alt+R', command: 'toggleRegex' },
  { key: 'Alt+W', command: 'toggleWholeWord' },
  { key: 'Ctrl+K Ctrl+S', command: 'showKeybindings' },
  
  // Task commands
  { key: 'Ctrl+A', command: 'selectAll', when: '!inputFocus' },
  { key: 'Ctrl+D', command: 'toggleTaskComplete', when: 'taskSelected && !inputFocus' },
  { key: 'Delete', command: 'deleteSelected', when: 'taskSelected && !inputFocus' },
  { key: 'F2', command: 'editTask', when: 'taskSelected && !inputFocus' },
  { key: 'E', command: 'editTask', when: 'taskSelected && !inputFocus' },
  { key: 'Enter', command: 'confirmEdit', when: 'editing' },
  { key: 'Escape', command: 'cancelAction' },
  
  // Navigation
  { key: 'ArrowDown', command: 'nextTask', when: '!inputFocus && !editing' },
  { key: 'ArrowUp', command: 'previousTask', when: '!inputFocus && !editing' },
  { key: 'Home', command: 'firstTask', when: '!inputFocus && !editing' },
  { key: 'End', command: 'lastTask', when: '!inputFocus && !editing' },
  
  // View commands
  { key: 'Ctrl+1', command: 'showTasksDetailed' },
  { key: 'Ctrl+2', command: 'showTasksSimple' },
  { key: 'Ctrl+3', command: 'showSchedules' },
  
  // Help
  { key: 'F1', command: 'showHelp' }
];

// Error types
export interface ParseErrorDetails {
  line?: number;
  column?: number;
  problemText?: string;
  expectedFormat?: string;
  suggestion?: string;
}

export interface SettingsFileError {
  type: 'settings' | 'keybindings';
  code: 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'FILE_ERROR' | 'PERMISSION_ERROR';
  message: string;
  userMessage: string;
  filePath: string;
  details?: ParseErrorDetails;
  severity: 'error' | 'warning' | 'info';
}

export class SettingsError extends Error {
  constructor(
    message: string,
    public code: 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'FILE_ERROR' | 'PERMISSION_ERROR',
    public filePath?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SettingsError';
  }
}