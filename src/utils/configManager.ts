import * as TOML from '@ltd/j-toml';
import { TodoAppConfig, DEFAULT_CONFIG, configToAppSettings, appSettingsToConfig } from '../types/config';
import { AppSettings } from '../types/todo';

export class ConfigManager {
  private currentConfig: TodoAppConfig = DEFAULT_CONFIG;

  async initialize(): Promise<void> {
    // localStorageのみを使用
    console.log('📚 Initializing config manager with localStorage');
    this.loadFromLocalStorage();
  }

  async loadConfig(): Promise<TodoAppConfig> {
    console.log('💾 Loading config from localStorage...');
    this.loadFromLocalStorage();
    return this.currentConfig;
  }

  async saveConfig(config: TodoAppConfig): Promise<void> {
    this.currentConfig = config;
    console.log('💾 Saving config to localStorage');
    this.saveToLocalStorage(config);
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('todoAppSettings');
      console.log('📋 localStorage content:', stored);
      if (stored) {
        const settings = JSON.parse(stored) as AppSettings;
        console.log('🔧 Parsed localStorage settings:', settings);
        this.currentConfig = appSettingsToConfig(settings, DEFAULT_CONFIG);
        console.log('✅ Converted to config:', this.currentConfig);
      } else {
        console.log('ℹ️ No localStorage data found, using defaults');
        this.currentConfig = DEFAULT_CONFIG;
      }
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      this.currentConfig = DEFAULT_CONFIG;
    }
  }

  private saveToLocalStorage(config: TodoAppConfig): void {
    try {
      const settings = configToAppSettings(config);
      localStorage.setItem('todoAppSettings', JSON.stringify(settings));
      console.log('✅ Config saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
    }
  }

  private mergeWithDefaults(config: Partial<TodoAppConfig>): TodoAppConfig {
    return {
      app: {
        window: {
          ...DEFAULT_CONFIG.app.window,
          ...config.app?.window,
        },
        ui: {
          ...DEFAULT_CONFIG.app.ui,
          ...config.app?.ui,
        },
        behavior: {
          ...DEFAULT_CONFIG.app.behavior,
          ...config.app?.behavior,
        },
      },
      server: {
        ...DEFAULT_CONFIG.server,
        ...config.server,
      },
      appearance: {
        ...DEFAULT_CONFIG.appearance,
        ...config.appearance,
      },
      shortcuts: {
        ...DEFAULT_CONFIG.shortcuts,
        ...config.shortcuts,
      },
    };
  }

  private configToTOML(config: TodoAppConfig): string {
    try {
      // undefined値を除去してからTOMLに変換
      const cleanConfig = this.removeUndefinedValues(config);
      console.log('🧹 Cleaned config for TOML:', cleanConfig);

      // 手動でTOML形式を構築（セクション形式で）
      const header = `# YuToDo Configuration
# Generated on ${new Date().toISOString()}
#
# This file contains all settings for the Todo application.
# You can edit this file manually or use the settings panel in the app.

`;

      let toml = header;

      // Application window settings
      toml += '# Application window settings\n';
      toml += '[app.window]\n';
      toml += `always_on_top = ${cleanConfig.app.window.always_on_top}\n`;
      if (cleanConfig.app.window.width !== undefined) toml += `width = ${cleanConfig.app.window.width}\n`;
      if (cleanConfig.app.window.height !== undefined) toml += `height = ${cleanConfig.app.window.height}\n`;
      if (cleanConfig.app.window.min_width !== undefined) toml += `min_width = ${cleanConfig.app.window.min_width}\n`;
      if (cleanConfig.app.window.min_height !== undefined) toml += `min_height = ${cleanConfig.app.window.min_height}\n`;

      // User interface settings
      toml += '\n# User interface settings\n';
      toml += '[app.ui]\n';
      toml += `theme = "${cleanConfig.app.ui.theme}"\n`;
      toml += `detailed_mode = ${cleanConfig.app.ui.detailed_mode}\n`;
      toml += `auto_hide_header = ${cleanConfig.app.ui.auto_hide_header}\n`;

      // Application behavior settings
      toml += '\n# Application behavior settings\n';
      toml += '[app.behavior]\n';
      toml += `auto_save = ${cleanConfig.app.behavior.auto_save}\n`;
      toml += `enable_shortcuts = ${cleanConfig.app.behavior.enable_shortcuts}\n`;
      toml += `show_notifications = ${cleanConfig.app.behavior.show_notifications}\n`;
      toml += `confirm_delete = ${cleanConfig.app.behavior.confirm_delete}\n`;

      // Server connection settings
      toml += '\n# Server connection settings\n';
      toml += '[server]\n';
      toml += `url = "${cleanConfig.server.url}"\n`;
      if (cleanConfig.server.timeout !== undefined) toml += `timeout = ${cleanConfig.server.timeout}\n`;
      if (cleanConfig.server.retry_attempts !== undefined) toml += `retry_attempts = ${cleanConfig.server.retry_attempts}\n`;

      // Visual appearance settings
      toml += '\n# Visual appearance settings\n';
      toml += '[appearance]\n';
      if (cleanConfig.appearance.custom_css !== undefined) toml += `custom_css = "${cleanConfig.appearance.custom_css}"\n`;
      if (cleanConfig.appearance.font_family !== undefined) toml += `font_family = "${cleanConfig.appearance.font_family}"\n`;
      if (cleanConfig.appearance.font_size !== undefined) toml += `font_size = ${cleanConfig.appearance.font_size}\n`;

      // Keyboard shortcuts
      if (cleanConfig.shortcuts) {
        toml += '\n# Keyboard shortcuts\n';
        toml += '[shortcuts]\n';
        if (cleanConfig.shortcuts.new_task) toml += `new_task = "${cleanConfig.shortcuts.new_task}"\n`;
        if (cleanConfig.shortcuts.toggle_settings) toml += `toggle_settings = "${cleanConfig.shortcuts.toggle_settings}"\n`;
        if (cleanConfig.shortcuts.focus_search) toml += `focus_search = "${cleanConfig.shortcuts.focus_search}"\n`;
        if (cleanConfig.shortcuts.select_all) toml += `select_all = "${cleanConfig.shortcuts.select_all}"\n`;
        if (cleanConfig.shortcuts.delete_selected) toml += `delete_selected = "${cleanConfig.shortcuts.delete_selected}"\n`;
        if (cleanConfig.shortcuts.show_help) toml += `show_help = "${cleanConfig.shortcuts.show_help}"\n`;
      }

      return toml;
    } catch (error) {
      console.error('Failed to convert config to TOML:', error);
      console.error('Config object:', config);
      throw error;
    }
  }

  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  async exportConfig(): Promise<string> {
    console.log('📤 ConfigManager.exportConfig called');
    console.log('⚙️ Current config:', this.currentConfig);
    const tomlContent = this.configToTOML(this.currentConfig);
    console.log('📋 Generated TOML:', tomlContent);
    return tomlContent;
  }

  async importConfig(tomlContent: string): Promise<TodoAppConfig> {
    try {
      const parsed = TOML.parse(tomlContent);
      const config = this.mergeWithDefaults(parsed as any);
      await this.saveConfig(config);
      return config;
    } catch (error) {
      console.error('Failed to import config:', error);
      throw new Error('Invalid TOML format or structure');
    }
  }

  getCurrentConfig(): TodoAppConfig {
    return this.currentConfig;
  }

  getAppSettings(): AppSettings {
    return configToAppSettings(this.currentConfig);
  }

  async updateFromAppSettings(settings: AppSettings): Promise<void> {
    console.log('🔧 Converting AppSettings to TodoAppConfig:', settings);
    const config = appSettingsToConfig(settings, this.currentConfig);
    console.log('📝 Generated config:', config);
    await this.saveConfig(config);
  }

  async resetToDefaults(): Promise<TodoAppConfig> {
    await this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  getConfigPath(): string | null {
    return null; // ファイルパスは使用しない
  }

  validateConfig(config: any): boolean {
    try {
      if (!config.app || !config.server) return false;
      if (!config.app.window || !config.app.ui || !config.app.behavior) return false;
      if (typeof config.app.window.always_on_top !== 'boolean') return false;
      if (!['auto', 'light', 'dark'].includes(config.app.ui.theme)) return false;
      if (!config.server.url || typeof config.server.url !== 'string') return false;
      return true;
    } catch {
      return false;
    }
  }
}

export const configManager = new ConfigManager();
