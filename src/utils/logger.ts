/**
 * Enhanced structured logger utility for frontend
 * Maintains compatibility with existing usage patterns
 */

const isDevelopment = import.meta.env.DEV;

export interface FrontendLogContext {
  // User context
  userId?: string;
  sessionId?: string;
  
  // Application context
  component?: string;
  operation?: string;
  todoId?: string;
  scheduleId?: string;
  
  // Performance context
  duration?: number;
  
  // Error context
  error?: Error | string;
  errorCode?: string;
  
  // Custom context
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'network' | 'ui';
  message: string;
  context?: FrontendLogContext;
  service: string;
  version: string;
  environment: string;
  userAgent: string;
}

export const logger = {
  /**
   * Creates structured log entry
   */
  createStructuredLog: (
    level: 'debug' | 'info' | 'warn' | 'error' | 'network' | 'ui',
    message: string,
    context?: FrontendLogContext
  ): StructuredLogEntry => {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: 'yutodo-frontend',
      version: '1.0.0',
      environment: isDevelopment ? 'development' : 'production',
      userAgent: navigator.userAgent
    };
  },

  /**
   * Enhanced debug logs with flexible input types
   */
  debug: (message: any, ...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', message, ...args);
    }
  },

  /**
   * Enhanced info logs with flexible input types
   */
  info: (message: any, ...args: any[]) => {
    console.info('[INFO]', message, ...args);
  },

  /**
   * Enhanced warning logs with flexible input types
   */
  warn: (message: any, ...args: any[]) => {
    console.warn('[WARN]', message, ...args);
  },

  /**
   * Enhanced error logs with flexible input types
   */
  error: (message: any, ...args: any[]) => {
    console.error('[ERROR]', message, ...args);
  },

  /**
   * Enhanced network logs with flexible input types
   */
  network: (message: any, ...args: any[]) => {
    if (isDevelopment) {
      console.log('[NETWORK]', message, ...args);
    }
  },

  /**
   * Enhanced UI logs with flexible input types
   */
  ui: (message: any, ...args: any[]) => {
    if (isDevelopment) {
      console.log('[UI]', message, ...args);
    }
  },

  /**
   * Log user actions for analytics
   */
  userAction: (action: string, context?: FrontendLogContext) => {
    logger.info(`User action: ${action}`, {
      ...context,
      component: 'user_interaction',
      operation: action
    });
  },

  /**
   * Log performance metrics
   */
  performance: (operation: string, duration: number, context?: FrontendLogContext) => {
    logger.debug(`Performance: ${operation}`, {
      ...context,
      component: 'performance',
      operation,
      duration
    });
  },

  /**
   * Log todo operations
   */
  todoOperation: (operation: string, todoId?: string, context?: FrontendLogContext) => {
    logger.info(`Todo ${operation}`, {
      ...context,
      component: 'todo',
      operation: `todo_${operation}`,
      todoId
    });
  },

  /**
   * Log schedule operations
   */
  scheduleOperation: (operation: string, scheduleId?: string, context?: FrontendLogContext) => {
    logger.info(`Schedule ${operation}`, {
      ...context,
      component: 'schedule',
      operation: `schedule_${operation}`,
      scheduleId
    });
  },

  /**
   * Send structured logs to backend (for centralized logging)
   */
  sendToBackend: async (logEntry: StructuredLogEntry) => {
    if (!isDevelopment) {
      try {
        // Send log to backend endpoint for centralized logging
        // This would be implemented when backend has a log ingestion endpoint
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(logEntry)
        // });
        
        // Avoid unused parameter warning
        void logEntry;
      } catch {
        // Fail silently to avoid log loops
      }
    }
  }
};

export default logger;