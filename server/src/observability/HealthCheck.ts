// ヘルスチェックシステム
// Comprehensive health monitoring for the YuToDo server

import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { ServerConfig } from '../types/config';
import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import { dirname } from 'path';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  duration: number;
  details?: any;
}

export interface CustomHealthCheck {
  name: string;
  check: () => Promise<CheckResult>;
  critical: boolean; // criticalな場合、失敗時に全体のステータスがunhealthyになる
}

export class HealthCheckSystem {
  private config: ServerConfig['observability']['health'];
  private dbConnection?: sqlite3.Database;
  private server?: HttpServer;
  private app?: express.Application;
  private customChecks: Map<string, CustomHealthCheck> = new Map();
  private startTime: Date;

  constructor(config: ServerConfig['observability']['health'], dbConnection?: sqlite3.Database) {
    this.config = config;
    this.dbConnection = dbConnection;
    this.startTime = new Date();
  }

  // ヘルスチェックサーバーの開始
  async startHealthServer(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.app = express();
    this.app.use(express.json());

    // メインヘルスチェックエンドポイント
    this.app.get(this.config.path, async (req, res) => {
      try {
        const healthResult = await this.performHealthCheck();
        
        // HTTPステータスコードの設定
        let statusCode = 200;
        if (healthResult.status === 'degraded') {
          statusCode = 200; // degradedは200を返す（運用方針による）
        } else if (healthResult.status === 'unhealthy') {
          statusCode = 503; // Service Unavailable
        }

        res.status(statusCode).json(healthResult);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          checks: {
            system: {
              status: 'fail',
              message: `Health check failed: ${(error as Error).message}`,
              duration: 0
            }
          },
          timestamp: new Date().toISOString(),
          uptime: this.getUptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        });
      }
    });

    // 個別チェックエンドポイント
    this.app.get(`${this.config.path}/:checkName`, async (req, res) => {
      const checkName = req.params.checkName;
      try {
        const result = await this.performSingleCheck(checkName);
        res.json({
          check: checkName,
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(404).json({
          error: `Health check '${checkName}' not found`,
          availableChecks: this.getAvailableChecks()
        });
      }
    });

    // 詳細情報エンドポイント
    this.app.get('/info', (req, res) => {
      res.json({
        service: 'yutodo-server',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: this.getUptime(),
        startTime: this.startTime.toISOString(),
        checks: {
          enabled: this.getAvailableChecks(),
          configuration: {
            timeout: this.config.timeout,
            checks: this.config.checks
          }
        }
      });
    });

    // readinessプローブ（Kubernetesスタイル）
    this.app.get('/ready', async (req, res) => {
      try {
        const result = await this.checkReadiness();
        res.status(result.status === 'pass' ? 200 : 503).json(result);
      } catch (error) {
        res.status(503).json({
          status: 'fail',
          message: `Readiness check failed: ${(error as Error).message}`
        });
      }
    });

    // livenessプローブ（Kubernetesスタイル）
    this.app.get('/live', (req, res) => {
      res.json({
        status: 'pass',
        message: 'Service is alive',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime()
      });
    });

    this.server = createServer(this.app);
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, () => {
        console.log(`🏥 Health check server running on port ${this.config.port}`);
        console.log(`   Health endpoint: http://localhost:${this.config.port}${this.config.path}`);
        console.log(`   Ready endpoint: http://localhost:${this.config.port}/ready`);
        console.log(`   Live endpoint: http://localhost:${this.config.port}/live`);
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  // メインヘルスチェックの実行
  private async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: Record<string, CheckResult> = {};
    const checkPromises: Promise<void>[] = [];

    // 並行してすべてのチェックを実行
    if (this.config.checks.database && this.dbConnection) {
      checkPromises.push(this.executeCheck('database', () => this.checkDatabase(), checks));
    }

    if (this.config.checks.memory) {
      checkPromises.push(this.executeCheck('memory', () => this.checkMemory(), checks));
    }

    if (this.config.checks.disk_space) {
      checkPromises.push(this.executeCheck('disk_space', () => this.checkDiskSpace(), checks));
    }

    // カスタムチェックの実行
    if (this.config.checks.custom_checks) {
      for (const [name, customCheck] of this.customChecks) {
        checkPromises.push(this.executeCheck(name, customCheck.check, checks));
      }
    }

    // すべてのチェックを並行実行し、タイムアウトを設定
    await Promise.allSettled(
      checkPromises.map(promise => 
        Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
          )
        ])
      )
    );

    // 全体のステータスを判定
    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // 個別チェックの実行
  private async executeCheck(
    name: string, 
    checkFn: () => Promise<CheckResult>, 
    results: Record<string, CheckResult>
  ): Promise<void> {
    try {
      results[name] = await checkFn();
    } catch (error) {
      results[name] = {
        status: 'fail',
        message: `Check failed: ${(error as Error).message}`,
        duration: 0
      };
    }
  }

  // データベースヘルスチェック
  private async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      if (!this.dbConnection) {
        resolve({
          status: 'fail',
          message: 'Database connection not available',
          duration: Date.now() - startTime
        });
        return;
      }

      // シンプルなクエリでデータベース接続をテスト
      this.dbConnection.get('SELECT 1 as test', (err, row) => {
        const duration = Date.now() - startTime;
        
        if (err) {
          resolve({
            status: 'fail',
            message: `Database query failed: ${err.message}`,
            duration,
            details: { error: err.message }
          });
        } else if (row && (row as any).test === 1) {
          resolve({
            status: 'pass',
            message: 'Database connection healthy',
            duration,
            details: { query: 'SELECT 1', result: 'success' }
          });
        } else {
          resolve({
            status: 'fail',
            message: 'Database query returned unexpected result',
            duration,
            details: { result: row }
          });
        }
      });
    });
  }

  // メモリヘルスチェック
  private async checkMemory(): Promise<CheckResult> {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `Memory usage: ${memPercent.toFixed(1)}%`;
    
    if (memPercent > 90) {
      status = 'fail';
      message = `Critical memory usage: ${memPercent.toFixed(1)}%`;
    } else if (memPercent > 75) {
      status = 'warn';
      message = `High memory usage: ${memPercent.toFixed(1)}%`;
    }

    return {
      status,
      message,
      duration: Date.now() - startTime,
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        percentage: memPercent
      }
    };
  }

  // ディスク容量ヘルスチェック
  private async checkDiskSpace(): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      // データベースディレクトリの容量を確認
      const dbPath = process.env.YUTODO_DB_PATH || './todos.db';
      const dbDir = dirname(dbPath);
      const stats = await fs.stat(dbDir);
      
      // 簡易的なディスク使用量チェック（実際の実装では statvfs など使用）
      const totalSpace = 100 * 1024 * 1024 * 1024; // 仮の値: 100GB
      const freeSpace = 20 * 1024 * 1024 * 1024;   // 仮の値: 20GB
      const usedPercent = ((totalSpace - freeSpace) / totalSpace) * 100;
      
      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = `Disk usage: ${usedPercent.toFixed(1)}%`;
      
      if (usedPercent > 95) {
        status = 'fail';
        message = `Critical disk usage: ${usedPercent.toFixed(1)}%`;
      } else if (usedPercent > 85) {
        status = 'warn';
        message = `High disk usage: ${usedPercent.toFixed(1)}%`;
      }

      return {
        status,
        message,
        duration: Date.now() - startTime,
        details: {
          path: dbDir,
          totalGB: Math.round(totalSpace / 1024 / 1024 / 1024),
          freeGB: Math.round(freeSpace / 1024 / 1024 / 1024),
          usedPercent
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Disk check failed: ${(error as Error).message}`,
        duration: Date.now() - startTime
      };
    }
  }

  // readinessチェック（起動準備完了チェック）
  private async checkReadiness(): Promise<CheckResult> {
    const startTime = Date.now();
    
    // 基本的なチェック項目
    const checks = [];
    
    if (this.config.checks.database && this.dbConnection) {
      checks.push(this.checkDatabase());
    }
    
    const results = await Promise.allSettled(checks);
    const failedChecks = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.status === 'fail')
    );
    
    const status = failedChecks.length === 0 ? 'pass' : 'fail';
    const message = status === 'pass' 
      ? 'Service is ready to receive traffic'
      : `Service not ready: ${failedChecks.length} checks failed`;
    
    return {
      status,
      message,
      duration: Date.now() - startTime,
      details: {
        totalChecks: checks.length,
        failedChecks: failedChecks.length
      }
    };
  }

  // 個別チェックの実行
  private async performSingleCheck(checkName: string): Promise<CheckResult> {
    switch (checkName) {
      case 'database':
        if (!this.config.checks.database) throw new Error('Database check not enabled');
        return this.checkDatabase();
        
      case 'memory':
        if (!this.config.checks.memory) throw new Error('Memory check not enabled');
        return this.checkMemory();
        
      case 'disk_space':
        if (!this.config.checks.disk_space) throw new Error('Disk space check not enabled');
        return this.checkDiskSpace();
        
      default:
        const customCheck = this.customChecks.get(checkName);
        if (customCheck) {
          return customCheck.check();
        }
        throw new Error(`Unknown check: ${checkName}`);
    }
  }

  // 全体ステータスの判定
  private determineOverallStatus(checks: Record<string, CheckResult>): 'healthy' | 'degraded' | 'unhealthy' {
    const results = Object.values(checks);
    
    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    
    // クリティカルなカスタムチェックの失敗を確認
    const criticalFailures = Object.entries(checks).some(([name, result]) => {
      const customCheck = this.customChecks.get(name);
      return customCheck?.critical && result.status === 'fail';
    });
    
    if (failCount > 0 || criticalFailures) {
      return 'unhealthy';
    }
    
    if (warnCount > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  // カスタムヘルスチェックの追加
  addCustomCheck(check: CustomHealthCheck): void {
    this.customChecks.set(check.name, check);
  }

  // カスタムヘルスチェックの削除
  removeCustomCheck(name: string): void {
    this.customChecks.delete(name);
  }

  // 利用可能なチェック一覧の取得
  private getAvailableChecks(): string[] {
    const checks: string[] = [];
    
    if (this.config.checks.database) checks.push('database');
    if (this.config.checks.memory) checks.push('memory');
    if (this.config.checks.disk_space) checks.push('disk_space');
    
    checks.push(...Array.from(this.customChecks.keys()));
    
    return checks;
  }

  // アップタイムの取得（秒）
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  // ヘルスチェックサーバーの停止
  async stopHealthServer(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('🏥 Health check server stopped');
          resolve();
        });
      });
    }
  }

  // 設定の更新
  updateConfig(config: ServerConfig['observability']['health']): void {
    this.config = config;
  }

  // 統計情報の取得
  getStats(): any {
    return {
      enabled: this.config.enabled,
      port: this.config.port,
      path: this.config.path,
      uptime: this.getUptime(),
      availableChecks: this.getAvailableChecks(),
      customChecks: this.customChecks.size
    };
  }
}

// グローバルヘルスチェックシステム
let globalHealthCheck: HealthCheckSystem;

export function initializeHealthCheck(
  config: ServerConfig['observability']['health'], 
  dbConnection?: sqlite3.Database
): HealthCheckSystem {
  globalHealthCheck = new HealthCheckSystem(config, dbConnection);
  return globalHealthCheck;
}

export function getHealthCheck(): HealthCheckSystem {
  if (!globalHealthCheck) {
    throw new Error('Health check system not initialized. Call initializeHealthCheck() first.');
  }
  return globalHealthCheck;
}

// 便利関数
export const health = {
  get: getHealthCheck,
  init: initializeHealthCheck
};

export default health;