// セキュリティミドルウェア統合システム
// Rate limiting, input validation, security headers, and CORS management

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, param, query, validationResult } from 'express-validator';
import { ServerConfig } from '../types/config';

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    message: string;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  
  headers: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    hsts: boolean;
    xssFilter: boolean;
    noSniff: boolean;
    frameguard: boolean;
    dnsPrefetchControl: boolean;
  };
  
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  
  validation: {
    enabled: boolean;
    sanitization: boolean;
    strictMode: boolean;
  };
  
  monitoring: {
    enabled: boolean;
    logFailedRequests: boolean;
    logSuspiciousActivity: boolean;
  };
}

export interface SecurityStats {
  rateLimitHits: number;
  blockedRequests: number;
  validationErrors: number;
  suspiciousActivity: number;
  lastReset: Date;
}

export class SecurityMiddleware {
  private config: SecurityConfig;
  private stats: SecurityStats;
  private suspiciousIPs: Set<string> = new Set();
  private rateLimitStore: Map<string, number> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.stats = {
      rateLimitHits: 0,
      blockedRequests: 0,
      validationErrors: 0,
      suspiciousActivity: 0,
      lastReset: new Date()
    };
    
    this.setupCleanupSchedule();
  }

  // Rate Limiting Middleware
  public createRateLimitMiddleware() {
    if (!this.config.rateLimiting.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: this.config.rateLimiting.maxRequests,
      message: {
        error: 'Too many requests',
        message: this.config.rateLimiting.message,
        retryAfter: Math.ceil(this.config.rateLimiting.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: this.config.rateLimiting.skipSuccessfulRequests,
      skipFailedRequests: this.config.rateLimiting.skipFailedRequests,
      onLimitReached: (req: Request) => {
        this.stats.rateLimitHits++;
        this.logSecurityEvent('rate_limit_exceeded', req);
        
        // 疑わしいIPを記録
        if (req.ip) {
          this.suspiciousIPs.add(req.ip);
        }
      }
    });
  }

  // Security Headers Middleware
  public createSecurityHeadersMiddleware() {
    if (!this.config.headers.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return helmet({
      contentSecurityPolicy: this.config.headers.contentSecurityPolicy ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        }
      } : false,
      
      hsts: this.config.headers.hsts ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      
      xssFilter: this.config.headers.xssFilter,
      noSniff: this.config.headers.noSniff,
      frameguard: this.config.headers.frameguard ? { action: 'deny' } : false,
      dnsPrefetchControl: this.config.headers.dnsPrefetchControl
    });
  }

  // CORS Middleware
  public createCORSMiddleware() {
    if (!this.config.cors.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return cors({
      origin: (origin, callback) => {
        // 開発環境での localhost 自動許可
        if (!origin || this.config.cors.origins.includes('*')) {
          return callback(null, true);
        }
        
        // 設定されたオリジンをチェック
        if (this.config.cors.origins.includes(origin)) {
          return callback(null, true);
        }
        
        // 開発環境用: localhost:1400-1500 の範囲を自動的に許可
        if (origin.match(/^http:\/\/localhost:(1[4-5]\d{2})$/)) {
          return callback(null, true);
        }
        
        // CORS エラーをログ
        this.logSecurityEvent('cors_violation', { origin });
        callback(new Error('Not allowed by CORS'));
      },
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowedHeaders,
      credentials: this.config.cors.credentials,
      maxAge: this.config.cors.maxAge
    });
  }

  // Input Validation Middleware
  public createValidationMiddleware(validationRules: any[]) {
    return [
      ...validationRules,
      (req: Request, res: Response, next: NextFunction) => {
        if (!this.config.validation.enabled) {
          return next();
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          this.stats.validationErrors++;
          this.logSecurityEvent('validation_error', req, {
            errors: errors.array(),
            body: this.sanitizeForLogging(req.body),
            query: this.sanitizeForLogging(req.query)
          });

          return res.status(400).json({
            error: 'Validation failed',
            details: this.config.validation.strictMode ? errors.array() : 'Invalid input'
          });
        }

        next();
      }
    ];
  }

  // 一般的な検証ルール
  public static validationRules = {
    // Todo ID validation
    todoId: param('id').isUUID().withMessage('Invalid todo ID format'),
    
    // Todo creation validation
    createTodo: [
      body('title')
        .isString()
        .isLength({ min: 1, max: 500 })
        .trim()
        .escape()
        .withMessage('Title must be 1-500 characters'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .trim()
        .escape()
        .withMessage('Description must be max 2000 characters'),
      body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Priority must be low, medium, or high'),
      body('scheduledFor')
        .optional()
        .isISO8601()
        .withMessage('Scheduled date must be valid ISO 8601 format')
    ],
    
    // Schedule validation
    createSchedule: [
      body('title')
        .isString()
        .isLength({ min: 1, max: 200 })
        .trim()
        .escape()
        .withMessage('Schedule title must be 1-200 characters'),
      body('type')
        .isIn(['once', 'daily', 'weekly', 'monthly', 'custom'])
        .withMessage('Invalid schedule type'),
      body('startDate')
        .isISO8601()
        .withMessage('Start date must be valid ISO 8601 format'),
      body('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be valid ISO 8601 format')
    ],
    
    // Query parameter validation
    pagination: [
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be between 1 and 1000'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ],
    
    // Search validation
    search: [
      query('q')
        .isString()
        .isLength({ min: 1, max: 100 })
        .trim()
        .escape()
        .withMessage('Search query must be 1-100 characters')
    ]
  };

  // 疑わしい活動の検出
  public createSuspiciousActivityMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.monitoring.enabled) {
        return next();
      }

      let suspiciousScore = 0;
      const reasons: string[] = [];

      // 疑わしいIPからのアクセス
      if (req.ip && this.suspiciousIPs.has(req.ip)) {
        suspiciousScore += 20;
        reasons.push('suspicious_ip');
      }

      // 異常に長いURL
      if (req.url.length > 1000) {
        suspiciousScore += 30;
        reasons.push('long_url');
      }

      // 異常に大きなボディ
      if (req.get('content-length') && parseInt(req.get('content-length')!) > 10 * 1024 * 1024) {
        suspiciousScore += 40;
        reasons.push('large_body');
      }

      // SQL Injection の兆候
      const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
        /(UNION|OR\s+1=1|AND\s+1=1)/i,
        /('|('')|(\-\-)|(;))/
      ];
      
      const queryString = req.url + JSON.stringify(req.body);
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(queryString)) {
          suspiciousScore += 50;
          reasons.push('sql_injection_pattern');
          break;
        }
      }

      // XSS の兆候
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(queryString)) {
          suspiciousScore += 40;
          reasons.push('xss_pattern');
          break;
        }
      }

      // 疑わしいスコアが閾値を超えた場合
      if (suspiciousScore >= 50) {
        this.stats.suspiciousActivity++;
        this.stats.blockedRequests++;
        
        this.logSecurityEvent('suspicious_activity', req, {
          score: suspiciousScore,
          reasons,
          blocked: true
        });

        return res.status(403).json({
          error: 'Request blocked due to suspicious activity',
          requestId: req.get('x-request-id') || 'unknown'
        });
      }

      // 疑わしいが許可する場合はログのみ
      if (suspiciousScore > 0) {
        this.logSecurityEvent('suspicious_activity', req, {
          score: suspiciousScore,
          reasons,
          blocked: false
        });
      }

      next();
    };
  }

  // セキュリティイベントのログ記録
  private logSecurityEvent(
    eventType: string, 
    req: Request | any, 
    additionalData?: any
  ): void {
    const securityLog = {
      timestamp: new Date().toISOString(),
      eventType,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      method: req.method || 'unknown',
      url: req.url || 'unknown',
      headers: this.sanitizeHeaders(req.headers || {}),
      ...additionalData
    };

    // 構造化ログとして出力
    console.log('🚨 SECURITY_EVENT:', JSON.stringify(securityLog));
  }

  // ログ用のデータサニタイゼーション
  private sanitizeForLogging(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  // ヘッダーのサニタイゼーション
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  // セキュリティ統計の取得
  public getSecurityStats(): SecurityStats & { 
    suspiciousIPs: number;
    rateLimitStoreSize: number;
  } {
    return {
      ...this.stats,
      suspiciousIPs: this.suspiciousIPs.size,
      rateLimitStoreSize: this.rateLimitStore.size
    };
  }

  // 統計のリセット
  public resetStats(): void {
    this.stats = {
      rateLimitHits: 0,
      blockedRequests: 0,
      validationErrors: 0,
      suspiciousActivity: 0,
      lastReset: new Date()
    };
  }

  // 疑わしいIPのクリア
  public clearSuspiciousIPs(): void {
    this.suspiciousIPs.clear();
    console.log('🧹 Cleared suspicious IPs list');
  }

  // IPを疑わしいリストに追加
  public addSuspiciousIP(ip: string): void {
    this.suspiciousIPs.add(ip);
    this.logSecurityEvent('ip_added_to_suspicious_list', { ip });
  }

  // IPを疑わしいリストから除去
  public removeSuspiciousIP(ip: string): void {
    this.suspiciousIPs.delete(ip);
    this.logSecurityEvent('ip_removed_from_suspicious_list', { ip });
  }

  // 定期的なクリーンアップスケジュール
  private setupCleanupSchedule(): void {
    // 1時間ごとに疑わしいIPリストをクリーンアップ
    setInterval(() => {
      if (this.suspiciousIPs.size > 1000) {
        this.clearSuspiciousIPs();
        console.log('🧹 Auto-cleared suspicious IPs due to size limit');
      }
    }, 60 * 60 * 1000);

    // 24時間ごとに統計をリセット
    setInterval(() => {
      this.resetStats();
      console.log('📊 Security stats reset');
    }, 24 * 60 * 60 * 1000);
  }

  // 設定の更新
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Security middleware configuration updated');
  }
}

// デフォルト設定
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  headers: {
    enabled: true,
    contentSecurityPolicy: true,
    hsts: true,
    xssFilter: true,
    noSniff: true,
    frameguard: true,
    dnsPrefetchControl: true
  },
  
  cors: {
    enabled: true,
    origins: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  
  validation: {
    enabled: true,
    sanitization: true,
    strictMode: false
  },
  
  monitoring: {
    enabled: true,
    logFailedRequests: true,
    logSuspiciousActivity: true
  }
};

// サーバー設定からセキュリティ設定を生成
export function createSecurityConfigFromServer(serverConfig: ServerConfig): SecurityConfig {
  return {
    ...DEFAULT_SECURITY_CONFIG,
    rateLimiting: {
      ...DEFAULT_SECURITY_CONFIG.rateLimiting,
      enabled: serverConfig.security.enable_rate_limiting,
      windowMs: serverConfig.security.rate_limit_window * 60 * 1000,
      maxRequests: serverConfig.security.rate_limit_max_requests
    },
    cors: {
      ...DEFAULT_SECURITY_CONFIG.cors,
      origins: serverConfig.security.cors_origins,
      methods: serverConfig.security.cors_methods
    }
  };
}

export default SecurityMiddleware;