import { invoke } from '@tauri-apps/api/core';
import logger from './logger';

/**
 * Checks if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export const isDevelopmentMode = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Creates a new independent application process
 */
export const createNewWindow = async (): Promise<boolean> => {
  try {
    // Check if we're in a Tauri environment
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
      logger.warn('Cannot create new window: Not in Tauri environment');
      return false;
    }

    logger.debug('Spawning new independent application process');

    const isDev = isDevelopmentMode();
    
    if (isDev) {
      // In development mode, we can't easily spawn a new dev instance
      // since it would conflict with ports. Instead, we'll notify the user
      // that multiple dev instances aren't supported
      logger.warn('Development mode: Cannot spawn independent processes during development');
      logger.warn('Please build the application first with "npm run tauri build" to test independent processes');
      
      // For now, show a message to the user
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('新しいウィンドウの独立プロセス機能は開発モードでは利用できません。\n"npm run tauri build"でビルドした後にテストしてください。');
      }
      
      return false;
    } else {
      // In production mode, use the Rust command to spawn new process
      logger.debug('Production mode: attempting to spawn new process via Rust command');
      
      try {
        // Rustコマンドを呼び出して新しいプロセスを起動
        const result = await invoke<string>('spawn_new_instance');
        logger.info('Rust spawn result:', result);
        
        // 成功メッセージを表示（オプション）
        logger.info('新しいYuToDoウィンドウが独立プロセスとして起動されました');
        
        return true;
      } catch (error) {
        logger.error('Failed to spawn new instance via Rust command:', error);
        
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`新しいプロセスの起動に失敗しました。\n\nエラー: ${error}`);
        }
        
        return false;
      }
    }
  } catch (error) {
    logger.error('Error creating new independent window process:', error);
    return false;
  }
};

/**
 * Opens a new YuToDo application as an independent process
 */
export const openNewYuToDoWindow = async (): Promise<void> => {
  try {
    logger.info('openNewYuToDoWindow called - function is being executed');
    
    const success = await createNewWindow();
    if (!success) {
      logger.warn('Failed to spawn new YuToDo process');
    } else {
      logger.info('New YuToDo process spawned successfully');
    }
  } catch (error) {
    logger.error('Error opening new YuToDo process:', error);
  }
};