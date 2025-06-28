// セキュリティ監査・監視システム
// Security event logging, audit trails, threat detection, and compliance reporting

import { Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure' | 'blocked';
  details: any;
  riskScore: number;
  tags: string[];
}

export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration_change'
  | 'suspicious_activity'
  | 'rate_limit'
  | 'validation_error'
  | 'cors_violation'
  | 'injection_attempt'
  | 'privilege_escalation'
  | 'system_access'
  | 'network_anomaly';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  eventTypes: SecurityEventType[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RuleCondition {
  type: 'pattern' | 'threshold' | 'frequency' | 'anomaly';
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
  timeWindow?: number; // seconds
}

export interface RuleAction {
  type: 'log' | 'alert' | 'block' | 'webhook' | 'email';
  configuration: any;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<string, number>;
  riskScoreDistribution: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
  topIPs: Array<{ ip: string; count: number; riskScore: number }>;
  recentTrends: Array<{ timestamp: string; count: number; avgRiskScore: number }>;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEvents: number;
    securityIncidents: number;
    dataBreaches: number;
    unauthorizedAccess: number;
    complianceViolations: number;
  };
  details: {
    authenticationEvents: number;
    dataAccessEvents: number;
    configurationChanges: number;
    suspiciousActivities: number;
  };
  recommendations: string[];
}

export class SecurityAudit {
  private auditDir: string;
  private rules: Map<string, SecurityRule> = new Map();
  private eventBuffer: AuditEvent[] = [];
  private metrics: SecurityMetrics;
  private flushInterval?: NodeJS.Timeout;

  constructor(auditDir: string = './audit-logs') {
    this.auditDir = auditDir;
    this.ensureAuditDirectory();
    this.initializeMetrics();
    this.loadDefaultRules();
    this.setupPeriodicFlush();
  }

  // 監査ディレクトリの確保
  private ensureAuditDirectory(): void {
    if (!existsSync(this.auditDir)) {
      mkdirSync(this.auditDir, { recursive: true });
    }
    
    // 年月ごとのサブディレクトリを作成
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyDir = join(this.auditDir, yearMonth);
    
    if (!existsSync(monthlyDir)) {
      mkdirSync(monthlyDir, { recursive: true });
    }
  }

  // メトリクスの初期化
  private initializeMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {} as Record<SecurityEventType, number>,
      eventsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      riskScoreDistribution: { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 },
      topSources: [],
      topIPs: [],
      recentTrends: []
    };
  }

  // デフォルトセキュリティルールの読み込み
  private loadDefaultRules(): void {
    const defaultRules: SecurityRule[] = [
      {
        id: 'failed-auth-attempts',
        name: 'Multiple Failed Authentication Attempts',
        description: 'Detects multiple failed authentication attempts from the same IP',
        eventTypes: ['authentication'],
        conditions: [
          {
            type: 'frequency',
            field: 'result',
            operator: 'equals',
            value: 'failure',
            timeWindow: 300 // 5 minutes
          }
        ],
        actions: [
          { type: 'log', configuration: { level: 'warn' } },
          { type: 'alert', configuration: { threshold: 5 } }
        ],
        enabled: true,
        severity: 'high'
      },
      {
        id: 'sql-injection-attempt',
        name: 'SQL Injection Attempt',
        description: 'Detects potential SQL injection patterns',
        eventTypes: ['injection_attempt'],
        conditions: [
          {
            type: 'pattern',
            field: 'details.query',
            operator: 'regex',
            value: /(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR\s+1=1)/i
          }
        ],
        actions: [
          { type: 'log', configuration: { level: 'error' } },
          { type: 'block', configuration: { duration: 3600 } }
        ],
        enabled: true,
        severity: 'critical'
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Attempt',
        description: 'Detects attempts to access unauthorized resources',
        eventTypes: ['authorization', 'privilege_escalation'],
        conditions: [
          {
            type: 'pattern',
            field: 'result',
            operator: 'equals',
            value: 'blocked'
          }
        ],
        actions: [
          { type: 'log', configuration: { level: 'warn' } },
          { type: 'alert', configuration: { immediate: true } }
        ],
        enabled: true,
        severity: 'high'
      },
      {
        id: 'data-exfiltration',
        name: 'Potential Data Exfiltration',
        description: 'Detects unusual data access patterns',
        eventTypes: ['data_access'],
        conditions: [
          {
            type: 'threshold',
            field: 'details.recordCount',
            operator: 'gt',
            value: 1000,
            timeWindow: 3600
          }
        ],
        actions: [
          { type: 'log', configuration: { level: 'warn' } },
          { type: 'alert', configuration: { threshold: 1 } }
        ],
        enabled: true,
        severity: 'medium'
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }
  }

  // セキュリティイベントの記録
  public logSecurityEvent(
    eventType: SecurityEventType,
    req: Request,
    details: any = {},
    result: 'success' | 'failure' | 'blocked' = 'success'
  ): string {
    const eventId = crypto.randomUUID();
    const riskScore = this.calculateRiskScore(eventType, details, result);
    
    const auditEvent: AuditEvent = {
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType,
      severity: this.determineSeverity(eventType, riskScore),
      source: 'yutodo-server',
      userId: details.userId,
      sessionId: req.sessionID || details.sessionId,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      resource: details.resource || req.path,
      action: details.action || req.method,
      result,
      details: this.sanitizeDetails(details),
      riskScore,
      tags: this.generateTags(eventType, details)
    };

    // バッファに追加
    this.eventBuffer.push(auditEvent);
    
    // メトリクスを更新
    this.updateMetrics(auditEvent);
    
    // ルールをチェック
    this.checkRules(auditEvent);
    
    // 重要度が高い場合は即座にフラッシュ
    if (auditEvent.severity === 'critical' || auditEvent.severity === 'high') {
      this.flushEvents();
    }

    return eventId;
  }

  // リスクスコアの計算
  private calculateRiskScore(
    eventType: SecurityEventType,
    details: any,
    result: 'success' | 'failure' | 'blocked'
  ): number {
    let baseScore = 10;

    // イベントタイプ別の基本スコア
    const typeScores: Record<SecurityEventType, number> = {
      'authentication': 20,
      'authorization': 30,
      'data_access': 15,
      'data_modification': 25,
      'configuration_change': 40,
      'suspicious_activity': 50,
      'rate_limit': 10,
      'validation_error': 5,
      'cors_violation': 15,
      'injection_attempt': 80,
      'privilege_escalation': 70,
      'system_access': 35,
      'network_anomaly': 45
    };

    baseScore = typeScores[eventType] || 10;

    // 結果による調整
    if (result === 'failure') baseScore += 10;
    if (result === 'blocked') baseScore += 20;

    // 詳細情報による調整
    if (details.attemptCount && details.attemptCount > 3) baseScore += 15;
    if (details.dataSize && details.dataSize > 1000000) baseScore += 10;
    if (details.privilegeLevel === 'admin') baseScore += 20;
    if (details.fromExternalNetwork) baseScore += 15;

    // 時間帯による調整（営業時間外）
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) baseScore += 5;

    return Math.min(baseScore, 100);
  }

  // 重要度の決定
  private determineSeverity(eventType: SecurityEventType, riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80 || ['injection_attempt', 'privilege_escalation'].includes(eventType)) {
      return 'critical';
    } else if (riskScore >= 60) {
      return 'high';
    } else if (riskScore >= 30) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // タグの生成
  private generateTags(eventType: SecurityEventType, details: any): string[] {
    const tags: string[] = [eventType];
    
    if (details.userId) tags.push('authenticated');
    if (details.adminAction) tags.push('admin');
    if (details.automatedRequest) tags.push('automated');
    if (details.fromExternalNetwork) tags.push('external');
    if (details.suspiciousPattern) tags.push('suspicious');

    return tags;
  }

  // 詳細情報のサニタイゼーション
  private sanitizeDetails(details: any): any {
    const sanitized = JSON.parse(JSON.stringify(details));
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'cookie'];
    
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

  // メトリクスの更新
  private updateMetrics(event: AuditEvent): void {
    this.metrics.totalEvents++;
    
    this.metrics.eventsByType[event.eventType] = 
      (this.metrics.eventsByType[event.eventType] || 0) + 1;
    
    this.metrics.eventsBySeverity[event.severity]++;
    
    // リスクスコア分布
    if (event.riskScore <= 25) this.metrics.riskScoreDistribution['0-25']++;
    else if (event.riskScore <= 50) this.metrics.riskScoreDistribution['26-50']++;
    else if (event.riskScore <= 75) this.metrics.riskScoreDistribution['51-75']++;
    else this.metrics.riskScoreDistribution['76-100']++;
  }

  // ルールのチェック
  private checkRules(event: AuditEvent): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled || !rule.eventTypes.includes(event.eventType)) {
        continue;
      }

      let ruleMatched = true;
      for (const condition of rule.conditions) {
        if (!this.evaluateCondition(condition, event)) {
          ruleMatched = false;
          break;
        }
      }

      if (ruleMatched) {
        this.executeRuleActions(rule, event);
      }
    }
  }

  // 条件の評価
  private evaluateCondition(condition: RuleCondition, event: AuditEvent): boolean {
    const value = this.getFieldValue(condition.field, event);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(value));
      case 'gt':
        return Number(value) > condition.value;
      case 'lt':
        return Number(value) < condition.value;
      case 'gte':
        return Number(value) >= condition.value;
      case 'lte':
        return Number(value) <= condition.value;
      default:
        return false;
    }
  }

  // フィールド値の取得
  private getFieldValue(field: string, event: AuditEvent): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  // ルールアクションの実行
  private executeRuleActions(rule: SecurityRule, event: AuditEvent): void {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'log':
          console.log(`🚨 SECURITY_RULE_TRIGGERED: ${rule.name}`, {
            ruleId: rule.id,
            eventId: event.id,
            severity: rule.severity,
            event
          });
          break;
          
        case 'alert':
          this.sendAlert(rule, event, action.configuration);
          break;
          
        case 'block':
          this.blockSource(event.ip, action.configuration);
          break;
          
        case 'webhook':
          this.sendWebhook(rule, event, action.configuration);
          break;
      }
    }
  }

  // アラートの送信
  private sendAlert(rule: SecurityRule, event: AuditEvent, config: any): void {
    const alert = {
      timestamp: new Date().toISOString(),
      rule: rule.name,
      severity: rule.severity,
      event: {
        id: event.id,
        type: event.eventType,
        ip: event.ip,
        riskScore: event.riskScore
      },
      details: event.details
    };

    console.log(`🚨 SECURITY_ALERT:`, alert);
    
    // アラート履歴に保存
    this.saveAlert(alert);
  }

  // ソースのブロック
  private blockSource(ip: string, config: any): void {
    const blockEntry = {
      ip,
      blockedAt: new Date().toISOString(),
      duration: config.duration || 3600,
      reason: 'security_rule_violation'
    };

    console.log(`🚫 BLOCKING_IP:`, blockEntry);
    // 実際のブロック実装（Redis等を使用）
  }

  // Webhookの送信
  private async sendWebhook(rule: SecurityRule, event: AuditEvent, config: any): Promise<void> {
    if (!config.url) return;

    try {
      const payload = {
        rule: rule.name,
        event: {
          id: event.id,
          type: event.eventType,
          severity: event.severity,
          timestamp: event.timestamp
        }
      };

      await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('❌ Failed to send security webhook:', error);
    }
  }

  // アラートの保存
  private saveAlert(alert: any): void {
    const alertsFile = join(this.auditDir, 'alerts.jsonl');
    const alertLine = JSON.stringify(alert) + '\n';
    
    try {
      writeFileSync(alertsFile, alertLine, { flag: 'a' });
    } catch (error) {
      console.error('❌ Failed to save alert:', error);
    }
  }

  // イベントのフラッシュ
  private flushEvents(): void {
    if (this.eventBuffer.length === 0) return;

    const now = new Date();
    const filename = `audit-${now.toISOString().split('T')[0]}.jsonl`;
    const filePath = join(this.auditDir, filename);

    try {
      const events = this.eventBuffer.splice(0);
      const logLines = events.map(event => JSON.stringify(event)).join('\n') + '\n';
      
      writeFileSync(filePath, logLines, { flag: 'a' });
      console.log(`📝 Flushed ${events.length} audit events to ${filename}`);
    } catch (error) {
      console.error('❌ Failed to flush audit events:', error);
    }
  }

  // 定期的なフラッシュの設定
  private setupPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 60000); // 1分ごと
  }

  // コンプライアンスレポートの生成
  public generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): ComplianceReport {
    const reportId = crypto.randomUUID();
    
    // 期間内のイベントを読み込み（実際の実装では効率的な検索が必要）
    const events = this.loadEventsInPeriod(startDate, endDate);
    
    const report: ComplianceReport = {
      reportId,
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalEvents: events.length,
        securityIncidents: events.filter(e => e.severity === 'critical').length,
        dataBreaches: events.filter(e => e.eventType === 'data_access' && e.result === 'blocked').length,
        unauthorizedAccess: events.filter(e => e.eventType === 'authorization' && e.result === 'failure').length,
        complianceViolations: events.filter(e => e.tags.includes('compliance')).length
      },
      details: {
        authenticationEvents: events.filter(e => e.eventType === 'authentication').length,
        dataAccessEvents: events.filter(e => e.eventType === 'data_access').length,
        configurationChanges: events.filter(e => e.eventType === 'configuration_change').length,
        suspiciousActivities: events.filter(e => e.eventType === 'suspicious_activity').length
      },
      recommendations: this.generateRecommendations(events)
    };

    // レポートを保存
    this.saveComplianceReport(report);
    
    return report;
  }

  // 期間内のイベント読み込み（簡易実装）
  private loadEventsInPeriod(startDate: Date, endDate: Date): AuditEvent[] {
    // 実際の実装では効率的なインデックス検索が必要
    return this.eventBuffer.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  // 推奨事項の生成
  private generateRecommendations(events: AuditEvent[]): string[] {
    const recommendations: string[] = [];
    
    const criticalEvents = events.filter(e => e.severity === 'critical').length;
    const failedAuth = events.filter(e => e.eventType === 'authentication' && e.result === 'failure').length;
    const suspiciousActivity = events.filter(e => e.eventType === 'suspicious_activity').length;
    
    if (criticalEvents > 10) {
      recommendations.push('Review and strengthen security controls due to high number of critical events');
    }
    
    if (failedAuth > 50) {
      recommendations.push('Consider implementing stronger authentication mechanisms');
    }
    
    if (suspiciousActivity > 20) {
      recommendations.push('Enhance monitoring and detection capabilities');
    }
    
    return recommendations;
  }

  // コンプライアンスレポートの保存
  private saveComplianceReport(report: ComplianceReport): void {
    const reportsDir = join(this.auditDir, 'compliance-reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `compliance-report-${report.reportId}.json`;
    const filePath = join(reportsDir, filename);
    
    try {
      writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log(`📊 Compliance report saved: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to save compliance report:', error);
    }
  }

  // メトリクスの取得
  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  // ルールの追加
  public addRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
    console.log(`📋 Added security rule: ${rule.name}`);
  }

  // ルールの削除
  public removeRule(ruleId: string): void {
    if (this.rules.delete(ruleId)) {
      console.log(`🗑️ Removed security rule: ${ruleId}`);
    }
  }

  // クリーンアップ
  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
    console.log('🧹 Security audit cleanup completed');
  }
}

// グローバル監査システム
let globalSecurityAudit: SecurityAudit;

export function initializeSecurityAudit(auditDir?: string): SecurityAudit {
  globalSecurityAudit = new SecurityAudit(auditDir);
  return globalSecurityAudit;
}

export function getSecurityAudit(): SecurityAudit {
  if (!globalSecurityAudit) {
    throw new Error('Security audit not initialized. Call initializeSecurityAudit() first.');
  }
  return globalSecurityAudit;
}

export default SecurityAudit;