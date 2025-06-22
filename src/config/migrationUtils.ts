import { AppSettings } from '../types/todo';
import { AppSettingsFile, Keybinding } from '../types/settings';
import { settingsManager } from './SettingsManager';
import { exists, writeTextFile } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import logger from '../utils/logger';

/**
 * Migrate from localStorage to file-based settings
 */
export async function migrateToFileBasedSettings(): Promise<boolean> {
  try {
    logger.info('Starting migration to file-based settings...');
    
    // Check if migration is needed
    const settingsPath = await settingsManager.getSettingsPath();
    if (await exists(settingsPath)) {
      logger.info('Settings file already exists, skipping migration');
      return false;
    }
    
    // Get old settings from localStorage
    const oldSettingsJson = localStorage.getItem('yutodoAppSettings');
    if (!oldSettingsJson) {
      logger.info('No localStorage settings found, nothing to migrate');
      return false;
    }
    
    // Parse old settings
    const oldSettings: AppSettings = JSON.parse(oldSettingsJson);
    logger.debug('Found old settings:', oldSettings);
    
    // Convert to new format
    const newSettings = convertToFileSettings(oldSettings);
    const keybindings = extractKeybindings(oldSettings);
    
    // Save to files
    await settingsManager.updateSettings(newSettings);
    
    // Add custom keybindings if any
    for (const kb of keybindings) {
      await settingsManager.addKeybinding(kb);
    }
    
    // Backup old settings
    await backupOldSettings(oldSettingsJson);
    
    // Remove from localStorage
    localStorage.removeItem('yutodoAppSettings');
    
    logger.info('Migration completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
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
      currentView: old.currentView || 'tasks'
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
  // Only migrate in Tauri environment
  if (!isTauriEnvironment()) {
    return false;
  }
  
  // Check if old settings exist
  const hasOldSettings = localStorage.getItem('yutodoAppSettings') !== null;
  
  // Check if new settings already exist
  const settingsPath = await settingsManager.getSettingsPath();
  const hasNewSettings = await exists(settingsPath);
  
  return hasOldSettings && !hasNewSettings;
}