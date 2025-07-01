import { useState, useEffect, useCallback } from 'react';
import { AppSettingsFile, Keybinding, SettingsChangeEvent, SettingsFileError } from '../types/settings';
import { settingsManager } from '../config/SettingsManager';
import logger from '../utils/logger';

// Helper function to check if we're in Tauri environment
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

// Helper function to parse SettingsError into SettingsFileError
function parseSettingsError(parseError: any): SettingsFileError | null {
  try {
    
    // Extract the actual error object
    const originalError = parseError.error;
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
    
    // Determine file type from parseError
    const filePath = parseError.filePath || '';
    const fileType = parseError.type || (filePath.includes('keybindings') ? 'keybindings' : 'settings');
    
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
    
    const result: SettingsFileError = {
      type: fileType as 'settings' | 'keybindings',
      code: 'PARSE_ERROR',
      message: originalError?.message || 'Failed to parse configuration file',
      userMessage,
      filePath,
      details: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
      severity: 'error'
    };
    return result;
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
  copiedToClipboard: string | null;
  updateSettings: (updates: Partial<AppSettingsFile>) => Promise<void>;
  addKeybinding: (keybinding: Keybinding) => Promise<void>;
  removeKeybinding: (key: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  openSettingsFile: () => Promise<void>;
  openKeybindingsFile: () => Promise<void>;
  clearError: (type: 'settings' | 'keybindings') => void;
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
  const [copiedToClipboard, setCopiedToClipboard] = useState<string | null>(null);
  
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
        logger.debug('Initial parse errors from SettingsManager:', initialParseErrors.length);
        if (initialParseErrors.length > 0) {
          const convertedErrors = initialParseErrors
            .map(parseError => parseSettingsError(parseError))
            .filter(Boolean) as SettingsFileError[];
          
          logger.debug('Setting initial settings errors:', convertedErrors.length);
          setSettingsErrors(convertedErrors);
        } else {
          logger.debug('No initial parse errors found');
        }
        
        // Subscribe to changes
        unsubscribe = settingsManager.onChange((event: SettingsChangeEvent) => {
          if (!mounted) {
            return;
          }
          
          logger.debug('Settings change event received:', event.type, 'source:', event.source);
          
          if (event.type === 'settings') {
            setLastChangeSource(event.source);
            setSettings(event.current as AppSettingsFile);
          } else if (event.type === 'keybindings') {
            setLastChangeSource(event.source);
            setKeybindings(event.current as Keybinding[]);
          }
          
          // Always sync parse errors after any change
          const currentParseErrors = settingsManager.getParseErrors();
          logger.debug('Syncing parse errors after change. Count:', currentParseErrors.length);
          
          const convertedErrors = currentParseErrors
            .map(parseError => parseSettingsError(parseError))
            .filter(Boolean) as SettingsFileError[];
          
          setSettingsErrors(convertedErrors);
        });
        
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to initialize file settings:', err);
        if (mounted) {
          // Handle SettingsError specifically for TOML parsing issues
          if (err instanceof Error && err.name === 'SettingsError') {
            const settingsError = err as any; // SettingsError type
            // Create a parseError object compatible with our parser
            const parseError = {
              type: 'settings' as const,
              filePath: settingsError.filePath || '',
              error: settingsError,
              timestamp: Date.now()
            };
            const parsedError = parseSettingsError(parseError);
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
    const path = settingsManager.getSettingsPath();
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(path);
    } catch (err) {
      logger.error('Failed to open settings file:', err);
      
      // Fallback: Copy path to clipboard
      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(path);
        logger.info('Settings file path copied to clipboard:', path);
        // You can show a toast notification here if needed
      } catch (clipboardErr) {
        logger.error('Failed to copy path to clipboard:', clipboardErr);
        throw err; // Throw original error
      }
    }
  }, []);
  
  // Open keybindings file in editor
  const openKeybindingsFile = useCallback(async () => {
    const path = settingsManager.getKeybindingsPath();
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(path);
    } catch (err) {
      logger.error('Failed to open keybindings file:', err);
      
      // Fallback: Copy path to clipboard
      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(path);
        logger.info('Keybindings file path copied to clipboard:', path);
        setCopiedToClipboard(path);
        setTimeout(() => setCopiedToClipboard(null), 3000);
      } catch (clipboardErr) {
        logger.error('Failed to copy path to clipboard:', clipboardErr);
        throw err; // Throw original error
      }
    }
  }, []);
  
  // Clear specific error type
  const clearError = useCallback((type: 'settings' | 'keybindings') => {
    setSettingsErrors(prev => prev.filter(error => error.type !== type));
  }, []);

  
  return {
    settings,
    keybindings,
    isLoading,
    error,
    settingsErrors,
    lastChangeSource,
    copiedToClipboard,
    updateSettings,
    addKeybinding,
    removeKeybinding,
    resetToDefaults,
    openSettingsFile,
    openKeybindingsFile,
    clearError
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