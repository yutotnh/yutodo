// ServerConfigManager テスト

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ServerConfigManager } from '../src/config/ServerConfigManager';
import { DEFAULT_SERVER_CONFIG, ServerConfig } from '../src/types/config';

describe('ServerConfigManager', () => {
  let configManager: ServerConfigManager;
  let testConfigDir: string;
  let testConfigPath: string;
  
  beforeEach(() => {
    // テスト用の設定ディレクトリを作成
    testConfigDir = path.join(process.cwd(), 'test-data', 'config-test');
    testConfigPath = path.join(testConfigDir, 'server-config.toml');
    
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    
    // カスタムパスでConfigManagerを作成
    configManager = new ServerConfigManager(testConfigPath);
  });
  
  afterEach(() => {
    // テスト用ファイルをクリーンアップ
    try {
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath);
      }
      if (fs.existsSync(testConfigDir)) {
        fs.rmdirSync(testConfigDir);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    // 環境変数をクリーンアップ
    delete process.env.YUTODO_CONFIG_PATH;
    delete process.env.YUTODO_CONFIG_DIR;
    delete process.env.YUTODO_SERVER_PORT;
    delete process.env.YUTODO_SERVER_HOST;
    delete process.env.YUTODO_DB_PATH;
    delete process.env.YUTODO_DB_CACHE_SIZE;
    delete process.env.YUTODO_LOG_LEVEL;
    delete process.env.YUTODO_SCHEDULE_INTERVAL;
    delete process.env.YUTODO_ENABLE_DEBUG;
  });
  
  describe('初期化', () => {
    it('設定ファイルが存在しない場合、デフォルト設定ファイルを作成する', async () => {
      expect(fs.existsSync(testConfigPath)).toBe(false);
      
      await configManager.initialize();
      
      expect(fs.existsSync(testConfigPath)).toBe(true);
      const config = configManager.getConfig();
      expect(config).toEqual(DEFAULT_SERVER_CONFIG);
    });
    
    it('設定ファイルが存在する場合、それを読み込む', async () => {
      const testConfig: Partial<ServerConfig> = {
        server: {
          port: 4000,
          host: 'test-host',
          auto_start: false,
          max_connections: 50,
          request_timeout: 15000,
        }
      };
      
      // テスト設定ファイルを作成
      const tomlContent = `
[server]
port = 4000
host = "test-host"
auto_start = false
max_connections = 50
request_timeout = 15000
`;
      fs.writeFileSync(testConfigPath, tomlContent, 'utf-8');
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.server.port).toBe(4000);
      expect(config.server.host).toBe('test-host');
      expect(config.server.auto_start).toBe(false);
      expect(config.server.max_connections).toBe(50);
      expect(config.server.request_timeout).toBe(15000);
    });
    
    it('無効なTOMLファイルの場合、デフォルト設定を使用する', async () => {
      // 無効なTOMLファイルを作成
      fs.writeFileSync(testConfigPath, 'invalid toml content [[[', 'utf-8');
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config).toEqual(DEFAULT_SERVER_CONFIG);
    });
  });
  
  describe('環境変数オーバーライド', () => {
    it('YUTODO_SERVER_PORTでポートをオーバーライドできる', async () => {
      process.env.YUTODO_SERVER_PORT = '5000';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.server.port).toBe(5000);
    });
    
    it('YUTODO_SERVER_HOSTでホストをオーバーライドできる', async () => {
      process.env.YUTODO_SERVER_HOST = 'custom-host';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.server.host).toBe('custom-host');
    });
    
    it('YUTODO_DB_CACHE_SIZEでキャッシュサイズをオーバーライドできる', async () => {
      process.env.YUTODO_DB_CACHE_SIZE = '2000';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.database.cache_size).toBe(2000);
    });
    
    it('YUTODO_LOG_LEVELでログレベルをオーバーライドできる', async () => {
      process.env.YUTODO_LOG_LEVEL = 'debug';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.logging.level).toBe('debug');
    });
    
    it('YUTODO_SCHEDULE_INTERVALでスケジュール間隔をオーバーライドできる', async () => {
      process.env.YUTODO_SCHEDULE_INTERVAL = '120';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.schedules.check_interval).toBe(120);
    });
    
    it('無効な環境変数値は無視される', async () => {
      process.env.YUTODO_SERVER_PORT = 'invalid-port';
      process.env.YUTODO_DB_CACHE_SIZE = 'not-a-number';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.server.port).toBe(DEFAULT_SERVER_CONFIG.server.port);
      expect(config.database.cache_size).toBe(DEFAULT_SERVER_CONFIG.database.cache_size);
    });

    it('YUTODO_DB_PATHでデータベースパスをオーバーライドできる', async () => {
      process.env.YUTODO_DB_PATH = '/custom/path/to/todos.db';
      
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.database.location).toBe('/custom/path/to/todos.db');
    });
  });

  describe('環境変数による設定ファイルパス指定', () => {
    it('YUTODO_CONFIG_PATHで設定ファイルパスを指定できる', () => {
      const customConfigPath = path.join(testConfigDir, 'custom-config.toml');
      process.env.YUTODO_CONFIG_PATH = customConfigPath;
      
      const customConfigManager = new ServerConfigManager();
      expect(customConfigManager.getConfigFilePath()).toBe(path.resolve(customConfigPath));
    });

    it('YUTODO_CONFIG_DIRで設定ディレクトリを指定できる', () => {
      const customConfigDir = path.join(testConfigDir, 'custom-dir');
      process.env.YUTODO_CONFIG_DIR = customConfigDir;
      
      const customConfigManager = new ServerConfigManager();
      const expectedPath = path.resolve(path.join(customConfigDir, 'server-config.toml'));
      expect(customConfigManager.getConfigFilePath()).toBe(expectedPath);
    });

    it('引数で指定されたパスが環境変数より優先される', () => {
      const envConfigPath = path.join(testConfigDir, 'env-config.toml');
      const argConfigPath = path.join(testConfigDir, 'arg-config.toml');
      
      process.env.YUTODO_CONFIG_PATH = envConfigPath;
      
      const customConfigManager = new ServerConfigManager(argConfigPath);
      expect(customConfigManager.getConfigFilePath()).toBe(path.resolve(argConfigPath));
    });

    it('優先順位: 引数 > YUTODO_CONFIG_PATH > YUTODO_CONFIG_DIR > OS標準', () => {
      const customConfigManager = new ServerConfigManager();
      const defaultPath = customConfigManager.getConfigFilePath();
      
      // OS標準パスの確認
      expect(defaultPath).toContain('YuToDo');
      expect(defaultPath).toContain('server-config.toml');
    });
  });
  
  describe('設定の取得と更新', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });
    
    it('get()メソッドで特定の設定値を取得できる', () => {
      const port = configManager.get('server.port', 0);
      const host = configManager.get('server.host', '');
      const cacheSize = configManager.get('database.cache_size', 0);
      
      expect(port).toBe(DEFAULT_SERVER_CONFIG.server.port);
      expect(host).toBe(DEFAULT_SERVER_CONFIG.server.host);
      expect(cacheSize).toBe(DEFAULT_SERVER_CONFIG.database.cache_size);
    });
    
    it('存在しない設定キーはデフォルト値を返す', () => {
      const value = configManager.get('nonexistent.key', 'default');
      expect(value).toBe('default');
    });
    
    it('updateConfig()で設定を更新できる', async () => {
      const updates: Partial<ServerConfig> = {
        server: {
          port: 9000,
          host: 'updated-host',
          auto_start: true,
          max_connections: 200,
          request_timeout: 60000,
        }
      };
      
      await configManager.updateConfig(updates);
      const config = configManager.getConfig();
      
      expect(config.server.port).toBe(9000);
      expect(config.server.host).toBe('updated-host');
      
      // ファイルに保存されていることを確認
      expect(fs.existsSync(testConfigPath)).toBe(true);
      const fileContent = fs.readFileSync(testConfigPath, 'utf-8');
      expect(fileContent).toContain('port = 9000');
      expect(fileContent).toContain('host = \"updated-host\"');
    });
    
    it('resetToDefaults()でデフォルト設定にリセットできる', async () => {
      // 設定を変更
      await configManager.updateConfig({
        server: { port: 9000, host: 'changed', auto_start: false, max_connections: 1, request_timeout: 1000 }
      });
      
      // リセット
      await configManager.resetToDefaults();
      const config = configManager.getConfig();
      
      expect(config).toEqual(DEFAULT_SERVER_CONFIG);
    });
  });
  
  describe('設定の検証', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });
    
    it('無効な設定値で更新しようとするとエラーが発生する', async () => {
      const invalidConfig: any = {
        server: {
          port: -1, // 無効なポート番号
          host: '',
          auto_start: true,
          max_connections: 100,
          request_timeout: 30000,
        }
      };
      
      await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow();
    });
    
    it('範囲外の値は拒否される', async () => {
      const invalidConfig: any = {
        server: {
          port: 99999, // 有効範囲外
          host: 'localhost',
          auto_start: true,
          max_connections: 100,
          request_timeout: 30000,
        }
      };
      
      await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow();
    });
  });
  
  describe('設定ファイルのインポート・エクスポート', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });
    
    it('exportConfig()でTOML形式の設定を取得できる', async () => {
      const tomlContent = await configManager.exportConfig();
      const config = configManager.getConfig();
      
      expect(tomlContent).toContain('[server]');
      expect(tomlContent).toContain('[database]');
      expect(tomlContent).toContain('[schedules]');
      expect(tomlContent).toContain('[logging]');
      expect(tomlContent).toContain('[security]');
      expect(tomlContent).toContain('[performance]');
      expect(tomlContent).toContain(`port = ${config.server.port}`);
    });
    
    it('importConfig()でTOML設定をインポートできる', async () => {
      const tomlContent = `
[server]
port = 8080
host = "imported-host"

[database]
cache_size = 5000

[schedules]
check_interval = 300
`;
      
      await configManager.importConfig(tomlContent);
      const config = configManager.getConfig();
      
      expect(config.server.port).toBe(8080);
      expect(config.server.host).toBe('imported-host');
      expect(config.database.cache_size).toBe(5000);
      expect(config.schedules.check_interval).toBe(300);
    });
    
    it('無効なTOMLインポートはエラーが発生する', async () => {
      const invalidToml = 'invalid toml [[[';
      
      await expect(configManager.importConfig(invalidToml)).rejects.toThrow();
    });
  });
  
  describe('OS別設定ディレクトリ', () => {
    it('デフォルトのConfigManagerはOS標準パスを使用する', () => {
      const defaultManager = new ServerConfigManager();
      const configPath = defaultManager.getConfigFilePath();
      
      // OS別の標準パスであることを確認
      if (process.platform === 'win32') {
        expect(configPath).toContain('AppData');
      } else if (process.platform === 'darwin') {
        expect(configPath).toContain('Library/Application Support');
      } else {
        expect(configPath).toContain('.config');
      }
      
      expect(configPath).toContain('YuToDo');
      expect(configPath).toContain('server-config.toml');
    });
  });
});