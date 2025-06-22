import { AppSettingsFile, Keybinding, SettingsPaths, SettingsChangeEvent, DEFAULT_APP_SETTINGS, DEFAULT_KEYBINDINGS, SettingsError } from '../types/settings';
import { exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { watch, type DebouncedWatchOptions } from '@tauri-apps/plugin-fs';
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
  private paths!: SettingsPaths;
  
  private settingsWatcher: any = null;
  private keybindingsWatcher: any = null;
  
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
   * Initialize the settings manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing SettingsManager...');
    
    try {
      // Setup paths
      await this.setupPaths();
      
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Load or create default files
      await this.loadOrCreateSettings();
      await this.loadOrCreateKeybindings();
      
      // Start file watchers
      await this.startWatching();
      
      logger.info('SettingsManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SettingsManager:', error);
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
    const dataDir = await appDataDir();
    const configDir = await join(dataDir, 'YuToDo');
    
    this.paths = {
      settingsFile: await join(configDir, 'settings.toml'),
      keybindingsFile: await join(configDir, 'keybindings.toml'),
      settingsSchema: await join(configDir, 'settings.schema.json'),
      keybindingsSchema: await join(configDir, 'keybindings.schema.json'),
      backupDir: await join(configDir, 'backups')
    };
    
    logger.debug('Settings paths configured:', this.paths);
  }
  
  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
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
    try {
      if (await exists(this.paths.settingsFile)) {
        this.settingsFileContent = await readTextFile(this.paths.settingsFile);
        const parsed = parseToml(this.settingsFileContent) as any;
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
    try {
      if (await exists(this.paths.keybindingsFile)) {
        this.keybindingsFileContent = await readTextFile(this.paths.keybindingsFile);
        const parsed = parseToml(this.keybindingsFileContent) as any;
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
# Use triple quotes for multiline strings
customCss = """
/* Add your custom styles here */
"""
`;
    
    await writeTextFile(this.paths.settingsFile, content);
    this.settingsFileContent = content;
    this.settings = DEFAULT_APP_SETTINGS;
  }
  
  /**
   * Create default keybindings file with comments
   */
  private async createDefaultKeybindingsFile(): Promise<void> {
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
   * Start watching files for changes
   */
  private async startWatching(): Promise<void> {
    const watchOptions: DebouncedWatchOptions = {
      delayMs: 300
    };
    
    // Watch settings file
    this.settingsWatcher = await watch(
      this.paths.settingsFile,
      () => this.handleFileChange('settings'),
      watchOptions
    );
    
    // Watch keybindings file
    this.keybindingsWatcher = await watch(
      this.paths.keybindingsFile,
      () => this.handleFileChange('keybindings'),
      watchOptions
    );
    
    logger.info('File watchers started');
  }
  
  /**
   * Handle file change events
   */
  private handleFileChange(type: 'settings' | 'keybindings'): void {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(type);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        if (type === 'settings') {
          await this.reloadSettings();
        } else {
          await this.reloadKeybindings();
        }
      } catch (error) {
        logger.error(`Error reloading ${type}:`, error);
      }
      
      this.debounceTimers.delete(type);
    }, 100);
    
    this.debounceTimers.set(type, timer);
  }
  
  /**
   * Reload settings from file
   */
  private async reloadSettings(): Promise<void> {
    const previous = { ...this.settings };
    
    try {
      this.settingsFileContent = await readTextFile(this.paths.settingsFile);
      const parsed = parseToml(this.settingsFileContent) as any;
      this.settings = this.mergeWithDefaults(parsed, DEFAULT_APP_SETTINGS);
      
      // Notify listeners
      this.notifyListeners({
        type: 'settings',
        previous,
        current: this.settings,
        source: 'file'
      });
      
      logger.info('Settings reloaded from file');
    } catch (error) {
      logger.error('Failed to reload settings:', error);
    }
  }
  
  /**
   * Reload keybindings from file
   */
  private async reloadKeybindings(): Promise<void> {
    const previous = [...this.keybindings];
    
    try {
      this.keybindingsFileContent = await readTextFile(this.paths.keybindingsFile);
      const parsed = parseToml(this.keybindingsFileContent) as any;
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
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in settings change listener:', error);
      }
    }
  }
  
  /**
   * Get settings file path
   */
  getSettingsPath(): string {
    return this.paths.settingsFile;
  }
  
  /**
   * Get keybindings file path
   */
  getKeybindingsPath(): string {
    return this.paths.keybindingsFile;
  }
  
  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Stop watchers
    if (this.settingsWatcher) {
      // TODO: Implement unwatch when available in Tauri
    }
    
    if (this.keybindingsWatcher) {
      // TODO: Implement unwatch when available in Tauri
    }
    
    // Clear timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    
    this.debounceTimers.clear();
    this.listeners.clear();
    
    logger.info('SettingsManager disposed');
  }
}

// Export singleton instance
export const settingsManager = SettingsManager.getInstance();