import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../utils/configManager';
import { DEFAULT_CONFIG, configToAppSettings, appSettingsToConfig } from '../types/config';
import { AppSettings } from '../types/todo';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    configManager = new ConfigManager();
    
    // Mock console methods to reduce test noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  describe('initialization', () => {
    it('should initialize with default config when localStorage is empty', async () => {
      await configManager.initialize();
      const config = configManager.getCurrentConfig();
      
      expect(config).toEqual(DEFAULT_CONFIG);
    });
    
    it('should load config from localStorage if available', async () => {
      const mockSettings: AppSettings = {
        alwaysOnTop: true,
        detailedMode: true,
        darkMode: 'dark',
        confirmDelete: false,
        customCss: 'body { color: red; }',
        serverUrl: 'http://custom-server:3000',
        language: 'ja',
        currentView: 'tasks'
      };
      
      localStorage.setItem('yutodoAppSettings', JSON.stringify(mockSettings));
      
      await configManager.initialize();
      const appSettings = configManager.getAppSettings();
      
      expect(appSettings.alwaysOnTop).toBe(true);
      expect(appSettings.detailedMode).toBe(true);
      expect(appSettings.darkMode).toBe('dark');
      expect(appSettings.confirmDelete).toBe(false);
      expect(appSettings.customCss).toBe('body { color: red; }');
      expect(appSettings.serverUrl).toBe('http://custom-server:3000');
      expect(appSettings.language).toBe('ja');
    });
    
    it('should handle corrupted localStorage data gracefully', async () => {
      localStorage.setItem('yutodoAppSettings', 'invalid-json');
      
      await configManager.initialize();
      const config = configManager.getCurrentConfig();
      
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });
  
  describe('config operations', () => {
    it('should save and load config correctly', async () => {
      const appSettings = {
        alwaysOnTop: true,
        detailedMode: true,
        darkMode: 'dark' as const,
        confirmDelete: false,
        customCss: '.app { color: red; }',
        serverUrl: 'http://localhost:3002',
        language: 'ja' as const,
        currentView: 'tasks' as const
      };
      
      await configManager.updateFromAppSettings(appSettings);
      const loadedSettings = configManager.getAppSettings();
      
      expect(loadedSettings.alwaysOnTop).toBe(true);
      expect(loadedSettings.detailedMode).toBe(true);
      expect(loadedSettings.darkMode).toBe('dark');
      expect(loadedSettings.confirmDelete).toBe(false);
      expect(loadedSettings.customCss).toBe('.app { color: red; }');
      expect(loadedSettings.serverUrl).toBe('http://localhost:3002');
      expect(loadedSettings.language).toBe('ja');
    });
    
    it('should update config from AppSettings', async () => {
      const appSettings: AppSettings = {
        alwaysOnTop: true,
        detailedMode: false,
        darkMode: 'light',
        confirmDelete: true,
        customCss: '.app { background: blue; }',
        serverUrl: 'http://test-server:4000',
        language: 'en',
        currentView: 'tasks'
      };
      
      await configManager.updateFromAppSettings(appSettings);
      const updatedSettings = configManager.getAppSettings();
      
      expect(updatedSettings).toEqual(appSettings);
    });
    
    it('should reset to defaults', async () => {
      // First set custom config
      const customSettings: AppSettings = {
        alwaysOnTop: true,
        detailedMode: true,
        darkMode: 'dark',
        confirmDelete: false,
        customCss: 'custom',
        serverUrl: 'http://custom:3000',
        language: 'ja',
        currentView: 'tasks'
      };
      
      await configManager.updateFromAppSettings(customSettings);
      
      // Then reset to defaults
      const resetConfig = await configManager.resetToDefaults();
      const appSettings = configManager.getAppSettings();
      
      expect(resetConfig).toEqual(DEFAULT_CONFIG);
      expect(appSettings.alwaysOnTop).toBe(false);
      expect(appSettings.detailedMode).toBe(false);
      expect(appSettings.darkMode).toBe('auto');
      expect(appSettings.confirmDelete).toBe(true);
      expect(appSettings.serverUrl).toBe('http://localhost:3001');
      expect(appSettings.language).toBe('auto');
    });
  });
  
  describe('TOML export/import', () => {
    it('should export config to TOML format', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        app: {
          ...DEFAULT_CONFIG.app,
          window: {
            ...DEFAULT_CONFIG.app.window,
            always_on_top: true,
            width: 1000
          },
          ui: {
            ...DEFAULT_CONFIG.app.ui,
            theme: 'dark' as const,
            language: 'ja' as const
          }
        },
        server: {
          ...DEFAULT_CONFIG.server,
          url: 'http://localhost:3002'
        },
        appearance: {
          ...DEFAULT_CONFIG.appearance,
          custom_css: '.app { color: red; }'
        }
      };
      
      await configManager.saveConfig(customConfig);
      const tomlContent = await configManager.exportConfig();
      
      expect(tomlContent).toContain('always_on_top = true');
      expect(tomlContent).toContain('width = 1000');
      expect(tomlContent).toContain('theme = "dark"');
      expect(tomlContent).toContain('language = "ja"');
      expect(tomlContent).toContain('url = "http://localhost:3002"');
      expect(tomlContent).toContain('custom_css = ".app { color: red; }"');
      expect(tomlContent).toContain('# YuToDo Configuration');
    });
    
    it('should import config from TOML format', async () => {
      const tomlContent = `
# YuToDo Configuration

[app.window]
always_on_top = true
width = 1200
height = 800

[app.ui]
theme = "light"
detailed_mode = true
language = "en"

[server]
url = "http://imported-server:3003"

[appearance]
custom_css = ".imported { background: green; }"
`;
      
      const importedConfig = await configManager.importConfig(tomlContent);
      const appSettings = configManager.getAppSettings();
      
      expect(importedConfig.app.window.always_on_top).toBe(true);
      expect(importedConfig.app.window.width).toBe(1200);
      expect(importedConfig.app.ui.theme).toBe('light');
      expect(importedConfig.app.ui.detailed_mode).toBe(true);
      expect(importedConfig.app.ui.language).toBe('en');
      expect(importedConfig.server.url).toBe('http://imported-server:3003');
      expect(importedConfig.appearance.custom_css).toBe('.imported { background: green; }');
      
      expect(appSettings.alwaysOnTop).toBe(true);
      expect(appSettings.detailedMode).toBe(true);
      expect(appSettings.darkMode).toBe('light');
      expect(appSettings.language).toBe('en');
      expect(appSettings.serverUrl).toBe('http://imported-server:3003');
    });
    
    it('should handle invalid TOML import gracefully', async () => {
      const invalidToml = 'invalid toml content [[[';
      
      await expect(configManager.importConfig(invalidToml)).rejects.toThrow('Invalid TOML format or structure');
    });
  });
  
  describe('config validation', () => {
    it('should validate correct config', () => {
      const validConfig = {
        app: {
          window: { always_on_top: true },
          ui: { theme: 'dark' },
          behavior: { confirm_delete: true }
        },
        server: { url: 'http://localhost:3001' }
      };
      
      expect(configManager.validateConfig(validConfig)).toBe(true);
    });
    
    it('should reject invalid config structure', () => {
      const invalidConfigs = [
        {},
        { app: {} },
        { app: { window: {} }, server: {} },
        { app: { window: { always_on_top: 'not-boolean' }, ui: {}, behavior: {} }, server: { url: 'test' } },
        { app: { window: { always_on_top: true }, ui: { theme: 'invalid' }, behavior: {} }, server: { url: 'test' } },
        { app: { window: { always_on_top: true }, ui: { theme: 'dark' }, behavior: {} }, server: {} }
      ];
      
      invalidConfigs.forEach(config => {
        expect(configManager.validateConfig(config)).toBe(false);
      });
    });
  });
  
  describe('conversion functions', () => {
    it('should convert between AppSettings and TodoAppConfig correctly', () => {
      const appSettings: AppSettings = {
        alwaysOnTop: true,
        detailedMode: false,
        darkMode: 'dark',
        confirmDelete: false,
        customCss: '.test { color: blue; }',
        serverUrl: 'http://test:3000',
        language: 'ja',
        currentView: 'tasks'
      };
      
      const config = appSettingsToConfig(appSettings, DEFAULT_CONFIG);
      const convertedBack = configToAppSettings(config);
      
      expect(convertedBack).toEqual(appSettings);
    });
    
    it('should handle missing optional fields', () => {
      const minimalSettings: AppSettings = {
        alwaysOnTop: false,
        detailedMode: false,
        darkMode: 'auto',
        confirmDelete: true,
        customCss: '',
        serverUrl: 'http://localhost:3001',
        language: 'auto',
        currentView: 'tasks'
      };
      
      const config = appSettingsToConfig(minimalSettings, DEFAULT_CONFIG);
      const convertedBack = configToAppSettings(config);
      
      expect(convertedBack).toEqual(minimalSettings);
    });
  });
  
  describe('localStorage persistence', () => {
    it('should persist settings across ConfigManager instances', async () => {
      const settings: AppSettings = {
        alwaysOnTop: true,
        detailedMode: true,
        darkMode: 'dark',
        confirmDelete: false,
        customCss: '.persistent { color: purple; }',
        serverUrl: 'http://persistent:3000',
        language: 'ja',
        currentView: 'tasks'
      };
      
      await configManager.updateFromAppSettings(settings);
      
      // Create new instance
      const newConfigManager = new ConfigManager();
      await newConfigManager.initialize();
      const persistedSettings = newConfigManager.getAppSettings();
      
      expect(persistedSettings).toEqual(settings);
    });
    
    it('should handle localStorage quota exceeded gracefully', async () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const settings: AppSettings = {
        alwaysOnTop: true,
        detailedMode: true,
        darkMode: 'dark',
        confirmDelete: false,
        customCss: '.large-css { /* very large css content */ }',
        serverUrl: 'http://localhost:3001',
        language: 'auto',
        currentView: 'tasks'
      };
      
      // Should not throw, but handle gracefully
      await expect(configManager.updateFromAppSettings(settings)).resolves.not.toThrow();
      
      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });
  });
  
  describe('edge cases', () => {
    it('should handle undefined and null values correctly', async () => {
      const configWithUndefined = {
        ...DEFAULT_CONFIG,
        appearance: {
          ...DEFAULT_CONFIG.appearance,
          custom_css: undefined,
          font_family: undefined
        }
      };
      
      await configManager.saveConfig(configWithUndefined);
      const tomlContent = await configManager.exportConfig();
      
      // TOML should not include undefined values
      expect(tomlContent).not.toContain('custom_css = undefined');
      expect(tomlContent).not.toContain('font_family = null');
    });
    
    it('should handle special characters in strings', async () => {
      const settingsWithSpecialChars: AppSettings = {
        alwaysOnTop: false,
        detailedMode: false,
        darkMode: 'auto',
        confirmDelete: true,
        customCss: '.test { content: "quotes \\"escaped\\""; }',
        serverUrl: 'http://localhost:3001',
        language: 'auto',
        currentView: 'tasks'
      };
      
      await configManager.updateFromAppSettings(settingsWithSpecialChars);
      const tomlContent = await configManager.exportConfig();
      const importedConfig = await configManager.importConfig(tomlContent);
      const resultSettings = configToAppSettings(importedConfig);
      
      expect(resultSettings.customCss).toBe(settingsWithSpecialChars.customCss);
    });
  });
});