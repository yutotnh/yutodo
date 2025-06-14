import * as TOML from '@ltd/j-toml';
import { TodoAppConfig, DEFAULT_CONFIG, configToAppSettings, appSettingsToConfig } from '../types/config';
import { AppSettings } from '../types/todo';

export class ConfigManager {
  private configPath: string | null = null;
  private currentConfig: TodoAppConfig = DEFAULT_CONFIG;

  async initialize(): Promise<void> {
    try {
      // Tauriが利用可能な場合のみファイルシステムを使用
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          // @ts-ignore - Tauri API dynamic import
          const { appConfigDir } = await import('@tauri-apps/api/path');
          const configDir = await appConfigDir();
          // パス結合は手動で行う
          this.configPath = `${configDir}/todo-app.toml`.replace(/\\/g, '/');
          console.log('📂 Config file path:', this.configPath);
          await this.loadConfig();
        } catch (importError) {
          console.log('⚠️ Failed to import Tauri path API:', importError);
          this.loadFromLocalStorage();
        }
      } else {
        console.log('⚠️ Tauri not available, using localStorage only');
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize config manager:', error);
      // フォールバック: localStorageから読み込み
      this.loadFromLocalStorage();
    }
  }

  async loadConfig(): Promise<TodoAppConfig> {
    try {
      if (this.configPath && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          // @ts-ignore - Tauri API dynamic import
          const { readTextFile } = await import('@tauri-apps/api/fs');
          console.log('🔍 Attempting to read config file:', this.configPath);
          
          try {
            console.log('📖 Reading config file...');
            const content = await readTextFile(this.configPath);
            console.log('📋 Config file content:', content);
            const parsed = TOML.parse(content);
            this.currentConfig = this.mergeWithDefaults(parsed as any);
            console.log('✅ Loaded config from file:', this.currentConfig);
            return this.currentConfig;
          } catch (fileError) {
            console.log('ℹ️ Config file does not exist or cannot be read:', fileError);
          }
        } catch (importError) {
          console.log('⚠️ Failed to import Tauri FS API:', importError);
        }
      } else {
        console.log('⚠️ Config path not set or Tauri not available');
      }
    } catch (error) {
      console.error('❌ Failed to load config file:', error);
    }

    // フォールバック: localStorageから読み込み
    console.log('💾 Loading config from localStorage fallback...');
    this.loadFromLocalStorage();
    return this.currentConfig;
  }

  async saveConfig(config: TodoAppConfig): Promise<void> {
    this.currentConfig = config;

    try {
      if (this.configPath && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          // @ts-ignore - Tauri API dynamic import
          const { writeTextFile } = await import('@tauri-apps/api/fs');
          // @ts-ignore - Tauri API dynamic import
          const { appConfigDir } = await import('@tauri-apps/api/path');
          
          // ディレクトリが存在するか確認し、なければ作成
          const configDirPath = await appConfigDir();
          
          try {
            // ディレクトリ作成を試行
            // @ts-ignore - Tauri API dynamic import
            const { createDir } = await import('@tauri-apps/api/fs');
            await createDir(configDirPath, { recursive: true });
            console.log('📁 Config directory ensured:', configDirPath);
          } catch (dirError) {
            // ディレクトリが既に存在する場合のエラーは無視
            console.log('ℹ️ Config directory already exists or creation failed:', dirError);
          }

          const tomlContent = this.configToTOML(config);
          console.log('💾 Writing TOML content to file...');
          await writeTextFile(this.configPath, tomlContent);
          console.log('✅ Config successfully saved to file:', this.configPath);
          return;
        } catch (importError) {
          console.log('⚠️ Failed to import Tauri API:', importError);
        }
      } else {
        console.log('⚠️ Config path not available or Tauri not available, using localStorage fallback');
      }
    } catch (error) {
      console.error('❌ Failed to save config file:', error);
    }

    // フォールバック: localStorageに保存
    console.log('💾 Saving config to localStorage (fallback)');
    this.saveToLocalStorage(config);
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('todoAppSettings');
      console.log('localStorage content:', stored);
      if (stored) {
        const settings = JSON.parse(stored) as AppSettings;
        console.log('Parsed localStorage settings:', settings);
        this.currentConfig = appSettingsToConfig(settings, DEFAULT_CONFIG);
        console.log('Converted to config:', this.currentConfig);
      } else {
        console.log('No localStorage data found, using defaults');
        this.currentConfig = DEFAULT_CONFIG;
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      this.currentConfig = DEFAULT_CONFIG;
    }
  }

  private saveToLocalStorage(config: TodoAppConfig): void {
    try {
      const settings = configToAppSettings(config);
      localStorage.setItem('todoAppSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
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
      return TOML.stringify(config as any, {
        newline: '\n',
        indent: '  ',
      });
    } catch (error) {
      console.error('Failed to convert config to TOML:', error);
      throw error;
    }
  }

  async exportConfig(): Promise<string> {
    return this.configToTOML(this.currentConfig);
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
    return this.configPath;
  }

  validateConfig(config: any): boolean {
    try {
      // 基本的な構造チェック
      if (!config.app || !config.server) {
        return false;
      }
      
      if (!config.app.window || !config.app.ui || !config.app.behavior) {
        return false;
      }

      // 必須フィールドのチェック
      if (typeof config.app.window.always_on_top !== 'boolean') {
        return false;
      }

      if (!['auto', 'light', 'dark'].includes(config.app.ui.theme)) {
        return false;
      }

      if (!config.server.url || typeof config.server.url !== 'string') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

// シングルトンインスタンス
export const configManager = new ConfigManager();