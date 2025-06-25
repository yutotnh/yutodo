import logger from './logger';

/**
 * Check if Tauri file system watch API is available
 */
export async function checkTauriWatchAPI(): Promise<boolean> {
  try {
    // Check if we're in Tauri environment
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
      // Not in Tauri environment
      return false;
    }

    // Try to import the watch function
    const { watch } = await import('@tauri-apps/plugin-fs');
    
    // Check if watch function exists
    if (typeof watch !== 'function') {
      // Watch function not available
      return false;
    }

    // Check if the internal window functions exist
    const win = window as any;
    const watchFunctions = Object.keys(win).filter(key => 
      key.startsWith('__TAURI_INVOKE__') || 
      key.includes('plugin:fs') || 
      key.includes('watch')
    );
    
    logger.debug('Tauri watch functions found:', watchFunctions.length);
    
    // Check window functions
    
    return true;
  } catch (error) {
    logger.error('Error checking Tauri watch API:', error);
    return false;
  }
}

/**
 * Get system file handle limits (Linux/macOS)
 */
export async function getFileHandleLimits(): Promise<{ soft: number; hard: number } | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    // This would need to be implemented via Tauri command if needed
    // For now, just return null
    return null;
  } catch (error) {
    logger.error('Error getting file handle limits:', error);
    return null;
  }
}