import { AppSettingsFile, Keybinding } from '../types/settings';
import { exists, writeTextFile } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import logger from '../utils/logger';

// Type for old settings format (before 3-view system)
interface LegacyAppSettings {
  alwaysOnTop?: boolean;
  detailedMode?: boolean;
  darkMode?: 'auto' | 'light' | 'dark';
  confirmDelete?: boolean;
  customCss?: string;
  serverUrl?: string;
  language?: 'auto' | 'en' | 'ja';
  startupView?: 'tasks' | 'schedules';
  currentView?: 'tasks' | 'schedules'; // Legacy property
}

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
    const oldSettings: LegacyAppSettings = JSON.parse(oldSettingsJson);
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
function convertToFileSettings(old: LegacyAppSettings): AppSettingsFile {
  return {
    app: {
      theme: old.darkMode || 'auto',
      language: old.language || 'auto',
      alwaysOnTop: old.alwaysOnTop || false,
      confirmDelete: old.confirmDelete !== false, // Default true
      startupView: (() => {
        // マイグレーション: currentView/startupViewとdetailedModeから新しいstartupViewを決定
        const oldView = old.currentView || old.startupView;
        if (oldView === 'schedules') {
          return 'schedules';
        }
        // タスクビューの場合はdetailedModeで詳細/簡易を決定
        return old.detailedMode !== false ? 'tasks-detailed' : 'tasks-simple';
      })()
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
function extractKeybindings(old: LegacyAppSettings): Keybinding[] {
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