import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileSettings, fileSettingsToAppSettings, appSettingsToFileSettings } from '../hooks/useFileSettings';
import { settingsManager } from '../config/SettingsManager';

// Mock dependencies
vi.mock('../config/SettingsManager');
vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: vi.fn()
}));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn()
}));

describe('useFileSettings', () => {
  const mockSettings = {
    app: {
      theme: 'dark' as const,
      language: 'en' as const,
      startupAlwaysOnTop: true,
      confirmDelete: true,
      startupView: 'tasks-detailed' as const
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

  const mockKeybindings = [
    { key: 'Ctrl+N', command: 'newTask' },
    { key: 'Ctrl+S', command: 'save' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Tauri environment
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {},
      writable: true
    });
    
    // Mock settingsManager
    vi.mocked(settingsManager.initialize).mockResolvedValue();
    vi.mocked(settingsManager.getSettings).mockReturnValue(mockSettings);
    vi.mocked(settingsManager.getKeybindings).mockReturnValue(mockKeybindings);
    vi.mocked(settingsManager.onChange).mockReturnValue(() => {});
    vi.mocked(settingsManager.updateSettings).mockResolvedValue();
    vi.mocked(settingsManager.addKeybinding).mockResolvedValue();
    vi.mocked(settingsManager.removeKeybinding).mockResolvedValue();
    vi.mocked(settingsManager.getSettingsPath).mockReturnValue('/path/to/settings.toml');
    vi.mocked(settingsManager.getKeybindingsPath).mockReturnValue('/path/to/keybindings.toml');
    
    // Reset the getSettings mock for each test to allow dynamic updates
    vi.mocked(settingsManager.getSettings).mockClear();
    vi.mocked(settingsManager.getSettings).mockReturnValue(mockSettings);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should skip initialization when not in Tauri environment', async () => {
      // Save original value and temporarily set to undefined
      const originalTauriInternals = (window as any).__TAURI_INTERNALS__;
      (window as any).__TAURI_INTERNALS__ = undefined;
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.settings).toBeNull();
      expect(result.current.keybindings).toEqual([]);
      expect(settingsManager.initialize).not.toHaveBeenCalled();
      
      // Restore original value
      (window as any).__TAURI_INTERNALS__ = originalTauriInternals;
    });

    it('should initialize settings manager and load settings', async () => {
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(settingsManager.initialize).toHaveBeenCalled();
      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.keybindings).toEqual(mockKeybindings);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      vi.mocked(settingsManager.initialize).mockRejectedValue(error);
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe(error);
      expect(result.current.settings).toBeNull();
    });

    it.skip('should subscribe to settings changes', async () => {
      let changeListener: Function | null = null;
      vi.mocked(settingsManager.onChange).mockImplementation((listener) => {
        changeListener = listener;
        return () => {};
      });
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Verify initial settings
      expect(result.current.settings).toEqual(mockSettings);
      
      // Simulate settings change - change from 'dark' to 'light'
      const newSettings = { ...mockSettings, app: { ...mockSettings.app, theme: 'light' as const } };
      
      act(() => {
        changeListener?.({
          type: 'settings',
          previous: mockSettings,
          current: newSettings,
          source: 'file'
        });
      });
      
      // Wait for the state update to be applied
      await waitFor(() => {
        expect(result.current.settings).toEqual(newSettings);
      });
    });

    it.skip('should unsubscribe on unmount', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(settingsManager.onChange).mockImplementation(() => unsubscribe);
      
      const { result, unmount } = renderHook(() => useFileSettings());
      
      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Verify onChange was called during initialization
      expect(settingsManager.onChange).toHaveBeenCalled();
      
      unmount();
      
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update settings through settings manager', async () => {
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const updates = { app: { theme: 'light' as const } } as any;
      
      await act(async () => {
        await result.current.updateSettings(updates);
      });
      
      expect(settingsManager.updateSettings).toHaveBeenCalledWith(updates);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      vi.mocked(settingsManager.updateSettings).mockRejectedValue(error);
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await expect(result.current.updateSettings({})).rejects.toThrow('Update failed');
    });
  });

  describe('Keybinding management', () => {
    it('should add keybinding', async () => {
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const newKeybinding = { key: 'Ctrl+T', command: 'newTab' };
      
      await act(async () => {
        await result.current.addKeybinding(newKeybinding);
      });
      
      expect(settingsManager.addKeybinding).toHaveBeenCalledWith(newKeybinding);
    });

    it('should remove keybinding', async () => {
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.removeKeybinding('Ctrl+N');
      });
      
      expect(settingsManager.removeKeybinding).toHaveBeenCalledWith('Ctrl+N');
    });
  });

  describe('File operations', () => {
    it('should open settings file', async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.openSettingsFile();
      });
      
      expect(openPath).toHaveBeenCalledWith('/path/to/settings.toml');
    });

    it('should open keybindings file', async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.openKeybindingsFile();
      });
      
      expect(openPath).toHaveBeenCalledWith('/path/to/keybindings.toml');
    });

    it('should fallback to clipboard when settings file opening fails', async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      
      // Mock openPath to fail
      vi.mocked(openPath).mockRejectedValue(new Error('Not allowed to open path'));
      vi.mocked(writeText).mockResolvedValue();
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.openSettingsFile();
      });
      
      expect(openPath).toHaveBeenCalledWith('/path/to/settings.toml');
      expect(writeText).toHaveBeenCalledWith('/path/to/settings.toml');
    });

    it('should fallback to clipboard when keybindings file opening fails', async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      
      // Mock openPath to fail
      vi.mocked(openPath).mockRejectedValue(new Error('Not allowed to open path'));
      vi.mocked(writeText).mockResolvedValue();
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.openKeybindingsFile();
      });
      
      expect(openPath).toHaveBeenCalledWith('/path/to/keybindings.toml');
      expect(writeText).toHaveBeenCalledWith('/path/to/keybindings.toml');
    });

    it('should throw original error when both file opening and clipboard fail', async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      
      const originalError = new Error('Not allowed to open path');
      const clipboardError = new Error('Clipboard access denied');
      
      // Mock both operations to fail
      vi.mocked(openPath).mockRejectedValue(originalError);
      vi.mocked(writeText).mockRejectedValue(clipboardError);
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await expect(result.current.openSettingsFile()).rejects.toThrow('Not allowed to open path');
      
      expect(openPath).toHaveBeenCalledWith('/path/to/settings.toml');
      expect(writeText).toHaveBeenCalledWith('/path/to/settings.toml');
    });

    it('should throw original error when both keybindings file opening and clipboard fail', async () => {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      
      const originalError = new Error('Not allowed to open path');
      const clipboardError = new Error('Clipboard access denied');
      
      // Mock both operations to fail
      vi.mocked(openPath).mockRejectedValue(originalError);
      vi.mocked(writeText).mockRejectedValue(clipboardError);
      
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await expect(result.current.openKeybindingsFile()).rejects.toThrow('Not allowed to open path');
      
      expect(openPath).toHaveBeenCalledWith('/path/to/keybindings.toml');
      expect(writeText).toHaveBeenCalledWith('/path/to/keybindings.toml');
    });
  });

  describe('resetToDefaults', () => {
    it('should log warning for unimplemented feature', async () => {
      const { result } = renderHook(() => useFileSettings());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.resetToDefaults();
      });
      
      // Feature is not yet implemented
      expect(settingsManager.updateSettings).not.toHaveBeenCalled();
    });
  });
});

describe('Conversion functions', () => {
  describe('fileSettingsToAppSettings', () => {
    it('should convert file settings to app settings format', () => {
      const fileSettings = {
        app: {
          theme: 'dark' as const,
          language: 'ja' as const,
          startupAlwaysOnTop: true,
          detailedMode: false,
          confirmDelete: false,
          startupView: 'schedules' as const
        },
        server: {
          url: 'http://localhost:4000',
          reconnectInterval: 3000,
          timeout: 60000
        },
        ui: {
          autoHideHeader: false,
          fontSize: 16,
          fontFamily: 'Roboto'
        },
        appearance: {
          customCss: '.custom { color: blue; }'
        }
      };
      
      const appSettings = fileSettingsToAppSettings(fileSettings);
      
      expect(appSettings).toEqual({
        startupAlwaysOnTop: true,
        darkMode: 'dark',
        confirmDelete: false,
        customCss: '.custom { color: blue; }',
        serverUrl: 'http://localhost:4000',
        language: 'ja',
        startupView: 'schedules'
      });
    });
  });

  describe('appSettingsToFileSettings', () => {
    it('should convert app settings to file settings format', () => {
      const appSettings = {
        startupAlwaysOnTop: true,
        darkMode: 'light' as const,
        confirmDelete: true,
        customCss: '.todo { color: green; }',
        serverUrl: 'http://localhost:5000',
        language: 'en' as const,
        startupView: 'tasks-detailed' as const
      };
      
      const fileSettings = appSettingsToFileSettings(appSettings);
      
      expect(fileSettings).toEqual({
        app: {
          startupAlwaysOnTop: true,
          theme: 'light',
          confirmDelete: true,
          language: 'en',
          startupView: 'tasks-detailed'
        },
        server: {
          url: 'http://localhost:5000'
        },
        appearance: {
          customCss: '.todo { color: green; }'
        }
      });
    });

    it('should handle partial updates', () => {
      const partialSettings = {
        darkMode: 'auto' as const,
        serverUrl: 'http://localhost:8080'
      };
      
      const fileSettings = appSettingsToFileSettings(partialSettings);
      
      expect(fileSettings).toEqual({
        app: {
          theme: 'auto'
        },
        server: {
          url: 'http://localhost:8080'
        }
      });
    });

    it('should not include undefined values', () => {
      const settingsWithUndefined = {
        alwaysOnTop: undefined,
        darkMode: 'dark' as const
      };
      
      const fileSettings = appSettingsToFileSettings(settingsWithUndefined);
      
      expect(fileSettings).toEqual({
        app: {
          theme: 'dark'
        }
      });
      expect(fileSettings.app).not.toHaveProperty('alwaysOnTop');
    });
  });
});