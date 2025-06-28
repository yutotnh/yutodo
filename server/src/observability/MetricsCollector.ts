// メトリクス収集システム
// Prometheus metrics with custom application metrics

import { 
  register, 
  Counter, 
  Histogram, 
  Gauge, 
  collectDefaultMetrics,
  Registry
} from 'prom-client';
import { ServerConfig } from '../types/config';
import express from 'express';
import { createServer, Server as HttpServer } from 'http';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface CustomMetricConfig {
  name: string;
  help: string;
  type: 'counter' | 'histogram' | 'gauge';
  labels?: string[];
  buckets?: number[]; // histogram用
}

export class MetricsCollector {
  private registry: Registry;
  private config: ServerConfig['observability']['metrics'];
  private server?: HttpServer;
  private app?: express.Application;
  
  // 基本メトリクス
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private socketConnectionsTotal: Counter<string>;
  private socketEventsTotal: Counter<string>;
  private databaseQueriesTotal: Counter<string>;
  private databaseQueryDuration: Histogram<string>;
  private scheduleExecutionsTotal: Counter<string>;
  private scheduleExecutionDuration: Histogram<string>;
  
  // アプリケーション固有メトリクス
  private todosTotal: Gauge<string>;
  private todosCreated: Counter<string>;
  private todosCompleted: Counter<string>;
  private todosDeleted: Counter<string>;
  private schedulesTotal: Gauge<string>;
  private schedulesActive: Gauge<string>;
  private userSessions: Gauge<string>;
  
  // システムメトリクス
  private memoryUsage: Gauge<string>;
  private errorRate: Gauge<string>;
  private responseTime: Gauge<string>;

  constructor(config: ServerConfig['observability']['metrics']) {
    this.config = config;
    this.registry = new Registry();
    
    // デフォルトメトリクスの収集
    if (config.collect_default_metrics) {
      collectDefaultMetrics({ 
        register: this.registry,
        prefix: 'yutodo_',
        labels: {
          service: 'yutodo-server',
          version: process.env.npm_package_version || '1.0.0'
        }
      });
    }
    
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // HTTP関連メトリクス
    this.httpRequestsTotal = new Counter({
      name: 'yutodo_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry]
    });

    this.httpRequestDuration = new Histogram({
      name: 'yutodo_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: this.config.histogram_buckets,
      registers: [this.registry]
    });

    // WebSocket関連メトリクス
    this.socketConnectionsTotal = new Counter({
      name: 'yutodo_socket_connections_total',
      help: 'Total number of socket connections',
      labelNames: ['event_type'], // connect, disconnect
      registers: [this.registry]
    });

    this.socketEventsTotal = new Counter({
      name: 'yutodo_socket_events_total',
      help: 'Total number of socket events',
      labelNames: ['event_name', 'direction'], // inbound, outbound
      registers: [this.registry]
    });

    // データベース関連メトリクス
    this.databaseQueriesTotal = new Counter({
      name: 'yutodo_database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
      registers: [this.registry]
    });

    this.databaseQueryDuration = new Histogram({
      name: 'yutodo_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry]
    });

    // スケジュール実行メトリクス
    this.scheduleExecutionsTotal = new Counter({
      name: 'yutodo_schedule_executions_total',
      help: 'Total number of schedule executions',
      labelNames: ['status'], // success, failure
      registers: [this.registry]
    });

    this.scheduleExecutionDuration = new Histogram({
      name: 'yutodo_schedule_execution_duration_seconds',
      help: 'Duration of schedule executions in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry]
    });

    // アプリケーション状態メトリクス
    this.todosTotal = new Gauge({
      name: 'yutodo_todos_total',
      help: 'Total number of todos',
      labelNames: ['status'], // pending, completed
      registers: [this.registry]
    });

    this.todosCreated = new Counter({
      name: 'yutodo_todos_created_total',
      help: 'Total number of todos created',
      labelNames: ['priority'],
      registers: [this.registry]
    });

    this.todosCompleted = new Counter({
      name: 'yutodo_todos_completed_total',
      help: 'Total number of todos completed',
      labelNames: ['priority'],
      registers: [this.registry]
    });

    this.todosDeleted = new Counter({
      name: 'yutodo_todos_deleted_total',
      help: 'Total number of todos deleted',
      registers: [this.registry]
    });

    this.schedulesTotal = new Gauge({
      name: 'yutodo_schedules_total',
      help: 'Total number of schedules',
      registers: [this.registry]
    });

    this.schedulesActive = new Gauge({
      name: 'yutodo_schedules_active',
      help: 'Number of active schedules',
      registers: [this.registry]
    });

    this.userSessions = new Gauge({
      name: 'yutodo_user_sessions',
      help: 'Number of active user sessions',
      registers: [this.registry]
    });

    // システム監視メトリクス
    this.memoryUsage = new Gauge({
      name: 'yutodo_memory_usage_percent',
      help: 'Memory usage percentage',
      registers: [this.registry]
    });

    this.errorRate = new Gauge({
      name: 'yutodo_error_rate_percent',
      help: 'Error rate percentage',
      registers: [this.registry]
    });

    this.responseTime = new Gauge({
      name: 'yutodo_avg_response_time_seconds',
      help: 'Average response time in seconds',
      registers: [this.registry]
    });
  }

  // HTTP メトリクス記録
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, route }, duration / 1000); // 秒に変換
  }

  // WebSocket メトリクス記録
  recordSocketConnection(eventType: 'connect' | 'disconnect'): void {
    this.socketConnectionsTotal.inc({ event_type: eventType });
  }

  recordSocketEvent(eventName: string, direction: 'inbound' | 'outbound'): void {
    this.socketEventsTotal.inc({ event_name: eventName, direction });
  }

  // データベース メトリクス記録
  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueriesTotal.inc({ operation, table });
    this.databaseQueryDuration.observe({ operation, table }, duration / 1000);
  }

  // スケジュール実行メトリクス記録
  recordScheduleExecution(success: boolean, duration: number): void {
    this.scheduleExecutionsTotal.inc({ status: success ? 'success' : 'failure' });
    this.scheduleExecutionDuration.observe(duration / 1000);
  }

  // Todo メトリクス更新
  updateTodosCount(pending: number, completed: number): void {
    this.todosTotal.set({ status: 'pending' }, pending);
    this.todosTotal.set({ status: 'completed' }, completed);
  }

  recordTodoCreated(priority: string): void {
    this.todosCreated.inc({ priority });
  }

  recordTodoCompleted(priority: string): void {
    this.todosCompleted.inc({ priority });
  }

  recordTodoDeleted(): void {
    this.todosDeleted.inc();
  }

  // スケジュール メトリクス更新
  updateSchedulesCount(total: number, active: number): void {
    this.schedulesTotal.set(total);
    this.schedulesActive.set(active);
  }

  // セッション メトリクス更新
  updateUserSessions(count: number): void {
    this.userSessions.set(count);
  }

  // システム メトリクス更新
  updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.memoryUsage.set(memPercent);
  }

  updateErrorRate(rate: number): void {
    this.errorRate.set(rate);
  }

  updateResponseTime(avgTime: number): void {
    this.responseTime.set(avgTime / 1000); // 秒に変換
  }

  // カスタムメトリクスの作成
  createCustomMetric(config: CustomMetricConfig): Counter<string> | Histogram<string> | Gauge<string> {
    switch (config.type) {
      case 'counter':
        return new Counter({
          name: `yutodo_custom_${config.name}`,
          help: config.help,
          labelNames: config.labels || [],
          registers: [this.registry]
        });
      
      case 'histogram':
        return new Histogram({
          name: `yutodo_custom_${config.name}`,
          help: config.help,
          labelNames: config.labels || [],
          buckets: config.buckets || this.config.histogram_buckets,
          registers: [this.registry]
        });
      
      case 'gauge':
        return new Gauge({
          name: `yutodo_custom_${config.name}`,
          help: config.help,
          labelNames: config.labels || [],
          registers: [this.registry]
        });
    }
  }

  // メトリクスサーバーの開始
  async startMetricsServer(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.app = express();
    
    // メトリクスエンドポイント
    this.app.get(this.config.path, async (req, res) => {
      try {
        // 最新のシステムメトリクスを更新
        this.updateSystemMetrics();
        
        res.set('Content-Type', this.registry.contentType);
        res.end(await this.registry.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    // ヘルスチェックエンドポイント
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        metrics_enabled: this.config.enabled
      });
    });

    this.server = createServer(this.app);
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, () => {
        console.log(`📊 Metrics server running on port ${this.config.port}`);
        console.log(`   Metrics endpoint: http://localhost:${this.config.port}${this.config.path}`);
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  // メトリクスサーバーの停止
  async stopMetricsServer(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('📊 Metrics server stopped');
          resolve();
        });
      });
    }
  }

  // レジストリの取得
  getRegistry(): Registry {
    return this.registry;
  }

  // メトリクスのリセット
  resetMetrics(): void {
    this.registry.resetMetrics();
  }

  // メトリクス概要の取得
  async getMetricsSummary(): Promise<any> {
    const metrics = await this.registry.getMetricsAsJSON();
    return {
      totalMetrics: metrics.length,
      enabledFeatures: {
        defaultMetrics: this.config.collect_default_metrics,
        customMetrics: this.config.custom_metrics
      },
      server: {
        port: this.config.port,
        path: this.config.path,
        running: !!this.server
      }
    };
  }
}

// グローバルメトリクスコレクター
let globalMetricsCollector: MetricsCollector;

export function initializeMetrics(config: ServerConfig['observability']['metrics']): MetricsCollector {
  globalMetricsCollector = new MetricsCollector(config);
  return globalMetricsCollector;
}

export function getMetrics(): MetricsCollector {
  if (!globalMetricsCollector) {
    throw new Error('Metrics collector not initialized. Call initializeMetrics() first.');
  }
  return globalMetricsCollector;
}

// 便利関数
export const metrics = {
  get: getMetrics,
  init: initializeMetrics
};

export default metrics;