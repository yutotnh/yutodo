// 構造化ログシステム
// PinoベースのStructured Logger with OpenTelemetry Integration

import pino, { Logger as PinoLogger } from 'pino';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { ServerConfig } from '../types/config';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface LogContext {
  // 基本コンテキスト
  userId?: string;
  sessionId?: string;
  requestId?: string;
  
  // トレーシング情報
  traceId?: string;
  spanId?: string;
  
  // アプリケーション固有
  operation?: string;
  component?: string;
  todoId?: string;
  scheduleId?: string;
  
  // パフォーマンス情報
  duration?: number;
  statusCode?: number;
  
  // エラー情報
  error?: Error | string;
  errorCode?: string;
  stack?: string;
  
  // その他のメタデータ
  [key: string]: any;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  timestamp?: Date;
}

export class StructuredLogger {
  private logger: PinoLogger;
  private config: ServerConfig['logging'];
  private includeTraceId: boolean;

  constructor(config: ServerConfig['logging']) {
    this.config = config;
    this.includeTraceId = config.include_trace_id;
    
    // Pino設定
    const pinoConfig: any = {
      level: config.level,
      timestamp: config.include_timestamp ? pino.stdTimeFunctions.isoTime : false,
      
      // 構造化形式の設定
      formatters: {
        level: (label: string) => {
          return config.include_level ? { level: label } : {};
        },
        log: (object: any) => {
          // トレースIDを自動的に含める
          if (this.includeTraceId) {
            const activeSpan = trace.getActiveSpan();
            if (activeSpan) {
              const spanContext = activeSpan.spanContext();
              object.traceId = spanContext.traceId;
              object.spanId = spanContext.spanId;
            }
          }
          return object;
        }
      },
      
      // 基本フィールド
      base: {
        service: 'yutodo-server',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: require('os').hostname(),
        pid: process.pid
      }
    };

    // 出力設定
    if (config.output === 'console' || config.output === 'both') {
      // 開発環境では pretty printing
      if (!config.structured_format && process.env.NODE_ENV !== 'production') {
        pinoConfig.transport = {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false
          }
        };
      }
    }

    if (config.output === 'file' || config.output === 'both') {
      this.ensureLogDirectory(config.file_path);
      
      if (config.output === 'both') {
        // ファイルとコンソール両方
        pinoConfig.transport = {
          targets: [
            {
              target: config.structured_format ? 'pino/file' : 'pino-pretty',
              options: config.structured_format ? 
                { destination: config.file_path } :
                {
                  destination: config.file_path,
                  colorize: false,
                  translateTime: 'yyyy-mm-dd HH:MM:ss'
                }
            },
            {
              target: config.structured_format ? 'pino/file' : 'pino-pretty',
              options: config.structured_format ?
                { destination: 1 } : // stdout
                {
                  destination: 1,
                  colorize: true,
                  translateTime: 'yyyy-mm-dd HH:MM:ss',
                  ignore: 'pid,hostname'
                }
            }
          ]
        };
      } else {
        // ファイルのみ
        pinoConfig.transport = {
          target: 'pino/file',
          options: {
            destination: config.file_path
          }
        };
      }
    }

    this.logger = pino(pinoConfig);
  }

  private ensureLogDirectory(filePath?: string): void {
    if (filePath) {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  private enrichContext(context?: LogContext): LogContext {
    const enriched: LogContext = { ...context };
    
    // 現在のスパンから自動的にトレーシング情報を取得
    if (this.includeTraceId) {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        enriched.traceId = spanContext.traceId;
        enriched.spanId = spanContext.spanId;
      }
    }
    
    // タイムスタンプを追加
    enriched.timestamp = new Date().toISOString();
    
    return enriched;
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.enrichContext(context), message);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.enrichContext(context), message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.enrichContext(context), message);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(this.enrichContext(context), message);
  }

  // 高レベルなロギングメソッド
  logRequest(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`${method} ${url}`, {
      ...context,
      operation: 'http_request',
      statusCode,
      duration,
      component: 'http'
    });
  }

  logSocketEvent(event: string, data?: any, context?: LogContext): void {
    this.debug(`Socket event: ${event}`, {
      ...context,
      operation: 'socket_event',
      event,
      data: typeof data === 'object' ? JSON.stringify(data) : data,
      component: 'websocket'
    });
  }

  logDatabaseQuery(query: string, duration: number, context?: LogContext): void {
    this.debug('Database query executed', {
      ...context,
      operation: 'db_query',
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration,
      component: 'database'
    });
  }

  logScheduleExecution(scheduleId: string, success: boolean, duration: number, context?: LogContext): void {
    const level = success ? 'info' : 'error';
    this[level](`Schedule execution ${success ? 'completed' : 'failed'}`, {
      ...context,
      operation: 'schedule_execution',
      scheduleId,
      success,
      duration,
      component: 'scheduler'
    });
  }

  logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      ...context,
      error: error.message,
      stack: error.stack,
      errorCode: (error as any).code,
      component: context?.component || 'unknown'
    });
  }

  logMetric(name: string, value: number, unit: string, context?: LogContext): void {
    this.debug(`Metric: ${name}`, {
      ...context,
      operation: 'metric',
      metricName: name,
      metricValue: value,
      metricUnit: unit,
      component: 'metrics'
    });
  }

  // スパンコンテキストでログを記録
  withSpan<T>(spanName: string, fn: () => T, context?: LogContext): T {
    const tracer = trace.getTracer('yutodo-logger');
    return tracer.startActiveSpan(spanName, (span) => {
      try {
        const result = fn();
        span.setStatus({ code: SpanStatusCode.OK });
        this.debug(`Operation completed: ${spanName}`, {
          ...context,
          operation: spanName,
          component: context?.component || 'application'
        });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        this.logError(error as Error, {
          ...context,
          operation: spanName,
          component: context?.component || 'application'
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // ログレベルの動的変更
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logger.level = level;
    this.info(`Log level changed to: ${level}`, { 
      operation: 'config_change',
      component: 'logger'
    });
  }

  // 子ロガーの作成（コンポーネント固有）
  child(component: string, additionalContext?: LogContext): StructuredLogger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child({
      component,
      ...additionalContext
    });
    return childLogger;
  }

  // ログメタデータの取得
  getMetadata(): any {
    return {
      level: this.logger.level,
      config: this.config,
      includeTraceId: this.includeTraceId
    };
  }
}

// グローバルロガーインスタンス（後で設定により初期化）
let globalLogger: StructuredLogger;

export function initializeLogger(config: ServerConfig['logging']): StructuredLogger {
  globalLogger = new StructuredLogger(config);
  return globalLogger;
}

export function getLogger(): StructuredLogger {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return globalLogger;
}

// 便利関数
export const logger = {
  get: getLogger,
  init: initializeLogger
};

export default logger;