import { useState, useEffect, useCallback } from 'react';
import { AppSettingsFile, Keybinding, SettingsChangeEvent, SettingsFileError } from '../types/settings';
import { settingsManager } from '../config/SettingsManager';
import logger from '../utils/logger';

// Helper function to check if we're in Tauri environment
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

// Helper function to parse SettingsError into SettingsFileError
function parseSettingsError(settingsError: any): SettingsFileError | null {
  try {
    // Extract error details from the SettingsError
    const originalError = settingsError.details;
    const errorDetails: any = {};
    
    // Parse TOML parsing error for line/column information
    if (originalError && typeof originalError.message === 'string') {
      const errorMessage = originalError.message;
      
      // Try to extract line/column from TOML parsing error
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const columnMatch = errorMessage.match(/column (\d+)/i);
      const atLineMatch = errorMessage.match(/at line (\d+)/i);
      
      if (lineMatch || atLineMatch || columnMatch) {
        errorDetails.line = lineMatch ? parseInt(lineMatch[1]) : (atLineMatch ? parseInt(atLineMatch[1]) : undefined);
        errorDetails.column = columnMatch ? parseInt(columnMatch[1]) : undefined;
        
        // Extract problem text and context
        if (errorMessage.includes('unexpected')) {
          errorDetails.problemText = errorMessage.match(/unexpected (.+)/i)?.[1];
        }
        
        // Provide suggestions based on common TOML errors
        if (errorMessage.includes('escape')) {
          errorDetails.suggestion = 'Remove backslash escape characters (\\) in string values';
          errorDetails.expectedFormat = 'Use plain string without escapes: when = "!inputFocus"';
        } else if (errorMessage.includes('invalid')) {
          errorDetails.suggestion = 'Check TOML syntax - ensure proper quotes and formatting';
        }
      }
    }
    
    // Determine file type from path
    const filePath = settingsError.filePath || '';
    const fileType = filePath.includes('keybindings') ? 'keybindings' : 'settings';
    
    // Generate user-friendly error messages
    let userMessage = '';
    if (fileType === 'keybindings') {
      userMessage = 'Keyboard shortcuts configuration file has syntax errors.';
    } else {
      userMessage = 'Settings configuration file has syntax errors.';
    }
    
    if (errorDetails.line) {
      userMessage += ` Check line ${errorDetails.line}.`;
    }
    
    if (errorDetails.suggestion) {
      userMessage += ` ${errorDetails.suggestion}`;
    }
    
    return {
      type: fileType,
      code: settingsError.code || 'PARSE_ERROR',
      message: settingsError.message || 'Failed to parse configuration file',
      userMessage,
      filePath,
      details: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
      canAutoFix: errorDetails.suggestion?.includes('escape') || false,
      severity: 'error'
    };
  } catch (parseError) {
    logger.error('Failed to parse settings error:', parseError);
    return null;
  }
}

interface UseFileSettingsReturn {
  settings: AppSettingsFile | null;
  keybindings: Keybinding[];
  isLoading: boolean;
  error: Error | null;
  settingsErrors: SettingsFileError[];
  lastChangeSource: 'app' | 'file' | null;
  updateSettings: (updates: Partial<AppSettingsFile>) => Promise<void>;
  addKeybinding: (keybinding: Keybinding) => Promise<void>;
  removeKeybinding: (key: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  openSettingsFile: () => Promise<void>;
  openKeybindingsFile: () => Promise<void>;
  clearError: (type: 'settings' | 'keybindings') => void;
  autoFixFile: (error: SettingsFileError) => Promise<boolean>;
}

/**
 * React hook for file-based settings management
 */
export function useFileSettings(): UseFileSettingsReturn {
  const [settings, setSettings] = useState<AppSettingsFile | null>(null);
  const [keybindings, setKeybindings] = useState<Keybinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [settingsErrors, setSettingsErrors] = useState<SettingsFileError[]>([]);
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
        const initialParseErrors = settingsManager.getParseErrors();
        
        setSettings(initialSettings);
        setKeybindings(initialKeybindings);
        
        // Convert parse errors to SettingsFileError format
        if (initialParseErrors.length > 0) {
          const convertedErrors = initialParseErrors.map(parseError => parseSettingsError({
            code: 'PARSE_ERROR',
            message: parseError.error.message || 'Failed to parse configuration file',
            filePath: parseError.filePath,
            details: parseError.error
          })).filter(Boolean) as SettingsFileError[];
          
          setSettingsErrors(convertedErrors);
        }
        
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
          // Handle SettingsError specifically for TOML parsing issues
          if (err instanceof Error && err.name === 'SettingsError') {
            const settingsError = err as any; // SettingsError type
            const parsedError = parseSettingsError(settingsError);
            if (parsedError) {
              setSettingsErrors([parsedError]);
            }
          }
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
  
  // Clear specific error type
  const clearError = useCallback((type: 'settings' | 'keybindings') => {
    setSettingsErrors(prev => prev.filter(error => error.type !== type));
  }, []);

  // Auto-fix file errors
  const autoFixFile = useCallback(async (error: SettingsFileError): Promise<boolean> => {
    try {
      logger.info('Starting auto-fix for error:', error.type, error.code);
      
      // Use SettingsManager's auto-fix functionality
      const success = await settingsManager.autoFixFile(error.filePath, {
        message: error.message
      });
      
      if (success) {
        // Clear the specific error from SettingsManager
        settingsManager.clearParseErrors();
        
        // Clear the error from our state since it should be fixed
        clearError(error.type);
        logger.info('Auto-fix completed successfully');
      } else {
        logger.warn('Auto-fix failed to resolve the error');
      }
      
      return success;
    } catch (error) {
      logger.error('Auto-fix process failed:', error);
      return false;
    }
  }, [clearError]);
  
  return {
    settings,
    keybindings,
    isLoading,
    error,
    settingsErrors,
    lastChangeSource,
    updateSettings,
    addKeybinding,
    removeKeybinding,
    resetToDefaults,
    openSettingsFile,
    openKeybindingsFile,
    clearError,
    autoFixFile
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