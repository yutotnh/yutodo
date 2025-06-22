import { useState, useEffect, useCallback } from 'react';
import { AppSettingsFile, Keybinding, SettingsChangeEvent } from '../types/settings';
import { settingsManager } from '../config/SettingsManager';
import { getMigrationData, completeMigration, isMigrationNeeded, isTauriEnvironment } from '../config/migrationUtils';
import logger from '../utils/logger';

interface UseFileSettingsReturn {
  settings: AppSettingsFile | null;
  keybindings: Keybinding[];
  isLoading: boolean;
  error: Error | null;
  lastChangeSource: 'app' | 'file' | 'migration' | null;
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
  const [lastChangeSource, setLastChangeSource] = useState<'app' | 'file' | 'migration' | null>(null);
  
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
        // Check if migration is needed
        logger.info('Checking if migration is needed...');
        const needsMigration = await isMigrationNeeded();
        logger.info('Migration needed:', needsMigration);
        
        // Get migration data if needed
        let migrationData = null;
        if (needsMigration) {
          logger.info('Starting migration from localStorage to file-based settings');
          migrationData = getMigrationData();
          
          if (migrationData) {
            logger.info('Migration data prepared, will apply after initialization');
          }
        }
        
        // Initialize settings manager
        logger.info('Starting SettingsManager initialization...');
        await settingsManager.initialize();
        logger.info('SettingsManager initialization completed successfully');
        
        // Apply migration data if needed
        if (migrationData) {
          logger.info('Applying migration data...');
          try {
            // Update settings
            await settingsManager.updateSettings(migrationData.settings);
            
            // Add custom keybindings if any
            for (const kb of migrationData.keybindings) {
              await settingsManager.addKeybinding(kb);
            }
            
            // Complete migration by backing up and clearing localStorage
            await completeMigration();
            logger.info('Migration completed successfully');
          } catch (error) {
            logger.error('Failed to apply migration data:', error);
          }
        }
        
        if (!mounted) return;
        
        // Get initial values
        setSettings(settingsManager.getSettings());
        setKeybindings(settingsManager.getKeybindings());
        
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
    try {
      await settingsManager.updateSettings(updates);
    } catch (err) {
      logger.error('Failed to update settings:', err);
      throw err;
    }
  }, []);
  
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
    alwaysOnTop: fileSettings.app.alwaysOnTop,
    detailedMode: fileSettings.app.detailedMode,
    darkMode: fileSettings.app.theme,
    confirmDelete: fileSettings.app.confirmDelete,
    customCss: fileSettings.appearance.customCss,
    serverUrl: fileSettings.server.url,
    language: fileSettings.app.language,
    currentView: fileSettings.app.currentView
  };
}

/**
 * Convert app settings to file settings for backward compatibility
 */
export function appSettingsToFileSettings(appSettings: any): Partial<AppSettingsFile> {
  const updates: any = {};
  
  if (appSettings.alwaysOnTop !== undefined) {
    updates.app = updates.app || {};
    updates.app.alwaysOnTop = appSettings.alwaysOnTop;
  }
  
  if (appSettings.detailedMode !== undefined) {
    updates.app = updates.app || {};
    updates.app.detailedMode = appSettings.detailedMode;
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
  
  if (appSettings.currentView !== undefined) {
    updates.app = updates.app || {};
    updates.app.currentView = appSettings.currentView;
  }
  
  return updates;
}