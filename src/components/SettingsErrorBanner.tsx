import React from 'react';
import { SettingsFileError } from '../types/settings';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

interface SettingsErrorBannerProps {
  errors: SettingsFileError[];
  onDismiss: (type: 'settings' | 'keybindings') => void;
  onOpenFile: (filePath: string) => Promise<void>;
}

export const SettingsErrorBanner: React.FC<SettingsErrorBannerProps> = ({
  errors,
  onDismiss,
  onOpenFile
}) => {
  const { t } = useTranslation();


  if (errors.length === 0) {
    return null;
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      await onOpenFile(filePath);
    } catch (error) {
      logger.error('Failed to open file:', error);
    }
  };

  return (
    <div className="settings-error-banner" style={{ 
      position: 'fixed', 
      top: '44px', 
      left: 0, 
      right: 0, 
      zIndex: 9999
    }}>
      {errors.map((error, index) => (
        <div key={index} className={`error-item error-${error.severity}`}>
          <div className="error-content">
            <div className="error-header">
              <span className="error-icon">⚠️</span>
              <span className="error-title">
                {error.type === 'keybindings' 
                  ? t('errors.keybindingsFileError', 'Keyboard Shortcuts Error')
                  : t('errors.settingsFileError', 'Settings File Error')
                }
              </span>
              <button 
                className="error-dismiss"
                onClick={() => onDismiss(error.type)}
                title={t('errors.dismiss', 'Dismiss')}
              >
                ×
              </button>
            </div>
            
            <div className="error-message">
              {error.userMessage}
            </div>
            
            {error.details && (
              <div className="error-details">
                {error.details.line && (
                  <span className="error-location">
                    {t('errors.line', 'Line')} {error.details.line}
                    {error.details.column && `:${error.details.column}`}
                  </span>
                )}
                {error.details.problemText && (
                  <span className="error-problem">
                    {t('errors.problem', 'Problem')}: {error.details.problemText}
                  </span>
                )}
                {error.details.expectedFormat && (
                  <div className="error-suggestion">
                    <strong>{t('errors.suggestion', 'Suggestion')}:</strong> {error.details.expectedFormat}
                  </div>
                )}
              </div>
            )}
            
            <div className="error-actions">
              <button 
                className="error-action-button"
                onClick={() => handleOpenFile(error.filePath)}
              >
                {t('errors.openFile', 'Open File')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};