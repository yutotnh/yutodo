// 分散トレーシングシステム
// OpenTelemetry based distributed tracing

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { 
  trace, 
  context, 
  SpanStatusCode, 
  SpanKind,
  Tracer 
} from '@opentelemetry/api';
import { ServerConfig } from '../types/config';

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  links?: any[];
}

export interface TracingContext {
  traceId?: string;
  spanId?: string;
  operation: string;
  component: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export class TracingSystem {
  private sdk?: NodeSDK;
  private tracer: Tracer;
  private config: ServerConfig['observability']['tracing'];
  private isInitialized: boolean = false;

  constructor(config: ServerConfig['observability']['tracing']) {
    this.config = config;
    this.tracer = trace.getTracer('yutodo-server', '1.0.0');
  }

  // トレーシングシステムの初期化
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.isInitialized) {
      return;
    }

    try {
      this.sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: 'yutodo-server',
          [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
          [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'yutodo',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        }),
        
        // 自動計装の設定
        instrumentations: [
          getNodeAutoInstrumentations({
            // 無効にする計装
            '@opentelemetry/instrumentation-dns': {
              enabled: false,
            },
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
            
            // HTTP計装の設定
            '@opentelemetry/instrumentation-http': {
              enabled: this.config.include_http_requests,
              requestHook: (span, request) => {
                span.setAttributes({
                  'http.request.header.user-agent': request.headers['user-agent'] || '',
                  'http.request.header.content-type': request.headers['content-type'] || '',
                });
              },
              responseHook: (span, response) => {
                span.setAttributes({
                  'http.response.header.content-type': response.headers['content-type'] || '',
                });
              }
            },
            
            // Express計装の設定
            '@opentelemetry/instrumentation-express': {
              enabled: this.config.include_http_requests,
            },
            
            // SQLite計装の設定（実験的）
            '@opentelemetry/instrumentation-sqlite3': {
              enabled: this.config.include_db_queries,
            }
          })
        ],
        
        // サンプリング設定
        sampler: this.createSampler(),
      });

      // エクスポーター設定
      await this.configureExporter();
      
      // SDKの開始
      this.sdk.start();
      this.isInitialized = true;
      
      console.log('🔍 Tracing system initialized successfully');
      console.log(`   Exporter: ${this.config.exporter}`);
      console.log(`   Sample rate: ${this.config.sample_rate * 100}%`);
      
    } catch (error) {
      console.error('❌ Failed to initialize tracing system:', error);
      throw error;
    }
  }

  private createSampler(): any {
    // 設定されたサンプリング率に基づくサンプラー
    const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-node');
    return new TraceIdRatioBasedSampler(this.config.sample_rate);
  }

  private async configureExporter(): Promise<void> {
    switch (this.config.exporter) {
      case 'console':
        // コンソールエクスポーター（開発用）
        const { ConsoleSpanExporter } = require('@opentelemetry/exporter-console');
        process.env.OTEL_TRACES_EXPORTER = 'console';
        break;
        
      case 'jaeger':
        // Jaegerエクスポーター
        const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
        process.env.OTEL_TRACES_EXPORTER = 'jaeger';
        if (this.config.endpoint) {
          process.env.OTEL_EXPORTER_JAEGER_ENDPOINT = this.config.endpoint;
        }
        break;
        
      case 'zipkin':
        // Zipkinエクスポーター
        const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
        process.env.OTEL_TRACES_EXPORTER = 'zipkin';
        if (this.config.endpoint) {
          process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT = this.config.endpoint;
        }
        break;
        
      case 'otlp':
        // OTLPエクスポーター（標準）
        process.env.OTEL_TRACES_EXPORTER = 'otlp';
        if (this.config.endpoint) {
          process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = this.config.endpoint;
        }
        break;
    }
  }

  // マニュアルスパンの作成
  createSpan(name: string, context: TracingContext, options?: SpanOptions): any {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: {
        'service.component': context.component,
        'operation.name': context.operation,
        'user.id': context.userId || '',
        'session.id': context.sessionId || '',
        ...options?.attributes,
        ...context
      },
      links: options?.links
    });

    return span;
  }

  // アクティブスパンでの操作実行
  withSpan<T>(name: string, context: TracingContext, fn: () => T | Promise<T>, options?: SpanOptions): T | Promise<T> {
    const span = this.createSpan(name, context, options);
    
    return context.tracer.startActiveSpan(name, span, () => {
      try {
        const result = fn();
        
        // Promiseの場合
        if (result instanceof Promise) {
          return result
            .then((res) => {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return res;
            })
            .catch((error) => {
              span.setStatus({ 
                code: SpanStatusCode.ERROR, 
                message: error.message 
              });
              span.recordException(error);
              span.end();
              throw error;
            });
        }
        
        // 同期的な結果
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
        
      } catch (error) {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: (error as Error).message 
        });
        span.recordException(error as Error);
        span.end();
        throw error;
      }
    });
  }

  // HTTP リクエストのトレース
  traceHttpRequest(method: string, url: string, statusCode: number, duration: number): void {
    if (!this.config.include_http_requests) return;

    const span = this.createSpan(`HTTP ${method}`, {
      operation: 'http_request',
      component: 'http'
    }, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.status_code': statusCode,
        'http.response_time_ms': duration
      }
    });

    span.setStatus({ 
      code: statusCode >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK 
    });
    span.end();
  }

  // データベースクエリのトレース
  traceDatabaseQuery(query: string, table: string, operation: string, duration: number): void {
    if (!this.config.include_db_queries) return;

    const span = this.createSpan(`DB ${operation}`, {
      operation: 'db_query',
      component: 'database'
    }, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'sqlite',
        'db.operation': operation,
        'db.sql.table': table,
        'db.statement': query.substring(0, 100), // 最初の100文字のみ
        'db.response_time_ms': duration
      }
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  // WebSocketイベントのトレース
  traceSocketEvent(eventName: string, direction: 'inbound' | 'outbound', data?: any): void {
    const span = this.createSpan(`Socket ${eventName}`, {
      operation: 'socket_event',
      component: 'websocket'
    }, {
      kind: direction === 'inbound' ? SpanKind.SERVER : SpanKind.CLIENT,
      attributes: {
        'websocket.event': eventName,
        'websocket.direction': direction,
        'websocket.data_size': data ? JSON.stringify(data).length : 0
      }
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  // スケジュール実行のトレース
  traceScheduleExecution(scheduleId: string, scheduleType: string, success: boolean, duration: number): void {
    const span = this.createSpan(`Schedule ${scheduleType}`, {
      operation: 'schedule_execution',
      component: 'scheduler'
    }, {
      attributes: {
        'schedule.id': scheduleId,
        'schedule.type': scheduleType,
        'schedule.success': success,
        'schedule.duration_ms': duration
      }
    });

    span.setStatus({ 
      code: success ? SpanStatusCode.OK : SpanStatusCode.ERROR 
    });
    span.end();
  }

  // エラーのトレース
  traceError(error: Error, context: TracingContext): void {
    const span = this.createSpan('Error', context, {
      attributes: {
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.stack': error.stack || ''
      }
    });

    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
    });
    span.recordException(error);
    span.end();
  }

  // 現在のトレースIDとスパンIDの取得
  getCurrentTraceInfo(): { traceId?: string; spanId?: string } {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId
      };
    }
    return {};
  }

  // カスタム属性の追加
  addAttribute(key: string, value: string | number | boolean): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttribute(key, value);
    }
  }

  // カスタムイベントの記録
  addEvent(name: string, attributes?: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  // トレーシングシステムの停止
  async shutdown(): Promise<void> {
    if (this.sdk && this.isInitialized) {
      await this.sdk.shutdown();
      this.isInitialized = false;
      console.log('🔍 Tracing system stopped');
    }
  }

  // 設定情報の取得
  getConfig(): ServerConfig['observability']['tracing'] {
    return this.config;
  }

  // 統計情報の取得
  getStats(): any {
    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      exporter: this.config.exporter,
      sampleRate: this.config.sample_rate,
      currentTraceInfo: this.getCurrentTraceInfo()
    };
  }
}

// グローバルトレーシングシステム
let globalTracingSystem: TracingSystem;

export function initializeTracing(config: ServerConfig['observability']['tracing']): TracingSystem {
  globalTracingSystem = new TracingSystem(config);
  return globalTracingSystem;
}

export function getTracing(): TracingSystem {
  if (!globalTracingSystem) {
    throw new Error('Tracing system not initialized. Call initializeTracing() first.');
  }
  return globalTracingSystem;
}

// 便利関数
export const tracing = {
  get: getTracing,
  init: initializeTracing
};

export default tracing;