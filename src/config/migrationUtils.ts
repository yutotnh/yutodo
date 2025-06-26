import { AppSettings } from '../types/todo';
import { AppSettingsFile, Keybinding } from '../types/settings';
import { exists, writeTextFile } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import logger from '../utils/logger';

/**
 * Get migration data from localStorage
 */
export function getMigrationData(): { settings: AppSettingsFile; keybindings: Keybinding[] } | null {
  try {
    // Get old settings from localStorage
    const oldSettingsJson = localStorage.getItem('yutodoAppSettings');
    if (!oldSettingsJson) {
      logger.info('No localStorage settings found, nothing to migrate');
      return null;
    }
    
    // Parse old settings
    const oldSettings: AppSettings = JSON.parse(oldSettingsJson);
    logger.debug('Found old settings:', oldSettings);
    
    // Convert to new format
    const newSettings = convertToFileSettings(oldSettings);
    const keybindings = extractKeybindings(oldSettings);
    
    return { settings: newSettings, keybindings };
  } catch (error) {
    logger.error('Failed to get migration data:', error);
    return null;
  }
}

/**
 * Complete migration after settings have been saved
 */
export async function completeMigration(): Promise<void> {
  try {
    // Get old settings for backup
    const oldSettingsJson = localStorage.getItem('yutodoAppSettings');
    if (oldSettingsJson) {
      // Backup old settings
      await backupOldSettings(oldSettingsJson);
      
      // Remove from localStorage
      localStorage.removeItem('yutodoAppSettings');
      logger.info('Migration completed, localStorage cleared');
    }
  } catch (error) {
    logger.error('Failed to complete migration:', error);
  }
}

/**
 * Convert old AppSettings to new AppSettingsFile format
 */
function convertToFileSettings(old: AppSettings): AppSettingsFile {
  return {
    app: {
      theme: old.darkMode || 'auto',
      language: old.language || 'auto',
      alwaysOnTop: old.alwaysOnTop || false,
      detailedMode: old.detailedMode || false,
      confirmDelete: old.confirmDelete !== false, // Default true
      startupView: old.currentView || old.startupView || 'tasks'
    },
    server: {
      url: old.serverUrl || 'http://localhost:3001',
      reconnectInterval: 5000,
      timeout: 30000
    },
    ui: {
      autoHideHeader: true,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif'
    },
    appearance: {
      customCss: old.customCss || ''
    }
  };
}

/**
 * Extract any custom keybindings from old settings
 */
function extractKeybindings(old: AppSettings): Keybinding[] {
  const keybindings: Keybinding[] = [];
  
  // Old settings didn't have custom keybindings, but check for future compatibility
  if ((old as any).keybindings) {
    const oldKb = (old as any).keybindings;
    
    // Convert old format to new format
    for (const [key, value] of Object.entries(oldKb)) {
      if (typeof value === 'string') {
        keybindings.push({
          key,
          command: value
        });
      }
    }
  }
  
  return keybindings;
}

/**
 * Backup old settings
 */
async function backupOldSettings(settingsJson: string): Promise<void> {
  try {
    const dataDir = await appDataDir();
    const backupDir = await join(dataDir, 'YuToDo', 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = await join(backupDir, `localStorage-backup-${timestamp}.json`);
    
    await writeTextFile(backupPath, settingsJson);
    logger.info(`Old settings backed up to: ${backupPath}`);
  } catch (error) {
    logger.warn('Failed to backup old settings:', error);
  }
}

/**
 * Check if we're in a Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

/**
 * Check if migration is needed
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    logger.info('Checking migration requirements...');
    
    // Only migrate in Tauri environment
    if (!isTauriEnvironment()) {
      logger.info('Not in Tauri environment, migration not needed');
      return false;
    }
    
    // Check if old settings exist
    const hasOldSettings = localStorage.getItem('yutodoAppSettings') !== null;
    logger.info('Has old localStorage settings:', hasOldSettings);
    
    if (!hasOldSettings) {
      logger.info('No old settings found, migration not needed');
      return false;
    }
    
    // Check if new settings already exist by constructing path directly
    logger.info('Checking if new settings file already exists...');
    const dataDir = await appDataDir();
    const configDir = await join(dataDir, 'YuToDo');
    const settingsPath = await join(configDir, 'settings.toml');
    
    logger.info('Settings file path:', settingsPath);
    const hasNewSettings = await exists(settingsPath);
    logger.info('New settings file exists:', hasNewSettings);
    
    const needsMigration = hasOldSettings && !hasNewSettings;
    logger.info('Migration needed decision:', needsMigration);
    
    return needsMigration;
  } catch (error) {
    logger.error('Error checking migration requirements:', error);
    // On error, assume no migration needed to avoid blocking startup
    return false;
  }
}