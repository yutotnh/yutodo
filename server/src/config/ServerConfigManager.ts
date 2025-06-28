// サーバー設定管理クラス

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as TOML from '@iarna/toml';
import { 
  ServerConfig, 
  DEFAULT_SERVER_CONFIG, 
  ServerConfigSchema, 
  EnvironmentOverrides,
  normalizeParsedConfig,
  getConfigValue 
} from '../types/config';

export class ServerConfigManager {
  private config: ServerConfig = DEFAULT_SERVER_CONFIG;
  private configFilePath: string;
  private isInitialized: boolean = false;

  constructor(configPath?: string) {
    this.configFilePath = this.resolveConfigPath(configPath);
  }

  /**
   * 設定システムを初期化
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing server configuration system...');
    
    try {
      // 設定ディレクトリが存在しない場合は作成
      await this.ensureConfigDirectory();
      
      // 設定ファイルを読み込み
      await this.loadConfig();
      
      // 環境変数でオーバーライド
      this.applyEnvironmentOverrides();
      
      // 設定を検証
      this.validateConfig();
      
      this.isInitialized = true;
      console.log('✅ Server configuration initialized successfully');
      console.log('📁 Config file:', this.configFilePath);
    } catch (error) {
      console.error('❌ Failed to initialize server configuration:', error);
      console.log('🔄 Using default configuration');
      this.config = DEFAULT_SERVER_CONFIG;
      this.isInitialized = true;
    }
  }

  /**
   * 設定ファイルパスを環境変数を考慮して解決
   */
  private resolveConfigPath(configPath?: string): string {
    // 1. 引数で指定されたパス（最優先）
    if (configPath) {
      return path.resolve(configPath);
    }
    
    // 2. 環境変数 YUTODO_CONFIG_PATH
    if (process.env.YUTODO_CONFIG_PATH) {
      const envPath = process.env.YUTODO_CONFIG_PATH;
      console.log(`📁 Using config path from YUTODO_CONFIG_PATH: ${envPath}`);
      return path.resolve(envPath);
    }
    
    // 3. 環境変数 YUTODO_CONFIG_DIR + デフォルトファイル名
    if (process.env.YUTODO_CONFIG_DIR) {
      const envDir = process.env.YUTODO_CONFIG_DIR;
      const configPath = path.join(envDir, 'server-config.toml');
      console.log(`📁 Using config directory from YUTODO_CONFIG_DIR: ${configPath}`);
      return path.resolve(configPath);
    }
    
    // 4. OS標準パス（デフォルト）
    return this.getDefaultConfigPath();
  }

  /**
   * OS標準の設定ファイルパスを取得
   */
  private getDefaultConfigPath(): string {
    const configDir = this.getConfigDirectory();
    return path.join(configDir, 'server-config.toml');
  }

  /**
   * OS標準の設定ディレクトリを取得
   */
  private getConfigDirectory(): string {
    const platform = process.platform;
    const home = os.homedir();

    switch (platform) {
      case 'win32':
        // Windows: %APPDATA%/YuToDo Server
        return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'YuToDo Server');
      
      case 'darwin':
        // macOS: ~/Library/Application Support/YuToDo Server
        return path.join(home, 'Library', 'Application Support', 'YuToDo Server');
      
      default:
        // Linux: ~/.config/yutodo-server (lowercase with hyphen)
        return path.join(
          process.env.XDG_CONFIG_HOME || path.join(home, '.config'),
          'yutodo-server'
        );
    }
  }

  /**
   * 設定ディレクトリが存在することを確認（必要に応じて作成）
   */
  private async ensureConfigDirectory(): Promise<void> {
    const configDir = path.dirname(this.configFilePath);
    
    try {
      await fs.promises.access(configDir);
    } catch {
      console.log('📁 Creating config directory:', configDir);
      await fs.promises.mkdir(configDir, { recursive: true });
    }
  }

  /**
   * 設定ファイルを読み込み
   */
  private async loadConfig(): Promise<void> {
    try {
      // 設定ファイルが存在するか確認
      await fs.promises.access(this.configFilePath);
      
      console.log('📖 Loading config from:', this.configFilePath);
      const tomlContent = await fs.promises.readFile(this.configFilePath, 'utf-8');
      
      // TOMLをパース
      const parsed = TOML.parse(tomlContent);
      const normalized = normalizeParsedConfig(parsed);
      
      // デフォルト設定とマージ
      this.config = this.mergeWithDefaults(normalized as Partial<ServerConfig>);
      
      console.log('✅ Configuration loaded successfully');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ Config file not found, creating default config...');
        await this.createDefaultConfigFile();
        this.config = DEFAULT_SERVER_CONFIG;
      } else {
        console.error('❌ Error loading config file:', error);
        throw error;
      }
    }
  }

  /**
   * デフォルト設定ファイルを作成
   */
  private async createDefaultConfigFile(): Promise<void> {
    // 設定ディレクトリが存在しない場合は作成
    const configDir = path.dirname(this.configFilePath);
    if (!fs.existsSync(configDir)) {
      console.log(`📁 Creating config directory: ${configDir}`);
      await fs.promises.mkdir(configDir, { recursive: true });
    }
    
    const tomlContent = this.configToTOML(DEFAULT_SERVER_CONFIG);
    await fs.promises.writeFile(this.configFilePath, tomlContent, 'utf-8');
    console.log('✅ Default config file created');
  }

  /**
   * 設定をTOML形式に変換
   */
  private configToTOML(config: ServerConfig): string {
    const header = `# YuToDo Server Configuration
# Generated on ${new Date().toISOString()}
#
# This file contains all server-side settings for the YuToDo application.
# You can edit this file manually or use configuration management tools.

`;

    let toml = header;

    // Server settings
    toml += '# Basic server settings\n';
    toml += '[server]\n';
    toml += `port = ${config.server.port}\n`;
    toml += `host = "${config.server.host}"\n`;
    toml += `auto_start = ${config.server.auto_start}\n`;
    toml += `max_connections = ${config.server.max_connections}\n`;
    toml += `request_timeout = ${config.server.request_timeout}\n`;

    // Database settings
    toml += '\n# Database settings\n';
    toml += '[database]\n';
    toml += `location = "${config.database.location}"\n`;
    toml += `cache_size = ${config.database.cache_size}\n`;
    toml += `journal_mode = "${config.database.journal_mode}"\n`;
    toml += `synchronous = "${config.database.synchronous}"\n`;
    toml += `temp_store = "${config.database.temp_store}"\n`;
    toml += `backup_enabled = ${config.database.backup_enabled}\n`;
    toml += `backup_interval = ${config.database.backup_interval}\n`;
    toml += `backup_retention_days = ${config.database.backup_retention_days}\n`;

    // Schedule settings
    toml += '\n# Schedule execution engine settings\n';
    toml += '[schedules]\n';
    toml += `check_interval = ${config.schedules.check_interval}\n`;
    toml += `timezone = "${config.schedules.timezone}"\n`;
    toml += `max_concurrent_executions = ${config.schedules.max_concurrent_executions}\n`;
    toml += `execution_timeout = ${config.schedules.execution_timeout}\n`;
    toml += `retry_attempts = ${config.schedules.retry_attempts}\n`;
    toml += `exclude_weekends = ${config.schedules.exclude_weekends}\n`;

    // Logging settings
    toml += '\n# Logging and monitoring settings\n';
    toml += '[logging]\n';
    toml += `level = "${config.logging.level}"\n`;
    toml += `output = "${config.logging.output}"\n`;
    if (config.logging.file_path) toml += `file_path = "${config.logging.file_path}"\n`;
    toml += `max_file_size = ${config.logging.max_file_size}\n`;
    toml += `max_files = ${config.logging.max_files}\n`;
    toml += `include_timestamp = ${config.logging.include_timestamp}\n`;
    toml += `include_level = ${config.logging.include_level}\n`;

    // Security settings
    toml += '\n# Security and CORS settings\n';
    toml += '[security]\n';
    toml += `cors_origins = ${JSON.stringify(config.security.cors_origins)}\n`;
    toml += `cors_methods = ${JSON.stringify(config.security.cors_methods)}\n`;
    toml += `enable_rate_limiting = ${config.security.enable_rate_limiting}\n`;
    toml += `rate_limit_window = ${config.security.rate_limit_window}\n`;
    toml += `rate_limit_max_requests = ${config.security.rate_limit_max_requests}\n`;
    toml += `max_request_size = "${config.security.max_request_size}"\n`;

    // Performance settings
    toml += '\n# Performance optimization settings\n';
    toml += '[performance]\n';
    toml += `memory_limit = ${config.performance.memory_limit}\n`;
    toml += `enable_compression = ${config.performance.enable_compression}\n`;
    toml += `compression_threshold = ${config.performance.compression_threshold}\n`;
    toml += `enable_keep_alive = ${config.performance.enable_keep_alive}\n`;
    toml += `keep_alive_timeout = ${config.performance.keep_alive_timeout}\n`;

    // Development settings (optional)
    if (config.development) {
      toml += '\n# Development and debugging settings\n';
      toml += '[development]\n';
      toml += `enable_debug_mode = ${config.development.enable_debug_mode}\n`;
      toml += `enable_hot_reload = ${config.development.enable_hot_reload}\n`;
      toml += `debug_socket_events = ${config.development.debug_socket_events}\n`;
      toml += `mock_slow_queries = ${config.development.mock_slow_queries}\n`;
      toml += `simulate_errors = ${config.development.simulate_errors}\n`;
    }

    return toml;
  }

  /**
   * 環境変数による設定のオーバーライド
   */
  private applyEnvironmentOverrides(): void {
    const env = process.env as EnvironmentOverrides;
    
    if (env.YUTODO_SERVER_PORT) {
      const port = parseInt(env.YUTODO_SERVER_PORT, 10);
      if (!isNaN(port) && port >= 1024 && port <= 65535) {
        this.config.server.port = port;
        console.log('🔧 Port overridden by environment variable:', port);
      }
    }
    
    if (env.YUTODO_SERVER_HOST) {
      this.config.server.host = env.YUTODO_SERVER_HOST;
      console.log('🔧 Host overridden by environment variable:', env.YUTODO_SERVER_HOST);
    }
    
    if (env.YUTODO_DB_CACHE_SIZE) {
      const cacheSize = parseInt(env.YUTODO_DB_CACHE_SIZE, 10);
      if (!isNaN(cacheSize) && cacheSize >= 100) {
        this.config.database.cache_size = cacheSize;
        console.log('🔧 Database cache size overridden:', cacheSize);
      }
    }
    
    if (env.YUTODO_LOG_LEVEL && ['debug', 'info', 'warn', 'error'].includes(env.YUTODO_LOG_LEVEL)) {
      this.config.logging.level = env.YUTODO_LOG_LEVEL;
      console.log('🔧 Log level overridden:', env.YUTODO_LOG_LEVEL);
    }
    
    if (env.YUTODO_SCHEDULE_INTERVAL) {
      const interval = parseInt(env.YUTODO_SCHEDULE_INTERVAL, 10);
      if (!isNaN(interval) && interval >= 10) {
        this.config.schedules.check_interval = interval;
        console.log('🔧 Schedule interval overridden:', interval);
      }
    }
    
    if (env.YUTODO_ENABLE_DEBUG === 'true' && this.config.development) {
      this.config.development.enable_debug_mode = true;
      console.log('🔧 Debug mode enabled by environment variable');
    }
    
    // データベースパスのオーバーライド
    if (env.YUTODO_DB_PATH) {
      this.config.database.location = env.YUTODO_DB_PATH;
      console.log('🔧 Database path overridden by environment variable:', env.YUTODO_DB_PATH);
    }
    
    // CORS許可オリジンのオーバーライド
    if (env.YUTODO_CORS_ORIGINS) {
      // カンマ区切りの文字列を配列に変換（前後の空白を除去）
      this.config.security.cors_origins = env.YUTODO_CORS_ORIGINS
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);
      console.log('🔧 CORS origins overridden by environment variable:', this.config.security.cors_origins);
    }
  }

  /**
   * 設定をZodスキーマで検証
   */
  private validateConfig(): void {
    try {
      ServerConfigSchema.parse(this.config);
      console.log('✅ Configuration validation passed');
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw new Error('Invalid server configuration');
    }
  }

  /**
   * デフォルト設定とマージ
   */
  private mergeWithDefaults(config: Partial<ServerConfig>): ServerConfig {
    return {
      server: {
        ...DEFAULT_SERVER_CONFIG.server,
        ...config.server,
      },
      database: {
        ...DEFAULT_SERVER_CONFIG.database,
        ...config.database,
      },
      schedules: {
        ...DEFAULT_SERVER_CONFIG.schedules,
        ...config.schedules,
      },
      logging: {
        ...DEFAULT_SERVER_CONFIG.logging,
        ...config.logging,
      },
      security: {
        ...DEFAULT_SERVER_CONFIG.security,
        ...config.security,
      },
      performance: {
        ...DEFAULT_SERVER_CONFIG.performance,
        ...config.performance,
      },
      development: config.development ? {
        ...DEFAULT_SERVER_CONFIG.development!,
        ...config.development,
      } : DEFAULT_SERVER_CONFIG.development,
    };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): ServerConfig {
    if (!this.isInitialized) {
      throw new Error('ServerConfigManager not initialized. Call initialize() first.');
    }
    return { ...this.config };
  }

  /**
   * 特定の設定値を型安全に取得
   */
  get<T>(path: string, defaultValue: T): T {
    return getConfigValue(this.config, path, defaultValue);
  }

  /**
   * 設定を更新して保存
   */
  async updateConfig(updates: Partial<ServerConfig>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ServerConfigManager not initialized. Call initialize() first.');
    }

    const newConfig = this.mergeWithDefaults(updates);
    
    // 新しい設定を検証
    ServerConfigSchema.parse(newConfig);
    
    this.config = newConfig;
    
    // 設定ディレクトリが存在しない場合は作成
    const configDir = path.dirname(this.configFilePath);
    if (!fs.existsSync(configDir)) {
      console.log(`📁 Creating config directory: ${configDir}`);
      await fs.promises.mkdir(configDir, { recursive: true });
    }
    
    // ファイルに保存
    const tomlContent = this.configToTOML(this.config);
    await fs.promises.writeFile(this.configFilePath, tomlContent, 'utf-8');
    
    console.log('✅ Configuration updated and saved');
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<void> {
    this.config = { ...DEFAULT_SERVER_CONFIG };
    await this.createDefaultConfigFile();
    console.log('✅ Configuration reset to defaults');
  }

  /**
   * 設定ファイルのパスを取得
   */
  getConfigFilePath(): string {
    return this.configFilePath;
  }

  /**
   * 設定ファイルをエクスポート
   */
  async exportConfig(): Promise<string> {
    return this.configToTOML(this.config);
  }

  /**
   * 設定ファイルをインポート
   */
  async importConfig(tomlContent: string): Promise<void> {
    const parsed = TOML.parse(tomlContent);
    const normalized = normalizeParsedConfig(parsed);
    const config = this.mergeWithDefaults(normalized as Partial<ServerConfig>);
    
    // 設定を検証
    ServerConfigSchema.parse(config);
    
    this.config = config;
    
    // ファイルに保存
    await fs.promises.writeFile(this.configFilePath, tomlContent, 'utf-8');
    
    console.log('✅ Configuration imported successfully');
  }
}

// シングルトンインスタンス
export const serverConfigManager = new ServerConfigManager();