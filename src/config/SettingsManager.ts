import { AppSettingsFile, Keybinding, SettingsPaths, SettingsChangeEvent, DEFAULT_APP_SETTINGS, DEFAULT_KEYBINDINGS, SettingsError } from '../types/settings';
// Tauri plugin-fs functions will be imported dynamically to avoid bundling conflicts
import { appDataDir, join, configDir, homeDir } from '@tauri-apps/api/path';
// @ltd/j-toml will be imported dynamically to avoid bundling conflicts
import logger from '../utils/logger';
import { checkTauriWatchAPI } from '../utils/checkTauriApis';
import { isWindows, isMac } from '../utils/osDetection';

/**
 * Settings Manager for VS Code-style configuration
 * Handles separate settings.toml and keybindings.toml files
 * with hot reload and comment preservation
 */
interface ParseError {
  type: 'settings' | 'keybindings';
  filePath: string;
  error: any;
  timestamp: number;
}

export class SettingsManager {
  private static instance: SettingsManager;
  
  private settings: AppSettingsFile = DEFAULT_APP_SETTINGS;
  private keybindings: Keybinding[] = DEFAULT_KEYBINDINGS;
  private paths: SettingsPaths | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;
  private parseErrors: ParseError[] = [];
  
  // Tauri v2 file watchers (UnwatchFn type)
  private settingsWatcher: (() => void) | null = null;
  private keybindingsWatcher: (() => void) | null = null;
  
  // Track watcher initialization to prevent multiple attempts
  private watchersInitialized: boolean = false;
  private watcherInitializationInProgress: boolean = false;
  
  // Track watcher restart attempts to prevent runaway restarts
  private watcherRestartCount = new Map<string, number>();
  private readonly MAX_WATCHER_RESTARTS = 3;
  
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
   * Reset singleton instance for testing
   * @internal Only for testing purposes
   */
  static resetInstance(): void {
    if (SettingsManager.instance) {
      SettingsManager.instance.dispose();
      SettingsManager.instance = null as any;
    }
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
        // Tauri APIs not ready yet
        
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
      logger.warn('SettingsManager previously failed to initialize, attempting retry:', this.initializationError);
      // Allow retry by clearing the error
      this.initializationError = null;
      // Reset watcher states on retry
      this.watchersInitialized = false;
      this.watcherInitializationInProgress = false;
    }
    
    logger.info('🚀 Initializing SettingsManager...');
    
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
      
      // Paths setup completed
      
      // Ensure directories exist
      logger.info('Step 2: Ensuring directories exist...');
      await this.ensureDirectories();
      // Directories ensured
      
      // Load or create default files
      logger.info('Step 3: Loading or creating settings...');
      await this.loadOrCreateSettings();
      logger.info('Settings loaded/created');
      
      logger.info('Step 5: Loading or creating keybindings...');
      await this.loadOrCreateKeybindings();
      logger.info('Keybindings loaded/created');
      
      // Mark as initialized (file watching will be started separately)
      this.isInitialized = true;
      logger.info('🎉 SettingsManager core initialization completed successfully');
      
      // Start file watchers with delay for Tauri API stabilization
      // Schedule file watchers initialization
      setTimeout(async () => {
        if (!this.watchersInitialized && !this.watcherInitializationInProgress) {
          try {
            logger.info('🔄 Starting Tauri v2 file watchers for real-time changes...');
            await this.startWatching();
            logger.info('✅ File watchers initialization completed successfully');
            logger.info('👁️ File watching now active - Settings:', !!this.settingsWatcher, 'Keybindings:', !!this.keybindingsWatcher);
          } catch (watchError) {
            logger.error('❌ File watchers initialization failed:', watchError);
            logger.warn('File watching disabled - changes will not be auto-detected');
          }
        } else {
          // Watchers already initialized or initialization in progress
        }
      }, 2000); // 2 second delay
    } catch (error) {
      this.initializationError = error as Error;
      logger.error('Failed to initialize SettingsManager:', error);
      // Initialization failed
      logger.error('Will not retry initialization until restart');
      
      // Reset state to prevent partially initialized state
      this.isInitialized = false;
      this.paths = null;
      
      throw new SettingsError(
        'Failed to initialize settings manager',
        'FILE_ERROR',
        undefined,
        error
      );
    }
  }
  
  /**
   * Get the appropriate config directory based on OS
   */
  private async getConfigDirectory(): Promise<string> {
    const platform = this.getPlatform();
    
    switch (platform) {
      case 'linux': {
        // Linux: ~/.config/yutodo (lowercase)
        // Use Tauri's configDir() which respects XDG_CONFIG_HOME
        const userConfigDir = await configDir();
        return await join(userConfigDir, 'yutodo');
      }
        
      case 'windows': {
        // Windows: %APPDATA%\YuToDo
        const appData = await appDataDir();
        return await join(appData, 'YuToDo');
      }
        
      case 'darwin': {
        // macOS: ~/Library/Application Support/YuToDo
        const home = await homeDir();
        const appSupport = await join(home, 'Library', 'Application Support');
        return await join(appSupport, 'YuToDo');
      }
        
      default: {
        // Fallback to Linux behavior
        const fallbackConfigDir = await configDir();
        return await join(fallbackConfigDir, 'yutodo');
      }
    }
  }
  
  /**
   * Get platform identifier
   */
  private getPlatform(): string {
    // Use existing OS detection utility
    if (isWindows()) return 'windows';
    if (isMac()) return 'darwin';
    // Default to Linux for everything else
    return 'linux';
  }
  

  /**
   * Setup file paths based on OS
   */
  private async setupPaths(): Promise<void> {
    try {
      // Check Tauri API availability
      
      // Check if we're in Tauri environment
      if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
        throw new Error('Not running in Tauri environment - cannot access file system APIs');
      }
      
      // Get config directory
      
      let configDir: string;
      try {
        configDir = await this.getConfigDirectory();
        logger.info('Config directory path:', configDir);
      } catch (error) {
        logger.error('Failed to get config directory:', error);
        throw new Error(`Failed to get config directory: ${(error as Error).message}`);
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
    
    // 設定ディレクトリとバックアップディレクトリを作成
    const configDir = await this.getConfigDirectory();
    const dirs = [
      configDir,
      this.paths.backupDir
    ];
    
    const { exists, mkdir } = await import('@tauri-apps/plugin-fs');
    for (const dir of dirs) {
      if (!await exists(dir)) {
        logger.info(`📁 Creating directory: ${dir}`);
        await mkdir(dir, { recursive: true });
        // Directory created
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
    
    const { exists, readTextFile } = await import('@tauri-apps/plugin-fs');
    try {
      if (await exists(this.paths.settingsFile)) {
        this.settingsFileContent = await readTextFile(this.paths.settingsFile);
        const { parse: parseToml } = await import('@ltd/j-toml');
        const parsed = parseToml(this.settingsFileContent, { 
          joiner: '\n'
        }) as any;
        
        // ✅ TOMLパース成功 → エラークリア
        this.clearParseError('settings');
        
        this.settings = this.mergeWithDefaults(parsed, DEFAULT_APP_SETTINGS);
        logger.info('Settings loaded from file');
      } else {
        // Create default settings file
        await this.createDefaultSettingsFile();
        logger.info('Created default settings file');
      }
    } catch (error) {
      logger.error('Error loading settings:', error);
      
      // Store parse error for UI display
      this.addParseError('settings', this.paths!.settingsFile, error);
      
      // Use default settings and continue initialization
      this.settings = { ...DEFAULT_APP_SETTINGS };
      logger.warn('Using default settings due to parse error');
    }
  }
  
  /**
   * Load or create keybindings file
   */
  private async loadOrCreateKeybindings(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot load keybindings: paths not initialized');
    }
    
    const { exists, readTextFile } = await import('@tauri-apps/plugin-fs');
    try {
      if (await exists(this.paths.keybindingsFile)) {
        this.keybindingsFileContent = await readTextFile(this.paths.keybindingsFile);
        const { parse: parseToml } = await import('@ltd/j-toml');
        const parsed = parseToml(this.keybindingsFileContent, { 
          joiner: '\n'
        }) as any;
        
        // ✅ TOMLパース成功 → エラークリア
        this.clearParseError('keybindings');
        
        this.keybindings = this.parseKeybindings(parsed);
        logger.info('Keybindings loaded from file');
      } else {
        // Create default keybindings file
        await this.createDefaultKeybindingsFile();
        logger.info('Created default keybindings file');
      }
    } catch (error) {
      logger.error('Error loading keybindings:', error);
      
      // Store parse error for UI display
      this.addParseError('keybindings', this.paths!.keybindingsFile, error);
      
      // Use default keybindings and continue initialization
      this.keybindings = [...DEFAULT_KEYBINDINGS];
      logger.warn('Using default keybindings due to parse error');
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

# Window always on top on startup
startupAlwaysOnTop = false

# Confirm before deleting tasks
confirmDelete = true

# Current view: "tasks-detailed" | "tasks-simple" | "schedules"
startupView = "tasks-detailed"

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
    
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
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
command = "showTasksDetailed"

[[keybindings]]
key = "Ctrl+2"
command = "showTasksSimple"

[[keybindings]]
key = "Ctrl+3"
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
    
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
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
    
    // Prevent multiple simultaneous initialization attempts
    if (this.watchersInitialized) {
      logger.info('File watchers already initialized, skipping');
      return;
    }
    
    if (this.watcherInitializationInProgress) {
      logger.info('File watcher initialization already in progress, skipping');
      return;
    }
    
    this.watcherInitializationInProgress = true;
    logger.info('Starting file watchers...');
    
    // Check if Tauri watch API is available
    const watchAPIAvailable = await checkTauriWatchAPI();
    if (!watchAPIAvailable) {
      logger.warn('⚠️ Tauri watch API not available in current environment - file watching disabled');
      this.watchersInitialized = true; // Mark as "initialized" even though watchers are not active
      return;
    }
    
    // Check if files exist before watching
    const { exists } = await import('@tauri-apps/plugin-fs');
    const settingsExists = await exists(this.paths.settingsFile);
    const keybindingsExists = await exists(this.paths.keybindingsFile);
    
    if (!settingsExists) {
      throw new Error('Settings file does not exist - cannot watch');
    }
    
    // Clean up any existing watchers before creating new ones
    if (this.settingsWatcher) {
      try {
        // Clean up existing settings watcher
        this.settingsWatcher();
        this.settingsWatcher = null;
      } catch {
        // Error cleaning up watcher - ignore
      }
    }
    
    try {
      // Watch settings file using the actual path
      try {
        const { watch } = await import('@tauri-apps/plugin-fs');
        this.settingsWatcher = await watch(
          this.paths.settingsFile,
          (event) => {
            // Filter to only process write events
            if (event.type && typeof event.type === 'object') {
              const eventType = event.type;
              if ('access' in eventType || 
                  ('modify' in eventType && eventType.modify?.kind === 'metadata')) {
                // Ignore non-write events
                return;
              }
            }
            
            logger.info('Settings file changed, reloading...');
            this.handleFileChange('settings');
          },
          {
            // Don't specify baseDir when using absolute paths
            delayMs: 300
          }
        );
        // Settings file watcher started
      } catch (watchError: any) {
        // Handle specific Tauri watch errors
        if (watchError?.message?.includes('window[') || watchError?.message?.includes('is not a function')) {
          logger.error('Tauri watch API error - file watching may not be available:', watchError.message);
          throw new Error('File watching not available in current environment');
        }
        // Handle "too many open files" error
        if (watchError?.message?.includes('os error 24') || watchError?.message?.includes('ファイルを開きすぎです')) {
          logger.error('Too many open files error - system file handle limit reached');
          throw new Error('System file handle limit reached. Please restart the application.');
        }
        throw watchError;
      }
      
      // Watch keybindings file (optional)
      if (keybindingsExists) {
        // Clean up any existing keybindings watcher before creating new one
        if (this.keybindingsWatcher) {
          try {
            // Clean up existing keybindings watcher
            this.keybindingsWatcher();
            this.keybindingsWatcher = null;
          } catch {
            // Error cleaning up watcher - ignore
          }
        }
        
        try {
          const { watch } = await import('@tauri-apps/plugin-fs');
          this.keybindingsWatcher = await watch(
            this.paths.keybindingsFile,
            (event) => {
              // Filter to only process write events
              if (event.type && typeof event.type === 'object') {
                const eventType = event.type;
                if ('access' in eventType || 
                    ('modify' in eventType && eventType.modify?.kind === 'metadata')) {
                  // Ignore non-write events
                  return;
                }
              }
              
              logger.info('Keybindings file changed, reloading...');
              this.handleFileChange('keybindings');
            },
            {
              // Don't specify baseDir when using absolute paths
              delayMs: 300
            }
          );
          logger.info('✅ Keybindings file watcher started successfully');
        } catch (error: any) {
          // Handle specific Tauri watch errors
          if (error?.message?.includes('window[') || error?.message?.includes('is not a function')) {
            logger.warn('⚠️ Tauri watch API error for keybindings - continuing without keybindings watcher:', error.message);
          } else if (error?.message?.includes('os error 24') || error?.message?.includes('ファイルを開きすぎです')) {
            logger.error('⚠️ Too many open files error for keybindings watcher - system file handle limit reached');
          } else {
            logger.warn('⚠️ Failed to start keybindings file watcher:', error);
          }
          logger.warn('Continuing with settings watching only');
        }
      } else {
        logger.info('📄 Keybindings file does not exist - skipping keybindings watcher');
      }
      
      logger.info('🎉 File watchers initialization completed!');
      logger.info('👁️ Active watchers - Settings:', !!this.settingsWatcher, 'Keybindings:', !!this.keybindingsWatcher);
      
      // Mark watchers as initialized
      this.watchersInitialized = true;
    } catch (error) {
      logger.error('❌ Failed to start file watchers:', error);
      
      // Clean up any partially created watchers
      if (this.settingsWatcher) {
        try {
          this.settingsWatcher();
          this.settingsWatcher = null;
        } catch (cleanupError) {
          logger.error('Error cleaning up settings watcher:', cleanupError);
        }
      }
      
      if (this.keybindingsWatcher) {
        try {
          this.keybindingsWatcher();
          this.keybindingsWatcher = null;
        } catch (cleanupError) {
          logger.error('Error cleaning up keybindings watcher:', cleanupError);
        }
      }
      
      throw error;
    } finally {
      this.watcherInitializationInProgress = false;
    }
  }

  /**
   * Restart a specific watcher to address one-shot behavior
   * 🔧 Re-enabled with proper event filtering to prevent infinite loop
   */
  private async restartWatcher(type: 'settings' | 'keybindings'): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot restart watcher: paths not initialized');
    }

    // Don't restart if watchers are not initialized yet
    if (!this.watchersInitialized) {
      logger.debug(`Watchers not yet initialized, skipping restart for ${type}`);
      return;
    }

    // Check restart count to prevent runaway restarts
    const restartKey = `${type}_watcher`;
    const currentCount = this.watcherRestartCount.get(restartKey) || 0;
    
    if (currentCount >= this.MAX_WATCHER_RESTARTS) {
      logger.error(`❌ Maximum restart attempts (${this.MAX_WATCHER_RESTARTS}) reached for ${type} watcher. Disabling watcher.`);
      return;
    }

    this.watcherRestartCount.set(restartKey, currentCount + 1);
    logger.debug(`🔄 Restarting ${type} watcher... (attempt ${currentCount + 1}/${this.MAX_WATCHER_RESTARTS})`);

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

        // Check if settings file exists
        const { exists } = await import('@tauri-apps/plugin-fs');
        const settingsExists = await exists(this.paths.settingsFile);
        if (!settingsExists) {
          logger.warn('📄 Settings file does not exist - skipping watcher restart');
          return;
        }

        // Restart settings watcher with event filtering
        logger.debug('👀 Restarting settings file watcher...');
        const { watch } = await import('@tauri-apps/plugin-fs');
        this.settingsWatcher = await watch(
          this.paths.settingsFile,
          (event) => {
            // 🔧 書き込みイベントのみを処理（読み込みイベントは無視）
            if (event.type && typeof event.type === 'object') {
              const eventType = event.type;
              // アクセスイベントや読み込み専用イベントは無視
              if ('access' in eventType || 
                  ('modify' in eventType && eventType.modify?.kind === 'metadata')) {
                logger.debug('🚫 Ignoring non-write settings event:', event);
                return;
              }
            }
            
            logger.info('🔥 Settings file write detected! Event:', event);
            logger.info('📝 Triggering settings reload...');
            this.handleFileChange('settings');
          },
          {
            // Don't specify baseDir when using absolute paths
            delayMs: 300
          }
        );
        logger.debug('✅ Settings file watcher restarted successfully');
        
        // Reset restart count on successful restart
        this.watcherRestartCount.set('settings_watcher', 0);

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
        const { exists } = await import('@tauri-apps/plugin-fs');
        const keybindingsExists = await exists(this.paths.keybindingsFile);
        if (keybindingsExists) {
          logger.debug('👀 Restarting keybindings file watcher...');
          const { watch } = await import('@tauri-apps/plugin-fs');
          this.keybindingsWatcher = await watch(
            this.paths.keybindingsFile,
            (event) => {
              // Filter to only process write events
              if (event.type && typeof event.type === 'object') {
                const eventType = event.type;
                if ('access' in eventType || 
                    ('modify' in eventType && eventType.modify?.kind === 'metadata')) {
                  // Ignore non-write events
                  return;
                }
              }
              
              logger.info('Keybindings file changed, reloading...');
              this.handleFileChange('keybindings');
            },
            {
              // Don't specify baseDir when using absolute paths
              delayMs: 300
            }
          );
          logger.debug('✅ Keybindings file watcher restarted successfully');
          
          // Reset restart count on successful restart
          this.watcherRestartCount.set('keybindings_watcher', 0);
        } else {
          logger.debug('📄 Keybindings file does not exist - skipping watcher restart');
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
        
        // Restart watcher to handle one-shot behavior
        await this.restartWatcher(type);
      } catch (error) {
        logger.error(`❌ Error reloading ${type}:`, error);
        
        // Try to restart watcher after error (limited to MAX_WATCHER_RESTARTS)
        try {
          logger.warn(`⚠️ Attempting to restart ${type} watcher after error`);
          await this.restartWatcher(type);
        } catch (restartError) {
          logger.error('❌ Failed to restart watcher after error:', restartError);
        }
      }
      
      this.debounceTimers.delete(type);
      logger.debug(`Debounce timer cleaned up for ${type}`);
    }, 100);
    
    this.debounceTimers.set(type, timer);
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
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      this.settingsFileContent = await readTextFile(this.paths.settingsFile);
      logger.debug('📏 Settings file content length:', this.settingsFileContent.length);
      
      logger.debug('🔍 Parsing TOML content...');
      const { parse: parseToml } = await import('@ltd/j-toml');
      const parsed = parseToml(this.settingsFileContent, { 
        joiner: '\n'
      }) as any;
      logger.debug('✅ TOML parsing successful');
      
      // ✅ TOMLパース成功 → エラークリア
      this.clearParseError('settings');
      
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
        startupView: this.settings.app?.startupView
      });
    } catch (error) {
      logger.error('❌ Failed to reload settings:', error);
      
      // Store parse error for UI display
      this.addParseError('settings', this.paths!.settingsFile, error);
      // Still notify listeners so UI can update error state
      this.notifyListeners({
        type: 'settings',
        previous,
        current: this.settings, // Keep current settings
        source: 'file'
      });
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
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      this.keybindingsFileContent = await readTextFile(this.paths.keybindingsFile);
      const { parse: parseToml } = await import('@ltd/j-toml');
      const parsed = parseToml(this.keybindingsFileContent, { 
        joiner: '\n'
      }) as any;
      
      // ✅ TOMLパース成功 → エラークリア
      this.clearParseError('keybindings');
      
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
      
      // Store parse error for UI display
      this.addParseError('keybindings', this.paths!.keybindingsFile, error);
      
      // Still notify listeners so UI can update error state
      this.notifyListeners({
        type: 'keybindings',
        previous,
        current: this.keybindings, // Keep current keybindings
        source: 'file'
      });
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
   * Add parse error (removes duplicates for same type)
   */
  private addParseError(type: 'settings' | 'keybindings', filePath: string, error: any): void {
    // Remove existing error of same type (keep only latest)
    this.parseErrors = this.parseErrors.filter(e => e.type !== type);
    
    // Add new error
    this.parseErrors.push({
      type,
      filePath,
      error,
      timestamp: Date.now()
    });
    
    logger.debug(`Added ${type} parse error. Total errors: ${this.parseErrors.length}`);
  }
  
  /**
   * Clear parse error for specific type
   */
  private clearParseError(type: 'settings' | 'keybindings'): void {
    const beforeCount = this.parseErrors.length;
    this.parseErrors = this.parseErrors.filter(e => e.type !== type);
    const afterCount = this.parseErrors.length;
    
    if (beforeCount !== afterCount) {
      logger.debug(`Cleared ${type} parse error. Remaining errors: ${afterCount}`);
    }
  }
  
  /**
   * Get parse errors for UI display
   */
  getParseErrors(): ParseError[] {
    return [...this.parseErrors];
  }
  
  /**
   * Clear all parse errors
   */
  clearParseErrors(): void {
    this.parseErrors = [];
  }
  
  /**
   * Update settings preserving comments
   */
  async updateSettings(updates: Partial<AppSettingsFile>): Promise<void> {
    
    if (!this.isInitialized) {
      throw new Error('SettingsManager not initialized. Call initialize() first.');
    }
    
    const previous = { ...this.settings };
    
    // Merge updates
    this.settings = this.mergeWithDefaults(updates, this.settings);
    
    // Temporarily disable file watcher to prevent feedback loop
    const wasWatcherActive = !!this.settingsWatcher;
    if (this.settingsWatcher) {
      this.settingsWatcher();
      this.settingsWatcher = null;
    }
    
    try {
      // Update file preserving comments
      await this.updateSettingsFile();
      
      // Notify listeners
      this.notifyListeners({
        type: 'settings',
        previous,
        current: this.settings,
        source: 'app'
      });
    } finally {
      // Re-enable file watcher after update with delay
      if (wasWatcherActive) {
        setTimeout(async () => {
          try {
            await this.startSettingsWatcher();
          } catch (error) {
            logger.error('Failed to re-enable settings file watcher:', error);
          }
        }, 500);
      }
    }
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
    
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
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
    
    if (typeof value === 'bigint') {
      return value.toString();
    }
    
    // Handle arrays and objects, with BigInt-safe serialization
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, (_key, val) => {
          if (typeof val === 'bigint') {
            return val.toString();
          }
          return val;
        });
      } catch (error) {
        logger.warn('Failed to serialize object value, using string representation:', error);
        return `"${String(value)}"`;
      }
    }
    
    // Fallback for other types
    return `"${String(value)}"`;
  }
  
  /**
   * Add keybinding
   */
  async addKeybinding(keybinding: Keybinding): Promise<void> {
    const previous = [...this.keybindings];
    
    // Remove existing binding for the same key
    this.keybindings = this.keybindings.filter(kb => kb.key !== keybinding.key);
    this.keybindings.push(keybinding);
    
    // 🔧 Temporarily disable file watcher to prevent feedback loop
    logger.debug('🛑 Temporarily disabling keybindings file watcher during update...');
    const wasWatcherActive = !!this.keybindingsWatcher;
    if (this.keybindingsWatcher) {
      this.keybindingsWatcher();
      this.keybindingsWatcher = null;
    }
    
    try {
      // Update file
      await this.updateKeybindingsFile();
      
      // Notify listeners
      this.notifyListeners({
        type: 'keybindings',
        previous,
        current: this.keybindings,
        source: 'app'
      });
      
      logger.debug('✅ Keybinding update completed successfully');
    } finally {
      // 🔄 Re-enable file watcher after update with delay
      if (wasWatcherActive) {
        logger.debug('⏳ Re-enabling keybindings file watcher in 500ms...');
        setTimeout(async () => {
          try {
            await this.startKeybindingsWatcher();
            logger.debug('✅ Keybindings file watcher re-enabled');
          } catch (error) {
            logger.error('❌ Failed to re-enable keybindings file watcher:', error);
          }
        }, 500); // 遅延を200ms→500msに増加
      }
    }
  }
  
  /**
   * Remove keybinding
   */
  async removeKeybinding(key: string): Promise<void> {
    const previous = [...this.keybindings];
    
    this.keybindings = this.keybindings.filter(kb => kb.key !== key);
    
    // 🔧 Temporarily disable file watcher to prevent feedback loop
    logger.debug('🛑 Temporarily disabling keybindings file watcher during removal...');
    const wasWatcherActive = !!this.keybindingsWatcher;
    if (this.keybindingsWatcher) {
      this.keybindingsWatcher();
      this.keybindingsWatcher = null;
    }
    
    try {
      // Update file
      await this.updateKeybindingsFile();
      
      // Notify listeners
      this.notifyListeners({
        type: 'keybindings',
        previous,
        current: this.keybindings,
        source: 'app'
      });
      
      logger.debug('✅ Keybinding removal completed successfully');
    } finally {
      // 🔄 Re-enable file watcher after update with delay
      if (wasWatcherActive) {
        logger.debug('⏳ Re-enabling keybindings file watcher in 500ms...');
        setTimeout(async () => {
          try {
            await this.startKeybindingsWatcher();
            logger.debug('✅ Keybindings file watcher re-enabled');
          } catch (error) {
            logger.error('❌ Failed to re-enable keybindings file watcher:', error);
          }
        }, 500); // 遅延を200ms→500msに増加
      }
    }
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
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
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
   * Start settings file watcher
   */
  private async startSettingsWatcher(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot start settings watcher: paths not initialized');
    }
    
    // Check if settings file exists
    const { exists } = await import('@tauri-apps/plugin-fs');
    const settingsExists = await exists(this.paths.settingsFile);
    if (!settingsExists) {
      throw new Error('Settings file does not exist - cannot watch');
    }
    
    // Stop existing watcher if any
    if (this.settingsWatcher) {
      this.settingsWatcher();
      this.settingsWatcher = null;
    }
    
    logger.debug('👀 Starting settings file watcher...');
    const { watch } = await import('@tauri-apps/plugin-fs');
    this.settingsWatcher = await watch(
      this.paths.settingsFile,
      (event) => {
        // 🔧 書き込みイベントのみを処理（読み込みイベントは無視）
        if (event.type && typeof event.type === 'object') {
          const eventType = event.type;
          // アクセスイベントや読み込み専用イベントは無視
          if ('access' in eventType || 
              ('modify' in eventType && eventType.modify?.kind === 'metadata')) {
            logger.debug('🚫 Ignoring non-write file event:', event);
            return;
          }
        }
        
        logger.info('🔥 Settings file write detected! Event:', event);
        this.handleFileChange('settings');
      },
      {
        // Don't specify baseDir when using absolute paths
        delayMs: 300
      }
    );
    logger.debug('✅ Settings file watcher started successfully');
  }
  
  /**
   * Start keybindings file watcher
   */
  private async startKeybindingsWatcher(): Promise<void> {
    if (!this.paths) {
      throw new Error('Cannot start keybindings watcher: paths not initialized');
    }
    
    // Check if keybindings file exists
    const { exists } = await import('@tauri-apps/plugin-fs');
    const keybindingsExists = await exists(this.paths.keybindingsFile);
    if (!keybindingsExists) {
      logger.warn('Keybindings file does not exist - skipping watcher');
      return;
    }
    
    // Stop existing watcher if any
    if (this.keybindingsWatcher) {
      this.keybindingsWatcher();
      this.keybindingsWatcher = null;
    }
    
    logger.debug('👀 Starting keybindings file watcher...');
    const { watch } = await import('@tauri-apps/plugin-fs');
    this.keybindingsWatcher = await watch(
      this.paths.keybindingsFile,
      (event) => {
        // 🔧 書き込みイベントのみを処理（読み込みイベントは無視）
        if (event.type && typeof event.type === 'object') {
          const eventType = event.type;
          // アクセスイベントや読み込み専用イベントは無視
          if ('access' in eventType || 
              ('modify' in eventType && eventType.modify?.kind === 'metadata')) {
            logger.debug('🚫 Ignoring non-write keybindings event:', event);
            return;
          }
        }
        
        logger.info('🔥 Keybindings file write detected! Event:', event);
        this.handleFileChange('keybindings');
      },
      {
        // Don't specify baseDir when using absolute paths
        delayMs: 300
      }
    );
    logger.debug('✅ Keybindings file watcher started successfully');
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
    
    // Reset initialization states
    this.watchersInitialized = false;
    this.watcherInitializationInProgress = false;
    this.watcherRestartCount.clear();
    
    logger.info('✅ SettingsManager disposed');
  }
}

// Export singleton instance
export const settingsManager = SettingsManager.getInstance();

// Cleanup on window unload to prevent file handle leaks
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.info('Window unloading, disposing SettingsManager...');
    settingsManager.dispose().catch(error => {
      logger.error('Error disposing SettingsManager on unload:', error);
    });
  });
}