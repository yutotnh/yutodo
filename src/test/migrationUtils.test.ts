import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getMigrationData, 
  completeMigration,
  isMigrationNeeded, 
  isTauriEnvironment 
} from '../config/migrationUtils';
import * as fs from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';

// Mock the modules
vi.mock('@tauri-apps/plugin-fs');
vi.mock('@tauri-apps/api/path');

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

  describe('getMigrationData', () => {
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

    it('should return null if no old settings exist', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      const result = getMigrationData();
      expect(result).toBeNull();
    });

    it('should convert old settings to new format', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      
      const result = getMigrationData();
      
      expect(result).not.toBeNull();
      expect(result?.settings).toEqual({
        app: {
          theme: 'dark',
          language: 'ja',
          alwaysOnTop: true,
          confirmDelete: false,
          startupView: 'schedules'
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

    it('should handle default values correctly', () => {
      const minimalSettings = { darkMode: 'auto' as const };
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(minimalSettings));
      
      const result = getMigrationData();
      
      expect(result?.settings.app).toMatchObject({
        theme: 'auto',
        language: 'auto',
        alwaysOnTop: false,
        confirmDelete: true, // Default is true
        startupView: 'tasks-detailed'
      });
    });

    it('should extract custom keybindings if present', () => {
      const settingsWithKeybindings = {
        ...oldSettings,
        keybindings: {
          'Ctrl+T': 'newTab',
          'Ctrl+W': 'closeTab'
        }
      };
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(settingsWithKeybindings));
      
      const result = getMigrationData();
      
      expect(result?.keybindings).toContainEqual({
        key: 'Ctrl+T',
        command: 'newTab'
      });
      expect(result?.keybindings).toContainEqual({
        key: 'Ctrl+W',
        command: 'closeTab'
      });
    });

    it('should handle invalid JSON gracefully', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
      
      const result = getMigrationData();
      expect(result).toBeNull();
    });
  });

  describe('completeMigration', () => {
    const oldSettings = {
      alwaysOnTop: true,
      detailedMode: false,
      darkMode: 'dark' as const
    };

    it('should backup and remove old settings', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      
      await completeMigration();
      
      // Check that backup was created
      expect(fs.writeTextFile).toHaveBeenCalledWith(
        expect.stringContaining('localStorage-backup'),
        JSON.stringify(oldSettings)
      );
      
      // Check that localStorage was cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith('yutodoAppSettings');
    });

    it('should handle missing localStorage data gracefully', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      await completeMigration();
      
      expect(fs.writeTextFile).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should continue even if backup fails', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(oldSettings));
      vi.mocked(fs.writeTextFile).mockRejectedValue(new Error('Backup failed'));
      
      // Should not throw
      await completeMigration();
      
      // Should still remove from localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith('yutodoAppSettings');
    });
  });
});