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
  const { t } = useTranslation();
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
          
          {/* Server URL display/editing */}
          <div className="connection-error-server">
            <div className="connection-error-server-label">
              <Server className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium text-gray-700">
                {t('connectionError.serverUrl', 'Server')}: 
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
                  title={t('connectionError.editUrl', 'Edit server URL')}
                >
                  {t('connectionError.change', 'Change')}
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
                    title={t('buttons.save', 'Save')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    className="connection-error-url-button connection-error-url-button--cancel"
                    onClick={handleCancelEditing}
                    title={t('buttons.cancel', 'Cancel')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {!isValidUrl && editedUrl.trim() !== '' && (
                  <div className="connection-error-url-error">
                    {t('serverUrl.invalidUrl', 'Please enter a valid URL (http:// or https://)')}
                  </div>
                )}
              </div>
            )}
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
          
        </div>

        {/* Help text */}
        <div className="connection-error-help">
          <p className="text-xs text-gray-500">
            {isEditingUrl 
              ? t('connectionError.editHelpText', 'Enter to save, Esc to cancel editing.')
              : t('connectionError.helpText', 'Press Esc to work offline temporarily. Changes will not be synchronized until reconnected.')
            }
          </p>
        </div>
      </div>
    </div>
  );
};