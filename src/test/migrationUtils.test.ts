import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  migrateToFileBasedSettings, 
  isMigrationNeeded, 
  isTauriEnvironment 
} from '../config/migrationUtils';
import { settingsManager } from '../config/SettingsManager';
import * as fs from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';

// Mock the modules
vi.mock('@tauri-apps/plugin-fs');
vi.mock('@tauri-apps/api/path');
vi.mock('../config/SettingsManager', () => ({
  settingsManager: {
    getSettingsPath: vi.fn(() => '/home/user/.config/YuToDo/settings.toml'),
    updateSettings: vi.fn(),
    addKeybinding: vi.fn()
  }
}));

describe('migrationUtils', () => {
  const mockAppDataDir = '/home/user/.config';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock path functions
    vi.mocked(path.appDataDir).mockResolvedValue(mockAppDataDir);
    vi.mocked(path.join).mockImplementation((...paths) => Promise.resolve(paths.join('/')));
    
    // Mock file system functions
    vi.mocked(fs.exists).mockResolvedValue(false);
    vi.mocked(fs.writeTextFile).mockResolvedValue();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mock Tauri environment
    (window as any).__TAURI_INTERNALS__ = {};
  });
  
  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
  });

  describe('isTauriEnvironment', () => {
    it('should return true when in Tauri environment', () => {
      (window as any).__TAURI_INTERNALS__ = {};
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return false when not in Tauri environment', () => {
      delete (window as any).__TAURI_INTERNALS__;
      expect(isTauriEnvironment()).toBe(false);
    });
  });

  describe('isMigrationNeeded', () => {
    it('should return false when not in Tauri environment', async () => {
      delete (window as any).__TAURI_INTERNALS__;
      
      const result = await isMigrationNeeded();
      expect(result).toBe(false);
    });

    it('should return false when no old settings exist', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      const result = await isMigrationNeeded();
      expect(result).toBe(false);
    });

    it('should return false when new settings already exist', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('{"theme":"dark"}');
      vi.mocked(fs.exists).mockResolvedValue(true);
      
      const result = await isMigrationNeeded();
      expect(result).toBe(false);
    });

    it('should return true when old settings exist but new settings do not', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('{"theme":"dark"}');
      vi.mocked(fs.exists).mockResolvedValue(false);
      
      const result = await isMigrationNeeded();
      expect(result).toBe(true);
    });
  });

  describe('migrateToFileBasedSettings', () => {
    const oldSettings = {
      alwaysOnTop: true,
      detailedMode: false,
      darkMode: 'dark' as const,
      confirmDelete: false,
      customCss: '.custom { color: red; }',
      serverUrl: 'http://localhost:4000',
      language: 'ja' as const,
      currentView: 'schedules' as const
    };

    it('should return false if settings file already exists', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      
      const result = await migrateToFileBasedSettings();
      expect(result).toBe(false);
      expect(settingsManager.updateSettings).not.toHaveBeenCalled();
    });

    it('should return false if no old settings exist', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      const result = await migrateToFileBasedSettings();
      expect(result).toBe(false);
      expect(settingsManager.updateSettings).not.toHaveBeenCalled();
    });

    it('should migrate old settings to new format', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      
      const result = await migrateToFileBasedSettings();
      
      expect(result).toBe(true);
      expect(settingsManager.updateSettings).toHaveBeenCalledWith({
        app: {
          theme: 'dark',
          language: 'ja',
          alwaysOnTop: true,
          detailedMode: false,
          confirmDelete: false,
          currentView: 'schedules'
        },
        server: {
          url: 'http://localhost:4000',
          reconnectInterval: 5000,
          timeout: 30000
        },
        ui: {
          autoHideHeader: true,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif'
        },
        appearance: {
          customCss: '.custom { color: red; }'
        }
      });
    });

    it('should handle default values correctly', async () => {
      const minimalSettings = { darkMode: 'auto' as const };
      
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(minimalSettings));
      
      await migrateToFileBasedSettings();
      
      expect(settingsManager.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          app: expect.objectContaining({
            theme: 'auto',
            language: 'auto',
            alwaysOnTop: false,
            detailedMode: false,
            confirmDelete: true, // Default is true
            currentView: 'tasks'
          })
        })
      );
    });

    it('should migrate custom keybindings if present', async () => {
      const settingsWithKeybindings = {
        ...oldSettings,
        keybindings: {
          'Ctrl+T': 'newTab',
          'Ctrl+W': 'closeTab'
        }
      };
      
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(settingsWithKeybindings));
      
      await migrateToFileBasedSettings();
      
      expect(settingsManager.addKeybinding).toHaveBeenCalledWith({
        key: 'Ctrl+T',
        command: 'newTab'
      });
      expect(settingsManager.addKeybinding).toHaveBeenCalledWith({
        key: 'Ctrl+W',
        command: 'closeTab'
      });
    });

    it('should backup old settings', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      
      await migrateToFileBasedSettings();
      
      // Check that backup was created
      expect(fs.writeTextFile).toHaveBeenCalledWith(
        expect.stringContaining('localStorage-backup'),
        JSON.stringify(oldSettings)
      );
    });

    it('should remove old settings from localStorage after migration', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      
      await migrateToFileBasedSettings();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('yutodoAppSettings');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      vi.mocked(settingsManager.updateSettings).mockRejectedValue(new Error('Write failed'));
      
      await expect(migrateToFileBasedSettings()).rejects.toThrow('Write failed');
    });

    it('should continue even if backup fails', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      vi.mocked(fs.writeTextFile).mockRejectedValueOnce(new Error('Backup failed'));
      
      const result = await migrateToFileBasedSettings();
      
      expect(result).toBe(true);
      expect(settingsManager.updateSettings).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle invalid JSON in localStorage', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
      
      await expect(migrateToFileBasedSettings()).rejects.toThrow();
    });
  });
});