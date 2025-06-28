// セキュアなシークレット管理システム
// Environment variables, Docker secrets, and encrypted configuration support

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export interface SecretConfig {
  // シークレット取得方法の優先順位
  priority: ('env' | 'docker' | 'file' | 'vault')[];
  
  // Docker Secrets設定
  dockerSecretsPath: string;
  
  // ファイルベースシークレット設定
  secretsFile?: string;
  
  // 暗号化設定
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyPath?: string;
    key?: string;
  };
  
  // シークレットローテーション設定
  rotation: {
    enabled: boolean;
    intervalHours: number;
    webhook?: string;
  };
}

export interface SecretValue {
  value: string;
  source: 'env' | 'docker' | 'file' | 'vault' | 'default';
  encrypted: boolean;
  lastRotated?: Date;
  expiresAt?: Date;
}

export interface DatabaseSecrets {
  connectionString?: string;
  encryptionKey?: string;
  backupKey?: string;
}

export interface AuthSecrets {
  jwtSecret?: string;
  sessionSecret?: string;
  hashSalt?: string;
}

export interface ExternalSecrets {
  webhookSecret?: string;
  apiKeys?: Record<string, string>;
  certificates?: Record<string, string>;
}

export interface AllSecrets {
  database: DatabaseSecrets;
  auth: AuthSecrets;
  external: ExternalSecrets;
}

export class SecretManager {
  private config: SecretConfig;
  private cache: Map<string, SecretValue> = new Map();
  private encryptionKey?: Buffer;
  private rotationInterval?: NodeJS.Timeout;

  constructor(config: SecretConfig) {
    this.config = config;
    this.initializeEncryption();
    this.setupRotation();
  }

  // 暗号化システムの初期化
  private initializeEncryption(): void {
    if (!this.config.encryption.enabled) {
      return;
    }

    try {
      if (this.config.encryption.keyPath) {
        // ファイルから暗号化キーを読み込み
        const keyData = readFileSync(this.config.encryption.keyPath, 'utf8');
        this.encryptionKey = Buffer.from(keyData.trim(), 'base64');
      } else if (this.config.encryption.key) {
        // 直接指定されたキーを使用
        this.encryptionKey = Buffer.from(this.config.encryption.key, 'base64');
      } else {
        // 新しい暗号化キーを生成
        this.encryptionKey = crypto.randomBytes(32);
        console.warn('⚠️ Generated new encryption key. Consider persisting it securely.');
      }
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  // シークレットローテーションの設定
  private setupRotation(): void {
    if (!this.config.rotation.enabled) {
      return;
    }

    const intervalMs = this.config.rotation.intervalHours * 60 * 60 * 1000;
    this.rotationInterval = setInterval(() => {
      this.rotateSecrets();
    }, intervalMs);

    console.log(`🔄 Secret rotation enabled: every ${this.config.rotation.intervalHours} hours`);
  }

  // 暗号化
  private encrypt(text: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.config.encryption.algorithm, this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // 復号化
  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipher(this.config.encryption.algorithm, this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 環境変数からシークレットを取得
  private getFromEnvironment(key: string): string | undefined {
    return process.env[key];
  }

  // Docker Secretsからシークレットを取得
  private getFromDockerSecrets(key: string): string | undefined {
    const secretPath = join(this.config.dockerSecretsPath, key);
    
    if (existsSync(secretPath)) {
      try {
        return readFileSync(secretPath, 'utf8').trim();
      } catch (error) {
        console.error(`❌ Failed to read Docker secret: ${key}`, error);
      }
    }
    
    return undefined;
  }

  // ファイルからシークレットを取得
  private getFromFile(key: string): string | undefined {
    if (!this.config.secretsFile || !existsSync(this.config.secretsFile)) {
      return undefined;
    }

    try {
      const secretsData = JSON.parse(readFileSync(this.config.secretsFile, 'utf8'));
      const value = secretsData[key];
      
      if (value && typeof value === 'string') {
        // 暗号化されている場合は復号化
        if (value.includes(':') && this.config.encryption.enabled) {
          return this.decrypt(value);
        }
        return value;
      }
    } catch (error) {
      console.error(`❌ Failed to read secret from file: ${key}`, error);
    }
    
    return undefined;
  }

  // シークレット取得の汎用メソッド
  public getSecret(key: string, defaultValue?: string): SecretValue {
    // キャッシュから確認
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      if (!cached.expiresAt || cached.expiresAt > new Date()) {
        return cached;
      } else {
        this.cache.delete(key);
      }
    }

    let value: string | undefined;
    let source: SecretValue['source'] = 'default';

    // 優先順位に基づいてシークレットを取得
    for (const sourceType of this.config.priority) {
      switch (sourceType) {
        case 'env':
          value = this.getFromEnvironment(key);
          if (value) source = 'env';
          break;
        case 'docker':
          value = this.getFromDockerSecrets(key);
          if (value) source = 'docker';
          break;
        case 'file':
          value = this.getFromFile(key);
          if (value) source = 'file';
          break;
        case 'vault':
          // 将来的にHashiCorp Vaultなどとの統合
          break;
      }
      
      if (value) break;
    }

    // デフォルト値を使用
    if (!value && defaultValue) {
      value = defaultValue;
      source = 'default';
    }

    if (!value) {
      throw new Error(`Secret not found: ${key}`);
    }

    const secretValue: SecretValue = {
      value,
      source,
      encrypted: this.config.encryption.enabled && source !== 'env',
      lastRotated: new Date()
    };

    // キャッシュに保存（1時間で期限切れ）
    if (source !== 'default') {
      secretValue.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      this.cache.set(key, secretValue);
    }

    return secretValue;
  }

  // 構造化されたシークレットの取得
  public getAllSecrets(): AllSecrets {
    return {
      database: {
        connectionString: this.getSecret('DB_CONNECTION_STRING')?.value,
        encryptionKey: this.getSecret('DB_ENCRYPTION_KEY')?.value,
        backupKey: this.getSecret('DB_BACKUP_KEY')?.value,
      },
      auth: {
        jwtSecret: this.getSecret('JWT_SECRET')?.value,
        sessionSecret: this.getSecret('SESSION_SECRET')?.value,
        hashSalt: this.getSecret('HASH_SALT')?.value,
      },
      external: {
        webhookSecret: this.getSecret('WEBHOOK_SECRET')?.value,
        apiKeys: this.getApiKeys(),
        certificates: this.getCertificates(),
      }
    };
  }

  // APIキーの取得
  private getApiKeys(): Record<string, string> {
    const apiKeys: Record<string, string> = {};
    
    // 既知のAPIキーを試行
    const knownKeys = [
      'OPENAI_API_KEY',
      'GITHUB_API_KEY',
      'PROMETHEUS_API_KEY',
      'GRAFANA_API_KEY',
      'JAEGER_API_KEY'
    ];

    for (const key of knownKeys) {
      try {
        const secret = this.getSecret(key);
        if (secret) {
          apiKeys[key] = secret.value;
        }
      } catch {
        // キーが存在しない場合は無視
      }
    }

    return apiKeys;
  }

  // 証明書の取得
  private getCertificates(): Record<string, string> {
    const certificates: Record<string, string> = {};
    
    const certKeys = [
      'SSL_CERT',
      'SSL_KEY',
      'CA_CERT',
      'CLIENT_CERT',
      'CLIENT_KEY'
    ];

    for (const key of certKeys) {
      try {
        const secret = this.getSecret(key);
        if (secret) {
          certificates[key] = secret.value;
        }
      } catch {
        // 証明書が存在しない場合は無視
      }
    }

    return certificates;
  }

  // シークレットのローテーション
  private async rotateSecrets(): Promise<void> {
    console.log('🔄 Starting secret rotation...');
    
    try {
      // ローテーション対象のシークレットをクリア
      this.cache.clear();
      
      // Webhookでローテーション通知
      if (this.config.rotation.webhook) {
        await this.notifyRotation();
      }
      
      console.log('✅ Secret rotation completed');
    } catch (error) {
      console.error('❌ Secret rotation failed:', error);
    }
  }

  // ローテーション通知
  private async notifyRotation(): Promise<void> {
    if (!this.config.rotation.webhook) return;

    try {
      const response = await fetch(this.config.rotation.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'secret_rotation',
          timestamp: new Date().toISOString(),
          service: 'yutodo-server'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to notify secret rotation:', error);
    }
  }

  // シークレットの状態確認
  public getSecretStatus(): any {
    const status = {
      totalCached: this.cache.size,
      encryptionEnabled: this.config.encryption.enabled,
      rotationEnabled: this.config.rotation.enabled,
      sources: this.config.priority,
      cached: Array.from(this.cache.keys()).map(key => {
        const secret = this.cache.get(key)!;
        return {
          key,
          source: secret.source,
          encrypted: secret.encrypted,
          lastRotated: secret.lastRotated,
          expiresAt: secret.expiresAt
        };
      })
    };

    return status;
  }

  // 特定のシークレットを強制的に更新
  public refreshSecret(key: string): void {
    this.cache.delete(key);
    console.log(`🔄 Refreshed secret: ${key}`);
  }

  // シークレットマネージャーのクリーンアップ
  public cleanup(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    this.cache.clear();
    console.log('🧹 Secret manager cleanup completed');
  }

  // セキュリティ監査用のログ
  public auditSecretAccess(key: string, accessType: 'read' | 'write' | 'rotate'): void {
    const auditLog = {
      timestamp: new Date().toISOString(),
      secretKey: key,
      accessType,
      source: this.cache.get(key)?.source || 'unknown',
      service: 'yutodo-server'
    };

    // 監査ログを構造化ログシステムに送信
    console.log('🔍 SECRET_AUDIT:', JSON.stringify(auditLog));
  }
}

// デフォルト設定
export const DEFAULT_SECRET_CONFIG: SecretConfig = {
  priority: ['env', 'docker', 'file'],
  dockerSecretsPath: '/run/secrets',
  encryption: {
    enabled: false,
    algorithm: 'aes-256-cbc'
  },
  rotation: {
    enabled: false,
    intervalHours: 24
  }
};

// グローバルシークレットマネージャー
let globalSecretManager: SecretManager;

export function initializeSecretManager(config: SecretConfig = DEFAULT_SECRET_CONFIG): SecretManager {
  globalSecretManager = new SecretManager(config);
  return globalSecretManager;
}

export function getSecretManager(): SecretManager {
  if (!globalSecretManager) {
    throw new Error('Secret manager not initialized. Call initializeSecretManager() first.');
  }
  return globalSecretManager;
}

// 便利関数
export const secrets = {
  get: getSecretManager,
  init: initializeSecretManager
};

export default secrets;