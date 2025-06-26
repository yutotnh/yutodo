import React, { useState, useEffect } from 'react';
import { WifiOff, Loader2, AlertTriangle, RefreshCw, Settings, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConnectionErrorOverlayProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  onRetry: () => void;
  onOpenSettings: () => void;
  serverUrl: string;
}

export const ConnectionErrorOverlay: React.FC<ConnectionErrorOverlayProps> = ({
  connectionStatus,
  reconnectAttempts,
  onRetry,
  onOpenSettings,
  serverUrl
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [timeUntilNextRetry, setTimeUntilNextRetry] = useState(0);

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

  // ESCキーで一時的に閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // 接続済みの場合は何も表示しない
  if (connectionStatus === 'connected' || !isVisible) {
    return null;
  }

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-16 h-16 animate-spin text-blue-500" />,
          title: reconnectAttempts > 0 
            ? t('connectionError.reconnecting', 'Reconnecting to server...') 
            : t('connectionError.connecting', 'Connecting to server...'),
          description: reconnectAttempts > 0 
            ? t('connectionError.attemptCount', 'Attempt {{count}} of 5', { count: reconnectAttempts })
            : t('connectionError.initialConnection', 'Establishing connection'),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          showRetry: false
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-red-500" />,
          title: t('connectionError.failed', 'Connection Failed'),
          description: t('connectionError.failedDescription', 'Unable to connect to the server. Please check your network connection and server settings.'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          showRetry: true
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-16 h-16 text-gray-500" />,
          title: t('connectionError.disconnected', 'Server Disconnected'),
          description: t('connectionError.disconnectedDescription', 'Lost connection to the server. Your changes will not be synchronized.'),
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          showRetry: true
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
          title={t('connectionError.closeTemporary', 'Close temporarily (Press Esc)')}
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
          
          {/* Server URL display */}
          <div className="connection-error-server">
            <span className="text-sm text-gray-600">
              {t('connectionError.serverUrl', 'Server')}: 
            </span>
            <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded ml-2">
              {serverUrl}
            </code>
          </div>

          {/* Countdown timer for auto-retry */}
          {connectionStatus === 'connecting' && timeUntilNextRetry > 0 && (
            <div className="connection-error-countdown">
              <span className="text-sm text-blue-600">
                {t('connectionError.nextRetry', 'Next retry in {{seconds}} seconds', { seconds: timeUntilNextRetry })}
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
              {t('connectionError.retryNow', 'Retry Now')}
            </button>
          )}
          
          <button
            className="connection-error-button connection-error-button--secondary"
            onClick={onOpenSettings}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('connectionError.settings', 'Server Settings')}
          </button>
        </div>

        {/* Help text */}
        <div className="connection-error-help">
          <p className="text-xs text-gray-500">
            {t('connectionError.helpText', 'Press Esc to work offline temporarily. Changes will not be synchronized until reconnected.')}
          </p>
        </div>
      </div>
    </div>
  );
};