// 可観測性統合管理システム
// Centralized observability management for logging, metrics, tracing, and health checks

import { ServerConfig } from '../types/config';
import { StructuredLogger, initializeLogger, getLogger } from './Logger';
import { MetricsCollector, initializeMetrics, getMetrics } from './MetricsCollector';
import { TracingSystem, initializeTracing, getTracing } from './TracingSystem';
import { HealthCheckSystem, initializeHealthCheck, getHealthCheck } from './HealthCheck';
import sqlite3 from 'sqlite3';

export interface ObservabilityConfig {
  logging: ServerConfig['logging'];
  observability: ServerConfig['observability'];
}

export interface ObservabilityStats {
  logging: {
    enabled: boolean;
    level: string;
    output: string;
    structured: boolean;
  };
  metrics: {
    enabled: boolean;
    port: number;
    collecting: boolean;
    totalMetrics: number;
  };
  tracing: {
    enabled: boolean;
    exporter: string;
    sampleRate: number;
    initialized: boolean;
  };
  health: {
    enabled: boolean;
    port: number;
    uptime: number;
    availableChecks: string[];
  };
  overall: {
    uptime: number;
    environment: string;
    version: string;
  };
}

export class ObservabilityManager {
  private config: ObservabilityConfig;
  private logger?: StructuredLogger;
  private metrics?: MetricsCollector;
  private tracing?: TracingSystem;
  private health?: HealthCheckSystem;
  private dbConnection?: sqlite3.Database;
  private isInitialized: boolean = false;
  private startTime: Date;

  constructor(config: ObservabilityConfig, dbConnection?: sqlite3.Database) {
    this.config = config;
    this.dbConnection = dbConnection;
    this.startTime = new Date();
  }

  // 可観測性システム全体の初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 Initializing observability systems...');

    try {
      // 1. ログシステムの初期化（最初に初期化、他のシステムがログを使用するため）
      this.logger = initializeLogger(this.config.logging);
      this.logger.info('Observability manager starting initialization', {
        component: 'observability',
        operation: 'initialize'
      });

      // 2. トレーシングシステムの初期化（メトリクス前に初期化、計装のため）
      if (this.config.observability.tracing.enabled) {
        this.tracing = initializeTracing(this.config.observability.tracing);
        await this.tracing.initialize();
        this.logger.info('Tracing system initialized', {
          component: 'observability',
          operation: 'tracing_init',
          exporter: this.config.observability.tracing.exporter
        });
      }

      // 3. メトリクス収集システムの初期化
      if (this.config.observability.metrics.enabled) {
        this.metrics = initializeMetrics(this.config.observability.metrics);
        await this.metrics.startMetricsServer();
        this.logger.info('Metrics system initialized', {
          component: 'observability',
          operation: 'metrics_init',
          port: this.config.observability.metrics.port
        });
      }

      // 4. ヘルスチェックシステムの初期化
      if (this.config.observability.health.enabled) {
        this.health = initializeHealthCheck(this.config.observability.health, this.dbConnection);
        await this.health.startHealthServer();
        this.logger.info('Health check system initialized', {
          component: 'observability',
          operation: 'health_init',
          port: this.config.observability.health.port
        });
      }

      this.isInitialized = true;
      this.logger.info('Observability systems fully initialized', {
        component: 'observability',
        operation: 'initialize_complete',
        systems: this.getEnabledSystems()
      });

      // 初期化完了メトリクスの記録
      if (this.metrics) {
        this.metrics.recordTodoCreated('info'); // システム起動イベントとして記録
      }

    } catch (error) {
      const errorMessage = `Failed to initialize observability systems: ${(error as Error).message}`;
      console.error('❌', errorMessage);
      
      if (this.logger) {
        this.logger.error(errorMessage, {
          component: 'observability',
          operation: 'initialize_error',
          error: error as Error
        });
      }
      throw error;
    }
  }

  // アプリケーションイベントの統合ログ記録
  logApplicationEvent(
    event: string, 
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    context?: any
  ): void {
    if (!this.logger) return;

    const enrichedContext = {
      component: 'application',
      operation: event,
      ...context
    };

    switch (level) {
      case 'debug':
        this.logger.debug(`Application event: ${event}`, enrichedContext);
        break;
      case 'info':
        this.logger.info(`Application event: ${event}`, enrichedContext);
        break;
      case 'warn':
        this.logger.warn(`Application event: ${event}`, enrichedContext);
        break;
      case 'error':
        this.logger.error(`Application event: ${event}`, enrichedContext);
        break;
    }
  }

  // HTTPリクエストの統合監視
  monitorHttpRequest(method: string, url: string, statusCode: number, duration: number, context?: any): void {
    // ログ記録
    if (this.logger) {
      this.logger.logRequest(method, url, statusCode, duration, context);
    }

    // メトリクス記録
    if (this.metrics) {
      this.metrics.recordHttpRequest(method, url, statusCode, duration);
    }

    // トレーシング記録
    if (this.tracing) {
      this.tracing.traceHttpRequest(method, url, statusCode, duration);
    }
  }

  // データベースクエリの統合監視
  monitorDatabaseQuery(query: string, table: string, operation: string, duration: number, context?: any): void {
    // ログ記録
    if (this.logger) {
      this.logger.logDatabaseQuery(query, duration, context);
    }

    // メトリクス記録
    if (this.metrics) {
      this.metrics.recordDatabaseQuery(operation, table, duration);
    }

    // トレーシング記録
    if (this.tracing) {
      this.tracing.traceDatabaseQuery(query, table, operation, duration);
    }
  }

  // WebSocketイベントの統合監視
  monitorSocketEvent(eventName: string, direction: 'inbound' | 'outbound', data?: any, context?: any): void {
    // ログ記録
    if (this.logger) {
      this.logger.logSocketEvent(eventName, data, context);
    }

    // メトリクス記録
    if (this.metrics) {
      this.metrics.recordSocketEvent(eventName, direction);
    }

    // トレーシング記録
    if (this.tracing) {
      this.tracing.traceSocketEvent(eventName, direction, data);
    }
  }

  // スケジュール実行の統合監視
  monitorScheduleExecution(
    scheduleId: string, 
    scheduleType: string, 
    success: boolean, 
    duration: number, 
    context?: any
  ): void {
    // ログ記録
    if (this.logger) {
      this.logger.logScheduleExecution(scheduleId, success, duration, context);
    }

    // メトリクス記録
    if (this.metrics) {
      this.metrics.recordScheduleExecution(success, duration);
    }

    // トレーシング記録
    if (this.tracing) {
      this.tracing.traceScheduleExecution(scheduleId, scheduleType, success, duration);
    }
  }

  // エラーの統合監視
  monitorError(error: Error, context?: any): void {
    // ログ記録
    if (this.logger) {
      this.logger.logError(error, context);
    }

    // トレーシング記録
    if (this.tracing) {
      this.tracing.traceError(error, {
        component: context?.component || 'unknown',
        operation: context?.operation || 'error',
        ...context
      });
    }
  }

  // Todoイベントの統合監視
  monitorTodoEvent(event: 'created' | 'completed' | 'deleted', priority?: string, context?: any): void {
    // ログ記録
    if (this.logger) {
      this.logger.info(`Todo ${event}`, {
        component: 'todo',
        operation: `todo_${event}`,
        priority,
        ...context
      });
    }

    // メトリクス記録
    if (this.metrics) {
      switch (event) {
        case 'created':
          this.metrics.recordTodoCreated(priority || 'medium');
          break;
        case 'completed':
          this.metrics.recordTodoCompleted(priority || 'medium');
          break;
        case 'deleted':
          this.metrics.recordTodoDeleted();
          break;
      }
    }
  }

  // システムメトリクスの定期更新
  updateSystemMetrics(todoCounts?: { pending: number; completed: number }, sessionCount?: number): void {
    if (!this.metrics) return;

    // システムメトリクスの更新
    this.metrics.updateSystemMetrics();

    // アプリケーション固有メトリクスの更新
    if (todoCounts) {
      this.metrics.updateTodosCount(todoCounts.pending, todoCounts.completed);
    }

    if (sessionCount !== undefined) {
      this.metrics.updateUserSessions(sessionCount);
    }
  }

  // WebSocket接続イベントの監視
  monitorSocketConnection(eventType: 'connect' | 'disconnect', context?: any): void {
    // ログ記録
    if (this.logger) {
      this.logger.info(`Socket ${eventType}`, {
        component: 'websocket',
        operation: `socket_${eventType}`,
        ...context
      });
    }

    // メトリクス記録
    if (this.metrics) {
      this.metrics.recordSocketConnection(eventType);
    }
  }

  // カスタムヘルスチェックの追加
  addCustomHealthCheck(name: string, check: () => Promise<any>, critical: boolean = false): void {
    if (this.health) {
      this.health.addCustomCheck({
        name,
        check,
        critical
      });
      
      if (this.logger) {
        this.logger.info(`Custom health check added: ${name}`, {
          component: 'health',
          operation: 'add_custom_check',
          critical
        });
      }
    }
  }

  // 統計情報の取得
  async getStats(): Promise<ObservabilityStats> {
    const stats: ObservabilityStats = {
      logging: {
        enabled: !!this.logger,
        level: this.config.logging.level,
        output: this.config.logging.output,
        structured: this.config.logging.structured_format
      },
      metrics: {
        enabled: !!this.metrics,
        port: this.config.observability.metrics.port,
        collecting: this.config.observability.metrics.enabled,
        totalMetrics: 0
      },
      tracing: {
        enabled: this.config.observability.tracing.enabled,
        exporter: this.config.observability.tracing.exporter,
        sampleRate: this.config.observability.tracing.sample_rate,
        initialized: !!this.tracing
      },
      health: {
        enabled: this.config.observability.health.enabled,
        port: this.config.observability.health.port,
        uptime: 0,
        availableChecks: []
      },
      overall: {
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    // メトリクス詳細情報
    if (this.metrics) {
      const metricsSummary = await this.metrics.getMetricsSummary();
      stats.metrics.totalMetrics = metricsSummary.totalMetrics;
    }

    // ヘルスチェック詳細情報
    if (this.health) {
      const healthStats = this.health.getStats();
      stats.health.uptime = healthStats.uptime;
      stats.health.availableChecks = healthStats.availableChecks;
    }

    return stats;
  }

  // 有効なシステムの取得
  private getEnabledSystems(): string[] {
    const systems: string[] = [];
    if (this.logger) systems.push('logging');
    if (this.metrics) systems.push('metrics');
    if (this.tracing) systems.push('tracing');
    if (this.health) systems.push('health');
    return systems;
  }

  // 設定の更新
  updateConfig(config: ObservabilityConfig): void {
    this.config = config;
    
    if (this.logger) {
      this.logger.setLevel(config.logging.level);
    }

    if (this.health) {
      this.health.updateConfig(config.observability.health);
    }

    if (this.logger) {
      this.logger.info('Observability configuration updated', {
        component: 'observability',
        operation: 'config_update'
      });
    }
  }

  // 可観測性システムの停止
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    if (this.logger) {
      this.logger.info('Shutting down observability systems', {
        component: 'observability',
        operation: 'shutdown'
      });
    }

    try {
      // 逆順で停止
      if (this.health) {
        await this.health.stopHealthServer();
      }

      if (this.metrics) {
        await this.metrics.stopMetricsServer();
      }

      if (this.tracing) {
        await this.tracing.shutdown();
      }

      if (this.logger) {
        this.logger.info('All observability systems stopped', {
          component: 'observability',
          operation: 'shutdown_complete'
        });
      }

      this.isInitialized = false;
      console.log('🔧 Observability systems stopped');

    } catch (error) {
      console.error('❌ Error during observability shutdown:', error);
      throw error;
    }
  }

  // 初期化状態の確認
  isReady(): boolean {
    return this.isInitialized;
  }

  // 個別システムの取得
  getLogger(): StructuredLogger | undefined {
    return this.logger;
  }

  getMetrics(): MetricsCollector | undefined {
    return this.metrics;
  }

  getTracing(): TracingSystem | undefined {
    return this.tracing;
  }

  getHealth(): HealthCheckSystem | undefined {
    return this.health;
  }
}

// グローバル可観測性マネージャー
let globalObservabilityManager: ObservabilityManager;

export function initializeObservability(
  config: ObservabilityConfig, 
  dbConnection?: sqlite3.Database
): ObservabilityManager {
  globalObservabilityManager = new ObservabilityManager(config, dbConnection);
  return globalObservabilityManager;
}

export function getObservability(): ObservabilityManager {
  if (!globalObservabilityManager) {
    throw new Error('Observability manager not initialized. Call initializeObservability() first.');
  }
  return globalObservabilityManager;
}

// 便利関数
export const observability = {
  get: getObservability,
  init: initializeObservability
};

export default observability;