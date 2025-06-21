// サーバー設定ファイル（TOML）の型定義とZodスキーマ

import { z } from 'zod';

// サーバー設定のインターフェース
export interface ServerConfig {
  // サーバー基本設定
  server: {
    port: number;
    host: string;
    auto_start: boolean;
    max_connections: number;
    request_timeout: number; // ミリ秒
  };
  
  // データベース設定
  database: {
    location: string; // "auto" または具体的なパス
    cache_size: number;
    journal_mode: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
    synchronous: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
    temp_store: 'DEFAULT' | 'FILE' | 'MEMORY';
    backup_enabled: boolean;
    backup_interval: number; // 時間
    backup_retention_days: number;
  };
  
  // スケジュール実行エンジン設定
  schedules: {
    check_interval: number; // 秒
    timezone: string;
    max_concurrent_executions: number;
    execution_timeout: number; // ミリ秒
    retry_attempts: number;
    exclude_weekends: boolean;
  };
  
  // ログ・監視設定
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    output: 'console' | 'file' | 'both';
    file_path?: string;
    max_file_size: number; // MB
    max_files: number;
    include_timestamp: boolean;
    include_level: boolean;
  };
  
  // CORS・セキュリティ設定
  security: {
    cors_origins: string[];
    cors_methods: string[];
    enable_rate_limiting: boolean;
    rate_limit_window: number; // 分
    rate_limit_max_requests: number;
    max_request_size: string; // e.g., "10mb"
  };
  
  // パフォーマンス設定
  performance: {
    memory_limit: number; // MB
    enable_compression: boolean;
    compression_threshold: number; // bytes
    enable_keep_alive: boolean;
    keep_alive_timeout: number; // 秒
  };
  
  // 開発・デバッグ設定
  development?: {
    enable_debug_mode: boolean;
    enable_hot_reload: boolean;
    debug_socket_events: boolean;
    mock_slow_queries: boolean;
    simulate_errors: boolean;
  };
}

// Zodスキーマ定義（設定値の検証用）
export const ServerConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1024).max(65535),
    host: z.string().min(1),
    auto_start: z.boolean(),
    max_connections: z.number().int().min(1).max(10000),
    request_timeout: z.number().int().min(1000).max(300000), // 1秒～5分
  }),
  
  database: z.object({
    location: z.string().min(1),
    cache_size: z.number().int().min(100).max(100000),
    journal_mode: z.enum(['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF']),
    synchronous: z.enum(['OFF', 'NORMAL', 'FULL', 'EXTRA']),
    temp_store: z.enum(['DEFAULT', 'FILE', 'MEMORY']),
    backup_enabled: z.boolean(),
    backup_interval: z.number().int().min(1).max(168), // 1時間～1週間
    backup_retention_days: z.number().int().min(1).max(365),
  }),
  
  schedules: z.object({
    check_interval: z.number().int().min(10).max(3600), // 10秒～1時間
    timezone: z.string().min(1),
    max_concurrent_executions: z.number().int().min(1).max(100),
    execution_timeout: z.number().int().min(1000).max(600000), // 1秒～10分
    retry_attempts: z.number().int().min(0).max(10),
    exclude_weekends: z.boolean(),
  }),
  
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    output: z.enum(['console', 'file', 'both']),
    file_path: z.string().optional(),
    max_file_size: z.number().int().min(1).max(1000), // 1MB～1GB
    max_files: z.number().int().min(1).max(100),
    include_timestamp: z.boolean(),
    include_level: z.boolean(),
  }),
  
  security: z.object({
    cors_origins: z.array(z.string()),
    cors_methods: z.array(z.string()),
    enable_rate_limiting: z.boolean(),
    rate_limit_window: z.number().int().min(1).max(60), // 1分～1時間
    rate_limit_max_requests: z.number().int().min(1).max(10000),
    max_request_size: z.string().regex(/^\d+(kb|mb|gb)$/i),
  }),
  
  performance: z.object({
    memory_limit: z.number().int().min(64).max(8192), // 64MB～8GB
    enable_compression: z.boolean(),
    compression_threshold: z.number().int().min(0),
    enable_keep_alive: z.boolean(),
    keep_alive_timeout: z.number().int().min(1).max(300), // 1秒～5分
  }),
  
  development: z.object({
    enable_debug_mode: z.boolean(),
    enable_hot_reload: z.boolean(),
    debug_socket_events: z.boolean(),
    mock_slow_queries: z.boolean(),
    simulate_errors: z.boolean(),
  }).optional(),
});

// デフォルト設定
export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  server: {
    port: 3001,
    host: 'localhost',
    auto_start: true,
    max_connections: 100,
    request_timeout: 30000, // 30秒
  },
  
  database: {
    location: 'auto', // OS標準の場所を使用
    cache_size: 1000,
    journal_mode: 'WAL',
    synchronous: 'NORMAL',
    temp_store: 'MEMORY',
    backup_enabled: true,
    backup_interval: 24, // 24時間ごと
    backup_retention_days: 30,
  },
  
  schedules: {
    check_interval: 60, // 60秒
    timezone: 'Asia/Tokyo',
    max_concurrent_executions: 5,
    execution_timeout: 30000, // 30秒
    retry_attempts: 3,
    exclude_weekends: false,
  },
  
  logging: {
    level: 'info',
    output: 'console',
    file_path: undefined,
    max_file_size: 10, // 10MB
    max_files: 5,
    include_timestamp: true,
    include_level: true,
  },
  
  security: {
    cors_origins: ['*'],
    cors_methods: ['GET', 'POST'],
    enable_rate_limiting: false,
    rate_limit_window: 15, // 15分
    rate_limit_max_requests: 100,
    max_request_size: '10mb',
  },
  
  performance: {
    memory_limit: 512, // 512MB
    enable_compression: true,
    compression_threshold: 1024, // 1KB
    enable_keep_alive: true,
    keep_alive_timeout: 60, // 60秒
  },
  
  development: {
    enable_debug_mode: false,
    enable_hot_reload: false,
    debug_socket_events: false,
    mock_slow_queries: false,
    simulate_errors: false,
  },
};

// 環境変数からの設定オーバーライド用の型
export interface EnvironmentOverrides {
  // 設定ファイル・ディレクトリパス
  YUTODO_CONFIG_PATH?: string;      // 設定ファイルの完全パス
  YUTODO_CONFIG_DIR?: string;       // 設定ディレクトリ（ファイル名は固定）
  
  // サーバー設定
  YUTODO_SERVER_PORT?: string;
  YUTODO_SERVER_HOST?: string;
  
  // データベース設定
  YUTODO_DB_PATH?: string;          // データベースファイルの完全パス
  YUTODO_DB_CACHE_SIZE?: string;
  
  // ログ・スケジュール設定
  YUTODO_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  YUTODO_SCHEDULE_INTERVAL?: string;
  
  // 開発設定
  YUTODO_ENABLE_DEBUG?: string;
}

// BigInt正規化用のヘルパー関数（クライアント側から借用）
export function normalizeParsedConfig(config: any): any {
  if (config === null || config === undefined) {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map(item => normalizeParsedConfig(item));
  }

  if (typeof config === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(config)) {
      // Convert BigInt to regular number
      if (typeof value === 'bigint') {
        normalized[key] = Number(value);
      } else {
        normalized[key] = normalizeParsedConfig(value);
      }
    }
    return normalized;
  }

  // Convert BigInt to regular number
  if (typeof config === 'bigint') {
    return Number(config);
  }

  return config;
}

// 設定値の型安全なアクセス用のヘルパー関数
export function getConfigValue<T>(
  config: ServerConfig,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.');
  let current: any = config;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current !== undefined ? current : defaultValue;
}