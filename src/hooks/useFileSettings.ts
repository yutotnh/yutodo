import { useState, useEffect, useCallback } from 'react';
import { AppSettingsFile, Keybinding, SettingsChangeEvent } from '../types/settings';
import { settingsManager } from '../config/SettingsManager';
import logger from '../utils/logger';

// Helper function to check if we're in Tauri environment
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface UseFileSettingsReturn {
  settings: AppSettingsFile | null;
  keybindings: Keybinding[];
  isLoading: boolean;
  error: Error | null;
  lastChangeSource: 'app' | 'file' | null;
  updateSettings: (updates: Partial<AppSettingsFile>) => Promise<void>;
  addKeybinding: (keybinding: Keybinding) => Promise<void>;
  removeKeybinding: (key: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  openSettingsFile: () => Promise<void>;
  openKeybindingsFile: () => Promise<void>;
}

/**
 * React hook for file-based settings management
 */
export function useFileSettings(): UseFileSettingsReturn {
  const [settings, setSettings] = useState<AppSettingsFile | null>(null);
  const [keybindings, setKeybindings] = useState<Keybinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastChangeSource, setLastChangeSource] = useState<'app' | 'file' | null>(null);
  
  // Initialize settings manager
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    
    const initialize = async () => {
      if (!isTauriEnvironment()) {
        logger.info('Not in Tauri environment, skipping file-based settings');
        setIsLoading(false);
        return;
      }
      
      try {
        // Initialize settings manager
        logger.info('Starting SettingsManager initialization...');
        await settingsManager.initialize();
        logger.info('SettingsManager initialization completed successfully');
        
        if (!mounted) return;
        
        // Get initial values
        const initialSettings = settingsManager.getSettings();
        const initialKeybindings = settingsManager.getKeybindings();
        
        
        setSettings(initialSettings);
        setKeybindings(initialKeybindings);
        
        // Subscribe to changes
        unsubscribe = settingsManager.onChange((event: SettingsChangeEvent) => {
          if (!mounted) {
            return;
          }
          
          if (event.type === 'settings') {
            setLastChangeSource(event.source);
            setSettings(event.current as AppSettingsFile);
          } else if (event.type === 'keybindings') {
            setLastChangeSource(event.source);
            setKeybindings(event.current as Keybinding[]);
          }
        });
        
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to initialize file settings:', err);
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Update settings
  const updateSettings = useCallback(async (updates: Partial<AppSettingsFile>) => {
    if (isLoading) {
      logger.warn('SettingsManager still loading, queueing settings update');
      throw new Error('Settings manager is still initializing. Please wait and try again.');
    }
    
    try {
      await settingsManager.updateSettings(updates);
    } catch (err) {
      logger.error('Failed to update settings:', err);
      throw err;
    }
  }, [isLoading]);
  
  // Add keybinding
  const addKeybinding = useCallback(async (keybinding: Keybinding) => {
    try {
      await settingsManager.addKeybinding(keybinding);
    } catch (err) {
      logger.error('Failed to add keybinding:', err);
      throw err;
    }
  }, []);
  
  // Remove keybinding
  const removeKeybinding = useCallback(async (key: string) => {
    try {
      await settingsManager.removeKeybinding(key);
    } catch (err) {
      logger.error('Failed to remove keybinding:', err);
      throw err;
    }
  }, []);
  
  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      // TODO: Implement reset functionality in SettingsManager
      logger.warn('Reset to defaults not yet implemented');
    } catch (err) {
      logger.error('Failed to reset settings:', err);
      throw err;
    }
  }, []);
  
  // Open settings file in editor
  const openSettingsFile = useCallback(async () => {
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const path = settingsManager.getSettingsPath();
      await openPath(path);
    } catch (err) {
      logger.error('Failed to open settings file:', err);
      throw err;
    }
  }, []);
  
  // Open keybindings file in editor
  const openKeybindingsFile = useCallback(async () => {
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const path = settingsManager.getKeybindingsPath();
      await openPath(path);
    } catch (err) {
      logger.error('Failed to open keybindings file:', err);
      throw err;
    }
  }, []);
  
  return {
    settings,
    keybindings,
    isLoading,
    error,
    lastChangeSource,
    updateSettings,
    addKeybinding,
    removeKeybinding,
    resetToDefaults,
    openSettingsFile,
    openKeybindingsFile
  };
}

/**
 * Convert file settings to app settings for backward compatibility
 */
export function fileSettingsToAppSettings(fileSettings: AppSettingsFile): any {
  return {
    startupAlwaysOnTop: fileSettings.app.startupAlwaysOnTop,
    darkMode: fileSettings.app.theme,
    confirmDelete: fileSettings.app.confirmDelete,
    customCss: fileSettings.appearance.customCss,
    serverUrl: fileSettings.server.url,
    language: fileSettings.app.language,
    startupView: fileSettings.app.startupView
  };
}

/**
 * Convert app settings to file settings for backward compatibility
 */
export function appSettingsToFileSettings(appSettings: any): Partial<AppSettingsFile> {
  const updates: any = {};
  
  if (appSettings.startupAlwaysOnTop !== undefined) {
    updates.app = updates.app || {};
    updates.app.startupAlwaysOnTop = appSettings.startupAlwaysOnTop;
  }
  
  
  if (appSettings.darkMode !== undefined) {
    updates.app = updates.app || {};
    updates.app.theme = appSettings.darkMode;
  }
  
  if (appSettings.confirmDelete !== undefined) {
    updates.app = updates.app || {};
    updates.app.confirmDelete = appSettings.confirmDelete;
  }
  
  if (appSettings.customCss !== undefined) {
    updates.appearance = updates.appearance || {};
    updates.appearance.customCss = appSettings.customCss;
  }
  
  if (appSettings.serverUrl !== undefined) {
    updates.server = updates.server || {};
    updates.server.url = appSettings.serverUrl;
  }
  
  if (appSettings.language !== undefined) {
    updates.app = updates.app || {};
    updates.app.language = appSettings.language;
  }
  
  if (appSettings.startupView !== undefined) {
    updates.app = updates.app || {};
    updates.app.startupView = appSettings.startupView;
  }
  
  // Backward compatibility: handle legacy currentView property
  if (appSettings.currentView !== undefined) {
    updates.app = updates.app || {};
    updates.app.startupView = appSettings.currentView;
  }
  
  return updates;
}