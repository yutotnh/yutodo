/**
 * Enhanced structured logger utility for frontend
 * Integrates with backend observability systems
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
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: isDevelopment ? 'development' : 'production',
      userAgent: navigator.userAgent
    };
  },

  /**
   * Enhanced debug logs with structured context
   */
  debug: (message: string, context?: FrontendLogContext) => {
    if (isDevelopment) {
      const logEntry = logger.createStructuredLog('debug', message, context);
      if (context) {
        console.log('[DEBUG]', message, logEntry);
      } else {
        console.log('[DEBUG]', message);
      }
    }
  },

  /**
   * Enhanced info logs with structured context
   */
  info: (message: string, context?: FrontendLogContext) => {
    const logEntry = logger.createStructuredLog('info', message, context);
    if (context) {
      console.info('[INFO]', message, logEntry);
    } else {
      console.info('[INFO]', message);
    }
  },

  /**
   * Enhanced warning logs with structured context
   */
  warn: (message: string, context?: FrontendLogContext) => {
    const logEntry = logger.createStructuredLog('warn', message, context);
    if (context) {
      console.warn('[WARN]', message, logEntry);
    } else {
      console.warn('[WARN]', message);
    }
  },

  /**
   * Enhanced error logs with structured context
   */
  error: (message: string, context?: FrontendLogContext) => {
    const logEntry = logger.createStructuredLog('error', message, context);
    if (context) {
      console.error('[ERROR]', message, logEntry);
    } else {
      console.error('[ERROR]', message);
    }
  },

  /**
   * Enhanced network logs with structured context
   */
  network: (message: string, context?: FrontendLogContext) => {
    if (isDevelopment) {
      const logEntry = logger.createStructuredLog('network', message, context);
      if (context) {
        console.log('[NETWORK]', message, logEntry);
      } else {
        console.log('[NETWORK]', message);
      }
    }
  },

  /**
   * Enhanced UI logs with structured context
   */
  ui: (message: string, context?: FrontendLogContext) => {
    if (isDevelopment) {
      const logEntry = logger.createStructuredLog('ui', message, context);
      if (context) {
        console.log('[UI]', message, logEntry);
      } else {
        console.log('[UI]', message);
      }
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
      } catch (error) {
        // Fail silently to avoid log loops
      }
    }
  }
};

export default logger;