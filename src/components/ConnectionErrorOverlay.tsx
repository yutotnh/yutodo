import React, { useState, useEffect } from 'react';
import { WifiOff, Loader2, AlertTriangle, RefreshCw, Server, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConnectionErrorOverlayProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  onRetry: () => void;
  onUpdateServerUrl: (newUrl: string) => void;
  serverUrl: string;
}

export const ConnectionErrorOverlay: React.FC<ConnectionErrorOverlayProps> = ({
  connectionStatus,
  reconnectAttempts,
  onRetry,
  onUpdateServerUrl,
  serverUrl
}) => {
  const { t, i18n } = useTranslation();
  
  // 強制的な日本語翻訳フォールバック
  const tFallback = (key: string, fallback: string = key, options?: any) => {
    // 日本語設定の場合は直接日本語翻訳を適用
    if (i18n.language === 'ja') {
      const jaTranslations: Record<string, string> = {
        'connectionError.failed': '接続に失敗しました',
        'connectionError.connecting': 'サーバーに接続中...',
        'connectionError.reconnecting': 'サーバーに再接続中...',
        'connectionError.disconnected': 'サーバーとの接続が切れました',
        'connectionError.initialConnection': '接続を確立中',
        'connectionError.failedDescription': 'サーバーに接続できません。ネットワーク接続とサーバー設定を確認してください。',
        'connectionError.disconnectedDescription': 'サーバーとの接続が失われました。変更内容は同期されません。',
        'connectionError.maxAttemptsReached': '最大再試行回数に到達しました',
        'connectionError.maxAttemptsDescription': '自動再試行がすべて完了しました。手動で再試行するか、接続を確認してください。',
        'connectionError.finalAttempt': '最後の試行',
        'connectionError.serverUrl': 'サーバー',
        'connectionError.retryNow': '今すぐ再試行',
        'connectionError.change': '変更',
        'connectionError.editUrl': 'サーバーURLを編集',
        'connectionError.closeTemporary': '一時的に閉じる（Escキー）',
        'connectionError.helpText': 'Escキーを押すと一時的にオフラインで作業できます。再接続するまで変更内容は同期されません。',
        'connectionError.editHelpText': 'Enterで保存、Escで編集をキャンセルします。',
        'connectionError.willRetryUpTo': '最大{{count}}回まで再試行します',
        'connectionError.attemptsRemaining': 'あと{{count}}回',
        'connectionError.attemptCount': '{{count}}/5回目',
        'connectionError.nextRetry': '{{seconds}}秒後に再試行します',
        'connectionError.progressLabel': '{{count}}/5回試行',
        'connectionError.progressLabelCompleted': '{{count}}/5回試行完了',
        'connectionError.attemptTitle': '{{number}}回目の試行',
        'connectionError.attemptTitleFailed': '{{number}}回目の試行（失敗）',
        'connectionError.attemptTitleCompleted': '{{number}}回目の試行（完了）',
        'buttons.save': '保存',
        'buttons.cancel': 'キャンセル',
        'serverUrl.invalidUrl': '有効なURL（http://またはhttps://）を入力してください'
      };
      
      let translation = jaTranslations[key];
      if (translation && options) {
        // 簡単な置換処理
        Object.keys(options).forEach(optKey => {
          translation = translation.replace(`{{${optKey}}}`, options[optKey]);
        });
        return translation;
      }
      
      if (translation) {
        return translation;
      }
    }
    
    // 通常のi18nextによる翻訳にフォールバック
    const result = t(key, fallback, options);
    return result;
  };
  
  const [isVisible, setIsVisible] = useState(true);
  const [timeUntilNextRetry, setTimeUntilNextRetry] = useState(0);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState(serverUrl);
  const [isValidUrl, setIsValidUrl] = useState(true);

  // 接続成功時はオーバーレイを非表示
  useEffect(() => {
    if (connectionStatus === 'connected') {
      setIsVisible(false);
    } else if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      setIsVisible(true);
    }
  }, [connectionStatus]);

  // 次回リトライまでのカウントダウン
  useEffect(() => {
    if (connectionStatus === 'connecting' && reconnectAttempts > 0) {
      // Socket.IOの再接続間隔に基づく（1秒、2秒、4秒、5秒...）
      const delays = [1000, 2000, 4000, 5000, 5000];
      const delay = delays[Math.min(reconnectAttempts - 1, delays.length - 1)] || 5000;
      
      setTimeUntilNextRetry(Math.floor(delay / 1000));
      
      const interval = setInterval(() => {
        setTimeUntilNextRetry(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [connectionStatus, reconnectAttempts]);

  // Reset edited URL when server URL changes
  useEffect(() => {
    setEditedUrl(serverUrl);
  }, [serverUrl]);

  // ESCキーでURL編集をキャンセルまたは一時的に閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        if (isEditingUrl) {
          // URL編集中ならキャンセル
          setIsEditingUrl(false);
          setEditedUrl(serverUrl);
          setIsValidUrl(true);
        } else {
          // 編集中でなければオーバーレイを閉じる
          setIsVisible(false);
        }
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isEditingUrl, serverUrl]);

  // Validate URL
  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setEditedUrl(newUrl);
    setIsValidUrl(newUrl.trim() === '' || validateUrl(newUrl.trim()));
  };

  const handleStartEditing = () => {
    setIsEditingUrl(true);
    setEditedUrl(serverUrl);
    setIsValidUrl(true);
  };

  const handleCancelEditing = () => {
    setIsEditingUrl(false);
    setEditedUrl(serverUrl);
    setIsValidUrl(true);
  };

  const handleSaveUrl = () => {
    const trimmedUrl = editedUrl.trim();
    if (trimmedUrl && validateUrl(trimmedUrl) && trimmedUrl !== serverUrl) {
      onUpdateServerUrl(trimmedUrl);
    }
    setIsEditingUrl(false);
  };

  const handleUrlInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isValidUrl && editedUrl.trim() !== '') {
        handleSaveUrl();
      }
    }
  };

  // 接続済みの場合は何も表示しない
  if (connectionStatus === 'connected' || !isVisible) {
    return null;
  }

  const getStatusInfo = () => {
    const maxAttempts = 5;
    const attemptsRemaining = Math.max(0, maxAttempts - reconnectAttempts);
    const hasReachedMaxAttempts = reconnectAttempts >= maxAttempts;
    const isFinalAttempt = reconnectAttempts === maxAttempts - 1;
    

    switch (connectionStatus) {
      case 'connecting':
        if (hasReachedMaxAttempts) {
          return {
            icon: <AlertTriangle className="w-16 h-16 text-orange-500" />,
            title: tFallback('connectionError.maxAttemptsReached', 'Maximum retry attempts reached'),
            description: tFallback('connectionError.maxAttemptsDescription', 'All automatic retry attempts have been exhausted. You can manually retry or check your connection.'),
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            showRetry: true,
            attemptsInfo: null
          };
        }
        
        return {
          icon: <Loader2 className="w-16 h-16 animate-spin text-blue-500" />,
          title: reconnectAttempts > 0 
            ? (isFinalAttempt 
                ? tFallback('connectionError.finalAttempt', 'Final attempt')
                : tFallback('connectionError.reconnecting', 'Reconnecting to server...'))
            : tFallback('connectionError.connecting', 'Connecting to server...'),
          description: reconnectAttempts > 0 
            ? tFallback('connectionError.attemptCount', 'Attempt {{count}} of 5', { count: reconnectAttempts })
            : tFallback('connectionError.initialConnection', 'Establishing connection'),
          bgColor: isFinalAttempt ? 'bg-yellow-50' : 'bg-blue-50',
          borderColor: isFinalAttempt ? 'border-yellow-200' : 'border-blue-200',
          showRetry: false,
          attemptsInfo: reconnectAttempts > 0 && !hasReachedMaxAttempts
            ? { remaining: attemptsRemaining, isFinal: isFinalAttempt }
            : null
        };
      case 'error':
        if (hasReachedMaxAttempts) {
          return {
            icon: <AlertTriangle className="w-16 h-16 text-red-500" />,
            title: tFallback('connectionError.maxAttemptsReached', 'Maximum retry attempts reached'),
            description: tFallback('connectionError.maxAttemptsDescription', 'All automatic retry attempts have been exhausted. You can manually retry or check your connection.'),
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            showRetry: true,
            attemptsInfo: null
          };
        }
        
        return {
          icon: <AlertTriangle className="w-16 h-16 text-red-500" />,
          title: tFallback('connectionError.failed', 'Connection Failed'),
          description: tFallback('connectionError.failedDescription', 'Unable to connect to the server. Please check your network connection and server settings.'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          showRetry: true,
          attemptsInfo: reconnectAttempts > 0 
            ? { remaining: attemptsRemaining, isFinal: isFinalAttempt }
            : null
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-16 h-16 text-gray-500" />,
          title: tFallback('connectionError.disconnected', 'Server Disconnected'),
          description: tFallback('connectionError.disconnectedDescription', 'Lost connection to the server. Your changes will not be synchronized.'),
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          showRetry: true,
          attemptsInfo: null
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="connection-error-overlay">
      <div className="connection-error-backdrop" />
      <div className={`connection-error-content ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
        {/* Close button for temporary dismissal */}
        <button
          className="connection-error-close"
          onClick={() => setIsVisible(false)}
          title={tFallback('connectionError.closeTemporary', 'Close temporarily (Press Esc)')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status icon */}
        <div className="connection-error-icon">
          {statusInfo.icon}
        </div>

        {/* Title and description */}
        <div className="connection-error-text">
          <h2 className="connection-error-title">
            {statusInfo.title}
          </h2>
          <p className="connection-error-description">
            {statusInfo.description}
          </p>

          {/* Progress indicator for connection attempts */}
          {(connectionStatus === 'connecting' || connectionStatus === 'error') && (
            <div className="connection-error-progress">
              <div className="connection-error-progress-dots">
                {Array.from({ length: 5 }, (_, index) => {
                  const dotNumber = index + 1;
                  const isActive = dotNumber <= reconnectAttempts;
                  const isCurrent = dotNumber === reconnectAttempts;
                  const isFailed = isActive && connectionStatus === 'error';
                  
                  return (
                    <div
                      key={index}
                      className={`connection-error-progress-dot 
                        ${isActive ? 'connection-error-progress-dot--active' : 'connection-error-progress-dot--inactive'}
                        ${isCurrent ? 'connection-error-progress-dot--current' : ''}
                        ${isFailed ? 'connection-error-progress-dot--failed' : ''}
                      `}
                      title={
                        isActive 
                          ? (isFailed 
                              ? tFallback('connectionError.attemptTitleFailed', 'Attempt {{number}} (failed)', { number: dotNumber })
                              : tFallback('connectionError.attemptTitleCompleted', 'Attempt {{number}} (completed)', { number: dotNumber })
                            )
                          : tFallback('connectionError.attemptTitle', 'Attempt {{number}}', { number: dotNumber })
                      }
                    />
                  );
                })}
              </div>
              <div className="connection-error-progress-label">
                <span className="text-xs text-gray-600">
                  {reconnectAttempts === 0 
                    ? tFallback('connectionError.willRetryUpTo', 'Will retry up to 5 times', { count: 5 })
                    : tFallback('connectionError.progressLabel', '{{count}}/5 attempts', { count: reconnectAttempts })
                  }
                </span>
              </div>
            </div>
          )}

          {/* Remaining attempts info */}
          {statusInfo.attemptsInfo && (
            <div className="connection-error-attempts">
              <div className={`connection-error-attempts-badge ${statusInfo.attemptsInfo.isFinal ? 'connection-error-attempts-badge--final' : 'connection-error-attempts-badge--normal'}`}>
                {statusInfo.attemptsInfo.isFinal 
                  ? tFallback('connectionError.finalAttempt', 'Final attempt')
                  : tFallback('connectionError.attemptsRemaining', '{{count}} attempts remaining', { count: statusInfo.attemptsInfo.remaining })
                }
              </div>
            </div>
          )}

          {/* Server URL display/editing */}
          <div className="connection-error-server">
            <div className="connection-error-server-label">
              <Server className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium text-gray-700">
                {tFallback('connectionError.serverUrl', 'Server')}: 
              </span>
            </div>
            
            {!isEditingUrl ? (
              <div className="connection-error-server-display">
                <code className="connection-error-server-url">
                  {serverUrl}
                </code>
                <button
                  className="connection-error-edit-button"
                  onClick={handleStartEditing}
                  title={tFallback('connectionError.editUrl', 'Edit server URL')}
                >
                  {tFallback('connectionError.change', 'Change')}
                </button>
              </div>
            ) : (
              <div className="connection-error-server-edit">
                <input
                  type="url"
                  value={editedUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={handleUrlInputKeyDown}
                  className={`connection-error-url-input ${!isValidUrl ? 'connection-error-url-input--error' : ''}`}
                  placeholder="http://localhost:3001"
                  autoFocus
                />
                <div className="connection-error-url-actions">
                  <button
                    className="connection-error-url-button connection-error-url-button--save"
                    onClick={handleSaveUrl}
                    disabled={!isValidUrl || editedUrl.trim() === '' || editedUrl.trim() === serverUrl}
                    title={tFallback('buttons.save', 'Save')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    className="connection-error-url-button connection-error-url-button--cancel"
                    onClick={handleCancelEditing}
                    title={tFallback('buttons.cancel', 'Cancel')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {!isValidUrl && editedUrl.trim() !== '' && (
                  <div className="connection-error-url-error">
                    {tFallback('serverUrl.invalidUrl', 'Please enter a valid URL (http:// or https://)')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Countdown timer for auto-retry */}
          {connectionStatus === 'connecting' && timeUntilNextRetry > 0 && (
            <div className="connection-error-countdown">
              <span className="text-sm text-blue-600">
                {tFallback('connectionError.nextRetry', 'Next retry in {{seconds}} seconds', { seconds: timeUntilNextRetry })}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="connection-error-actions">
          {statusInfo.showRetry && (
            <button
              className="connection-error-button connection-error-button--primary"
              onClick={onRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {tFallback('connectionError.retryNow', 'Retry Now')}
            </button>
          )}
          
        </div>

        {/* Help text */}
        <div className="connection-error-help">
          <p className="text-xs text-gray-500">
            {isEditingUrl 
              ? tFallback('connectionError.editHelpText', 'Enter to save, Esc to cancel editing.')
              : tFallback('connectionError.helpText', 'Press Esc to work offline temporarily. Changes will not be synchronized until reconnected.')
            }
          </p>
        </div>
      </div>
    </div>
  );
};