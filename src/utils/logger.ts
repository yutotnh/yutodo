/**
 * Logger utility with environment-based control
 * Following best practices for production-ready logging
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logs - only shown in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - shown in all environments
   * Use for important application flow information
   */
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },

  /**
   * Warning logs - shown in all environments
   * Use for potential issues that don't break functionality
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - shown in all environments
   * Use for errors and exceptions
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Network logs - development only
   * Use for Socket.IO and API debugging
   */
  network: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[NETWORK]', ...args);
    }
  },

  /**
   * UI logs - development only
   * Use for component state and interaction debugging
   */
  ui: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[UI]', ...args);
    }
  }
};

export default logger;