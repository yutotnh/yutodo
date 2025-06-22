import { AppSettingsFile, Keybinding, SettingsPaths, SettingsChangeEvent, DEFAULT_APP_SETTINGS, DEFAULT_KEYBINDINGS, SettingsError } from '../types/settings';
import { exists, readTextFile, writeTextFile, mkdir, watch, BaseDirectory } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { parse as parseToml } from '@ltd/j-toml';
import logger from '../utils/logger';

/**
 * Settings Manager for VS Code-style configuration
 * Handles separate settings.toml and keybindings.toml files
 * with hot reload and comment preservation
 */
export class SettingsManager {
  private static instance: SettingsManager;
  
  private settings: AppSettingsFile = DEFAULT_APP_SETTINGS;
  private keybindings: Keybinding[] = DEFAULT_KEYBINDINGS;
  private paths: SettingsPaths | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;
  
  // Tauri v2 file watchers (UnwatchFn type)
  private settingsWatcher: (() => void) | null = null;
  private keybindingsWatcher: (() => void) | null = null;
  
  private listeners = new Set<(event: SettingsChangeEvent) => void>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  // For comment preservation
  private settingsFileContent: string = '';
  private keybindingsFileContent: string = '';
  
  private constructor() {}
  
  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }
  
  /**
   * Wait for Tauri APIs to be ready
   */
  private async waitForTauriAPIs(): Promise<void> {
    const maxAttempts = 10;
    const delay = 500; // 500ms
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check if Tauri environment is available
        if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
          throw new Error('Tauri environment not detected');
        }
        
        // Test basic Tauri API availability
        await appDataDir();
        logger.info(`✅ Tauri APIs ready after ${attempt} attempts`);
        return;
      } catch (error) {
        logger.debug(`⏳ Tauri APIs not ready (attempt ${attempt}/${maxAttempts}):`, error);
        
        if (attempt === maxAttempts) {
          throw new Error(`Tauri APIs not available after ${maxAttempts} attempts: ${error}`);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Initialize the settings manager
   */
  async initialize(): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.isInitialized) {
      logger.info('SettingsManager already initialized');
      return;
    }
    
    if (this.initializationError) {
      logger.warn('SettingsManager previously failed to initialize:', this.initializationError);
      throw this.initializationError;
    }
    
    logger.info('Initializing SettingsManager...');
    
    // Wait for Tauri APIs to be ready
    logger.info('🔄 Waiting for Tauri APIs to be ready...');
    try {
      await this.waitForTauriAPIs();
    } catch (error) {
      logger.error('❌ Tauri APIs are not available:', error);
      throw error;
    }
    
    try {
      // Setup paths
      logger.info('Step 1: Setting up paths...');
      await this.setupPaths();
      
      if (!this.paths) {
        throw new Error('Failed to setup paths - paths is null after setupPaths()');
      }
      
      logger.info('Paths setup completed:', this.paths);
      
      // Ensure directories exist
      logger.info('Step 2: Ensuring directories exist...');
      await this.ensureDirectories();
      logger.info('Directories ensured');
      
      // Load or create default files
      logger.info('Step 3: Loading or creating settings...');
      await this.loadOrCreateSettings();
      logger.info('Settings loaded/created');
      
      logger.info('Step 4: Loading or creating keybindings...');
      await this.loadOrCreateKeybindings();
      logger.info('Keybindings loaded/created');
      
      // Mark as initialized (file watching will be started separately)
      this.isInitialized = true;
      logger.info('🎉 SettingsManager core initialization completed successfully');
      
      // Start file watchers with delay for Tauri API stabilization
      logger.info('Step 5: Scheduling file watchers initialization...');
      setTimeout(async () => {
        try {
          logger.info('🔄 Starting Tauri v2 file watchers for real-time changes...');
          await this.startWatching();
          logger.info('✅ File watchers initialization completed successfully');
          logger.info('👁️ File watching now active - Settings:', !!this.settingsWatcher, 'Keybindings:', !!this.keybindingsWatcher);
        } catch (watchError) {
          logger.error('❌ File watchers initialization failed:', watchError);
          logger.warn('File watching disabled - changes will not be auto-detected');
        }
      }, 2000); // 2 second delay
    } catch (error) {
      this.initializationError = error as Error;
      logger.error('Failed to initialize SettingsManager:', error);
      logger.error('Current paths state:', this.paths);
      logger.error('Will not retry initialization until restart');
      
      throw new SettingsError(
        'Failed to initialize settings manager',
        'FILE_ERROR',
        undefined,
        error
      );
    }
  }
  
  /**
   * Setup file paths based on OS
   */
  private async setupPaths(): Promise<void> {
    try {
      logger.info('Checking Tauri API availability...');
      
      // Check if we're in Tauri environment
      if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
        throw new Error('Not running in Tauri environment - cannot access file system APIs');
      }
      
      logger.info('Tauri environment confirmed, getting app data directory...');
      
      let dataDir: string;
      try {
        dataDir = await appDataDir();
        logger.info('App data directory retrieved successfully:', dataDir);
      } catch (error) {
        logger.error('Failed to get app data directory:', error);
        logger.error('Error details:', {
          message: (error as Error).message,
          stack: (error as Error).stack,
          name: (error as Error).name
        });
        throw new Error(`Failed to access app data directory: ${(error as Error).message}`);
      }
      
      if (!dataDir || typeof dataDir !== 'string') {
        throw new Error(`Invalid app data directory received: ${dataDir}`);
      }
      
      logger.info('Creating config directory path...');
      let configDir: string;
      try {
        configDir = await join(dataDir, 'YuToDo');
        logger.info('Config directory path created:', configDir);
      } catch (error) {
        logger.error('Failed to create config directory path:', error);
        throw new Error(`Failed to join paths: ${(error as Error).message}`);
      }
      
      logger.info('Setting up all file paths...');
      try {
        this.paths = {
          settingsFile: await join(configDir, 'settings.toml'),
          keybindingsFile: await join(configDir, 'keybindings.toml'),
          settingsSchema: await join(configDir, 'settings.schema.json'),
          keybindingsSchema: await join(configDir, 'keybindings.schema.json'),
          backupDir: await join(configDir, 'backups')
        };
        
        logger.info('All file paths configured successfully:', this.paths);
      } catch (error) {
        logger.error('Failed to create file paths:', error);
        throw new Error(`Failed to setup file paths: ${(error as Error).message}`);
      }
      
    } catch (error) {
      logger.error('setupPaths() failed with error:', error);
      logger.error('Error type:', typeof error);
      logger.error('Error constructor:', error?.constructor?.name);
      
      // Ensure paths remains null on failure
      this.paths = null;
      throw error;
    }
  }
  
  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot ensure directories: paths not initialized');
    }
    
    const dirs = [
      await appDataDir(),
      await join(await appDataDir(), 'YuToDo'),
      this.paths.backupDir
    ];
    
    for (const dir of dirs) {
      if (!await exists(dir)) {
        await mkdir(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    }
  }
  
  /**
   * Load or create settings file
   */
  private async loadOrCreateSettings(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot load settings: paths not initialized');
    }
    
    try {
      if (await exists(this.paths.settingsFile)) {
        this.settingsFileContent = await readTextFile(this.paths.settingsFile);
        logger.debug('Settings file content length:', this.settingsFileContent.length);
        logger.debug('Settings file last 100 chars:', JSON.stringify(this.settingsFileContent.slice(-100)));
        logger.debug('About to parse TOML with joiner option...');
        
        let parsed: any;
        try {
          parsed = parseToml(this.settingsFileContent, { 
            joiner: '\n'
          }) as any;
          logger.debug('TOML parsing successful in SettingsManager');
        } catch (parseError) {
          logger.error('TOML parsing failed in SettingsManager:', parseError);
          logger.error('Problematic content around error:', this.settingsFileContent.split('\n').slice(45, 52));
          throw parseError;
        }
        this.settings = this.mergeWithDefaults(parsed, DEFAULT_APP_SETTINGS);
        logger.info('Settings loaded from file');
      } else {
        // Create default settings file
        await this.createDefaultSettingsFile();
        logger.info('Created default settings file');
      }
    } catch (error) {
      logger.error('Error loading settings:', error);
      throw new SettingsError(
        'Failed to load settings',
        'PARSE_ERROR',
        this.paths.settingsFile,
        error
      );
    }
  }
  
  /**
   * Load or create keybindings file
   */
  private async loadOrCreateKeybindings(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot load keybindings: paths not initialized');
    }
    
    try {
      if (await exists(this.paths.keybindingsFile)) {
        this.keybindingsFileContent = await readTextFile(this.paths.keybindingsFile);
        const parsed = parseToml(this.keybindingsFileContent, { 
          joiner: '\n'
        }) as any;
        this.keybindings = this.parseKeybindings(parsed);
        logger.info('Keybindings loaded from file');
      } else {
        // Create default keybindings file
        await this.createDefaultKeybindingsFile();
        logger.info('Created default keybindings file');
      }
    } catch (error) {
      logger.error('Error loading keybindings:', error);
      throw new SettingsError(
        'Failed to load keybindings',
        'PARSE_ERROR',
        this.paths.keybindingsFile,
        error
      );
    }
  }
  
  /**
   * Create default settings file with comments
   */
  private async createDefaultSettingsFile(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot create settings file: paths not initialized');
    }
    
    const content = `# YuToDo Settings
# This file is automatically reloaded when changed
# Generated: ${new Date().toISOString()}

[app]
# Theme: "auto" | "light" | "dark"
theme = "auto"

# Language: "auto" | "en" | "ja"
language = "auto"

# Window always on top
alwaysOnTop = false

# Show detailed mode with descriptions
detailedMode = false

# Confirm before deleting tasks
confirmDelete = true

# Current view: "tasks" | "schedules"
currentView = "tasks"

[server]
# Backend server URL
url = "http://localhost:3001"

# Reconnection interval in milliseconds
reconnectInterval = 5000

# Request timeout in milliseconds
timeout = 30000

[ui]
# Auto-hide header when mouse leaves
autoHideHeader = true

# Font size in pixels
fontSize = 14

# Font family (CSS font-family format)
fontFamily = "Inter, sans-serif"

[appearance]
# Custom CSS styles
customCss = ""
`;
    
    await writeTextFile(this.paths.settingsFile, content);
    this.settingsFileContent = content;
    this.settings = DEFAULT_APP_SETTINGS;
  }
  
  /**
   * Create default keybindings file with comments
   */
  private async createDefaultKeybindingsFile(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot create keybindings file: paths not initialized');
    }
    
    const content = `# YuToDo Keyboard Shortcuts
# This file is automatically reloaded when changed
# Generated: ${new Date().toISOString()}
#
# Format:
# [[keybindings]]
# key = "Ctrl+N"              # Key combination
# command = "newTask"         # Command to execute
# when = "!inputFocus"        # Optional: condition for the keybinding
# args = { position = "end" } # Optional: arguments for the command

# =====================================
# Global Commands
# =====================================

[[keybindings]]
key = "Ctrl+Shift+P"
command = "openCommandPalette"

[[keybindings]]
key = "Ctrl+N"
command = "newTask"
when = "!inputFocus"

[[keybindings]]
key = "Ctrl+,"
command = "openSettings"

[[keybindings]]
key = "Ctrl+F"
command = "focusSearch"
when = "!inputFocus"

[[keybindings]]
key = "Ctrl+K Ctrl+S"
command = "showKeybindings"

# =====================================
# Task Commands
# =====================================

[[keybindings]]
key = "Ctrl+A"
command = "selectAll"
when = "!inputFocus"

[[keybindings]]
key = "Ctrl+D"
command = "toggleTaskComplete"
when = "taskSelected && !inputFocus"

[[keybindings]]
key = "Delete"
command = "deleteSelected"
when = "taskSelected && !inputFocus"

[[keybindings]]
key = "F2"
command = "editTask"
when = "taskSelected && !inputFocus"

[[keybindings]]
key = "E"
command = "editTask"
when = "taskSelected && !inputFocus"

[[keybindings]]
key = "Enter"
command = "confirmEdit"
when = "editing"

[[keybindings]]
key = "Escape"
command = "cancelAction"

# =====================================
# Navigation
# =====================================

[[keybindings]]
key = "ArrowDown"
command = "nextTask"
when = "!inputFocus && !editing"

[[keybindings]]
key = "ArrowUp"
command = "previousTask"
when = "!inputFocus && !editing"

[[keybindings]]
key = "Home"
command = "firstTask"
when = "!inputFocus && !editing"

[[keybindings]]
key = "End"
command = "lastTask"
when = "!inputFocus && !editing"

# =====================================
# View Commands
# =====================================

[[keybindings]]
key = "Ctrl+1"
command = "showTasks"

[[keybindings]]
key = "Ctrl+2"
command = "showSchedules"

# =====================================
# Help
# =====================================

[[keybindings]]
key = "F1"
command = "showHelp"

# =====================================
# User Custom Keybindings
# =====================================
# Add your custom keybindings below
`;
    
    await writeTextFile(this.paths.keybindingsFile, content);
    this.keybindingsFileContent = content;
    this.keybindings = DEFAULT_KEYBINDINGS;
  }
  
  /**
   * Start watching files for changes with Tauri v2 API
   */
  private async startWatching(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot start watching: paths not initialized');
    }
    
    logger.info('🔍 Setting up Tauri v2 file watchers...');
    logger.info('📁 Settings file path:', this.paths.settingsFile);
    logger.info('📁 Keybindings file path:', this.paths.keybindingsFile);
    
    // Check if files exist before watching
    const settingsExists = await exists(this.paths.settingsFile);
    const keybindingsExists = await exists(this.paths.keybindingsFile);
    logger.info('📄 Settings file exists:', settingsExists);
    logger.info('📄 Keybindings file exists:', keybindingsExists);
    
    if (!settingsExists) {
      throw new Error('Settings file does not exist - cannot watch');
    }
    
    try {
      // Watch settings file using BaseDirectory.AppData and relative path
      logger.info('👀 Starting watch for settings file...');
      this.settingsWatcher = await watch(
        'YuToDo/settings.toml',
        (event) => {
          logger.info('🔥 Settings file changed! Event:', event);
          logger.info('📝 Triggering settings reload...');
          this.handleFileChange('settings');
        },
        {
          baseDir: BaseDirectory.AppData,
          delayMs: 300
        }
      );
      logger.info('✅ Settings file watcher started successfully');
      
      // Watch keybindings file (optional)
      if (keybindingsExists) {
        logger.info('👀 Starting watch for keybindings file...');
        try {
          this.keybindingsWatcher = await watch(
            'YuToDo/keybindings.toml',
            (event) => {
              logger.info('🔥 Keybindings file changed! Event:', event);
              logger.info('⌨️ Triggering keybindings reload...');
              this.handleFileChange('keybindings');
            },
            {
              baseDir: BaseDirectory.AppData,
              delayMs: 300
            }
          );
          logger.info('✅ Keybindings file watcher started successfully');
        } catch (error) {
          logger.warn('⚠️ Failed to start keybindings file watcher:', error);
          logger.warn('Continuing with settings watching only');
        }
      } else {
        logger.info('📄 Keybindings file does not exist - skipping keybindings watcher');
      }
      
      logger.info('🎉 File watchers initialization completed!');
      logger.info('👁️ Active watchers - Settings:', !!this.settingsWatcher, 'Keybindings:', !!this.keybindingsWatcher);
    } catch (error) {
      logger.error('❌ Failed to start file watchers:', error);
      throw error;
    }
  }

  /**
   * Restart a specific watcher to address one-shot behavior
   */
  private async restartWatcher(type: 'settings' | 'keybindings'): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot restart watcher: paths not initialized');
    }

    try {
      if (type === 'settings') {
        // Stop existing watcher if running
        if (this.settingsWatcher) {
          try {
            this.settingsWatcher();
            logger.debug('🛑 Stopped existing settings watcher');
          } catch (error) {
            logger.debug('⚠️ Error stopping existing settings watcher (may already be stopped):', error);
          }
          this.settingsWatcher = null;
        }

        // Restart settings watcher
        logger.info('👀 Restarting settings file watcher...');
        this.settingsWatcher = await watch(
          'YuToDo/settings.toml',
          (event) => {
            logger.info('🔥 Settings file changed! Event:', event);
            logger.info('📝 Triggering settings reload...');
            this.handleFileChange('settings');
          },
          {
            baseDir: BaseDirectory.AppData,
            delayMs: 300
          }
        );
        logger.info('✅ Settings file watcher restarted successfully');

      } else if (type === 'keybindings') {
        // Stop existing watcher if running
        if (this.keybindingsWatcher) {
          try {
            this.keybindingsWatcher();
            logger.debug('🛑 Stopped existing keybindings watcher');
          } catch (error) {
            logger.debug('⚠️ Error stopping existing keybindings watcher (may already be stopped):', error);
          }
          this.keybindingsWatcher = null;
        }

        // Check if keybindings file exists before restarting watcher
        const keybindingsExists = await exists(this.paths.keybindingsFile);
        if (keybindingsExists) {
          logger.info('👀 Restarting keybindings file watcher...');
          this.keybindingsWatcher = await watch(
            'YuToDo/keybindings.toml',
            (event) => {
              logger.info('🔥 Keybindings file changed! Event:', event);
              logger.info('⌨️ Triggering keybindings reload...');
              this.handleFileChange('keybindings');
            },
            {
              baseDir: BaseDirectory.AppData,
              delayMs: 300
            }
          );
          logger.info('✅ Keybindings file watcher restarted successfully');
        } else {
          logger.info('📄 Keybindings file does not exist - skipping watcher restart');
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to restart ${type} watcher:`, error);
      throw error;
    }
  }
  
  /**
   * Handle file change events
   */
  private handleFileChange(type: 'settings' | 'keybindings'): void {
    logger.info(`🔄 File change detected for ${type}`);
    
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(type);
    if (existingTimer) {
      logger.debug(`⏰ Clearing existing debounce timer for ${type}`);
      clearTimeout(existingTimer);
    }
    
    // Set new debounce timer
    logger.debug(`⏲️ Setting debounce timer for ${type} (100ms)`);
    const timer = setTimeout(async () => {
      logger.info(`🚀 Debounce timer fired - reloading ${type}...`);
      try {
        if (type === 'settings') {
          await this.reloadSettings();
          logger.info('✅ Settings reload completed');
        } else {
          await this.reloadKeybindings();
          logger.info('✅ Keybindings reload completed');
        }
        
        // 🔄 Critical: Restart watcher after file processing
        logger.info('🔄 Restarting file watcher to ensure continued monitoring...');
        await this.restartWatcher(type);
        logger.info('✅ File watcher restarted successfully');
      } catch (error) {
        logger.error(`❌ Error reloading ${type}:`, error);
        
        // Try to restart watcher even on error
        try {
          logger.warn('⚠️ Attempting to restart watcher after error...');
          await this.restartWatcher(type);
          logger.info('✅ File watcher restarted after error');
        } catch (restartError) {
          logger.error('❌ Failed to restart watcher after error:', restartError);
        }
      }
      
      this.debounceTimers.delete(type);
      logger.debug(`🧹 Debounce timer cleaned up for ${type}`);
    }, 100);
    
    this.debounceTimers.set(type, timer);
    logger.debug(`⏱️ Debounce timer set for ${type}`);
  }
  
  /**
   * Reload settings from file
   */
  private async reloadSettings(): Promise<void> {
    if (!this.paths) {
      logger.error('Cannot reload settings: paths not initialized');
      return;
    }
    
    logger.info('📖 Starting settings reload from file...');
    const previous = { ...this.settings };
    
    try {
      logger.debug('📄 Reading settings file:', this.paths.settingsFile);
      this.settingsFileContent = await readTextFile(this.paths.settingsFile);
      logger.debug('📏 Settings file content length:', this.settingsFileContent.length);
      
      logger.debug('🔍 Parsing TOML content...');
      const parsed = parseToml(this.settingsFileContent, { 
        joiner: '\n'
      }) as any;
      logger.debug('✅ TOML parsing successful');
      
      logger.debug('🔄 Merging with defaults...');
      this.settings = this.mergeWithDefaults(parsed, DEFAULT_APP_SETTINGS);
      logger.debug('✅ Settings merged successfully');
      
      logger.info('📢 Notifying listeners of settings change...');
      logger.debug('👥 Number of listeners:', this.listeners.size);
      
      // Notify listeners
      this.notifyListeners({
        type: 'settings',
        previous,
        current: this.settings,
        source: 'file'
      });
      
      logger.info('🎉 Settings reloaded from file successfully');
      logger.debug('🔧 New settings:', {
        theme: this.settings.app?.theme,
        language: this.settings.app?.language,
        detailedMode: this.settings.app?.detailedMode
      });
    } catch (error) {
      logger.error('❌ Failed to reload settings:', error);
    }
  }
  
  /**
   * Reload keybindings from file
   */
  private async reloadKeybindings(): Promise<void> {
    if (!this.paths) {
      logger.error('Cannot reload keybindings: paths not initialized');
      return;
    }
    
    const previous = [...this.keybindings];
    
    try {
      this.keybindingsFileContent = await readTextFile(this.paths.keybindingsFile);
      const parsed = parseToml(this.keybindingsFileContent, { 
        joiner: '\n'
      }) as any;
      this.keybindings = this.parseKeybindings(parsed);
      
      // Notify listeners
      this.notifyListeners({
        type: 'keybindings',
        previous,
        current: this.keybindings,
        source: 'file'
      });
      
      logger.info('Keybindings reloaded from file');
    } catch (error) {
      logger.error('Failed to reload keybindings:', error);
    }
  }
  
  /**
   * Parse keybindings from TOML
   */
  private parseKeybindings(parsed: any): Keybinding[] {
    if (!parsed.keybindings || !Array.isArray(parsed.keybindings)) {
      return DEFAULT_KEYBINDINGS;
    }
    
    return parsed.keybindings.map((kb: any) => ({
      key: kb.key || '',
      command: kb.command || '',
      when: kb.when,
      args: kb.args
    })).filter((kb: Keybinding) => kb.key && kb.command);
  }
  
  /**
   * Merge loaded settings with defaults
   */
  private mergeWithDefaults<T extends object>(loaded: any, defaults: T): T {
    const result = { ...defaults };
    
    const merge = (target: any, source: any) => {
      for (const key in source) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      }
    };
    
    merge(result, loaded);
    return result;
  }
  
  /**
   * Get current settings
   */
  getSettings(): AppSettingsFile {
    return { ...this.settings };
  }
  
  /**
   * Get current keybindings
   */
  getKeybindings(): Keybinding[] {
    return [...this.keybindings];
  }
  
  /**
   * Update settings preserving comments
   */
  async updateSettings(updates: Partial<AppSettingsFile>): Promise<void> {
    const previous = { ...this.settings };
    
    // Merge updates
    this.settings = this.mergeWithDefaults(updates, this.settings);
    
    // Update file preserving comments
    await this.updateSettingsFile();
    
    // Notify listeners
    this.notifyListeners({
      type: 'settings',
      previous,
      current: this.settings,
      source: 'app'
    });
  }
  
  /**
   * Update settings file preserving comments and structure
   */
  private async updateSettingsFile(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot update settings file: paths not initialized');
    }
    
    // Parse current file to preserve structure
    const lines = this.settingsFileContent.split('\n');
    const updatedLines: string[] = [];
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Preserve empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        updatedLines.push(line);
        continue;
      }
      
      // Handle section headers
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        updatedLines.push(line);
        continue;
      }
      
      // Handle key-value pairs
      const match = line.match(/^(\s*)([a-zA-Z_]+)\s*=\s*(.*)$/);
      if (match) {
        const [, indent, key] = match;
        const newValue = this.getSettingValue(currentSection, key);
        
        if (newValue !== undefined) {
          updatedLines.push(`${indent}${key} = ${this.formatTomlValue(newValue)}`);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }
    
    const newContent = updatedLines.join('\n');
    await writeTextFile(this.paths.settingsFile, newContent);
    this.settingsFileContent = newContent;
  }
  
  /**
   * Get setting value by path
   */
  private getSettingValue(section: string, key: string): any {
    const path = section.split('.');
    let current: any = this.settings;
    
    for (const part of path) {
      if (!current[part]) return undefined;
      current = current[part];
    }
    
    return current[key];
  }
  
  /**
   * Format value for TOML
   */
  private formatTomlValue(value: any): string {
    if (typeof value === 'string') {
      // Handle multiline strings
      if (value.includes('\n')) {
        return `"""\n${value}\n"""`;
      }
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    return JSON.stringify(value);
  }
  
  /**
   * Add keybinding
   */
  async addKeybinding(keybinding: Keybinding): Promise<void> {
    const previous = [...this.keybindings];
    
    // Remove existing binding for the same key
    this.keybindings = this.keybindings.filter(kb => kb.key !== keybinding.key);
    this.keybindings.push(keybinding);
    
    // Update file
    await this.updateKeybindingsFile();
    
    // Notify listeners
    this.notifyListeners({
      type: 'keybindings',
      previous,
      current: this.keybindings,
      source: 'app'
    });
  }
  
  /**
   * Remove keybinding
   */
  async removeKeybinding(key: string): Promise<void> {
    const previous = [...this.keybindings];
    
    this.keybindings = this.keybindings.filter(kb => kb.key !== key);
    
    // Update file
    await this.updateKeybindingsFile();
    
    // Notify listeners
    this.notifyListeners({
      type: 'keybindings',
      previous,
      current: this.keybindings,
      source: 'app'
    });
  }
  
  /**
   * Update keybindings file
   */
  private async updateKeybindingsFile(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot update keybindings file: paths not initialized');
    }
    
    // For now, regenerate the entire file
    // TODO: Implement comment preservation for keybindings
    const lines = [
      '# YuToDo Keyboard Shortcuts',
      '# This file is automatically reloaded when changed',
      `# Last modified: ${new Date().toISOString()}`,
      ''
    ];
    
    // Group keybindings by command prefix
    const groups = new Map<string, Keybinding[]>();
    
    for (const kb of this.keybindings) {
      const prefix = kb.command.split('.')[0] || 'global';
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix)!.push(kb);
    }
    
    // Write grouped keybindings
    for (const [group, bindings] of groups) {
      lines.push(`# ${group.charAt(0).toUpperCase() + group.slice(1)} Commands`);
      lines.push('');
      
      for (const kb of bindings) {
        lines.push('[[keybindings]]');
        lines.push(`key = "${kb.key}"`);
        lines.push(`command = "${kb.command}"`);
        if (kb.when) {
          lines.push(`when = "${kb.when}"`);
        }
        if (kb.args) {
          lines.push(`args = ${JSON.stringify(kb.args)}`);
        }
        lines.push('');
      }
    }
    
    const content = lines.join('\n');
    await writeTextFile(this.paths.keybindingsFile, content);
    this.keybindingsFileContent = content;
  }
  
  /**
   * Add change listener
   */
  onChange(listener: (event: SettingsChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners
   */
  private notifyListeners(event: SettingsChangeEvent): void {
    logger.info(`📣 Notifying ${this.listeners.size} listeners of ${event.type} change (source: ${event.source})`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const listener of this.listeners) {
      try {
        logger.debug('📞 Calling listener function...');
        listener(event);
        successCount++;
        logger.debug('✅ Listener called successfully');
      } catch (error) {
        errorCount++;
        logger.error('❌ Error in settings change listener:', error);
      }
    }
    
    logger.info(`📊 Listener notification completed - Success: ${successCount}, Errors: ${errorCount}`);
  }
  
  /**
   * Get settings file path
   */
  getSettingsPath(): string {
    if (!this.paths) {
      throw new Error('Settings path not available: SettingsManager not properly initialized');
    }
    return this.paths.settingsFile;
  }
  
  /**
   * Get keybindings file path
   */
  getKeybindingsPath(): string {
    if (!this.paths) {
      throw new Error('Keybindings path not available: SettingsManager not properly initialized');
    }
    return this.paths.keybindingsFile;
  }
  
  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Stop file watchers
    if (this.settingsWatcher) {
      try {
        this.settingsWatcher();
        this.settingsWatcher = null;
        logger.info('🛑 Settings file watcher stopped');
      } catch (error) {
        logger.error('❌ Error stopping settings watcher:', error);
      }
    }
    
    if (this.keybindingsWatcher) {
      try {
        this.keybindingsWatcher();
        this.keybindingsWatcher = null;
        logger.info('🛑 Keybindings file watcher stopped');
      } catch (error) {
        logger.error('❌ Error stopping keybindings watcher:', error);
      }
    }
    
    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    
    this.debounceTimers.clear();
    this.listeners.clear();
    
    logger.info('✅ SettingsManager disposed');
  }
}

// Export singleton instance
export const settingsManager = SettingsManager.getInstance();