import React, { useState } from 'react';
import { SettingsFileError } from '../types/settings';
import { useTranslation } from 'react-i18next';
import { TomlAutoFixer } from '../utils/tomlAutoFixer';
import { AutoFixConfirmDialog } from './AutoFixConfirmDialog';
import logger from '../utils/logger';

interface SettingsErrorBannerProps {
  errors: SettingsFileError[];
  onDismiss: (type: 'settings' | 'keybindings') => void;
  onOpenFile: (filePath: string) => Promise<void>;
  onAutoFix?: (error: SettingsFileError) => Promise<boolean>;
}

export const SettingsErrorBanner: React.FC<SettingsErrorBannerProps> = ({
  errors,
  onDismiss,
  onOpenFile,
  onAutoFix
}) => {
  const { t } = useTranslation();
  const [autoFixError, setAutoFixError] = useState<SettingsFileError | null>(null);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

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

  const handleAutoFixClick = (error: SettingsFileError) => {
    if (!TomlAutoFixer.canAutoFix(error)) {
      logger.warn('Error cannot be auto-fixed:', error.code);
      return;
    }
    setAutoFixError(error);
  };

  const handleAutoFixConfirm = async () => {
    if (!autoFixError || !onAutoFix) {
      return;
    }

    setIsAutoFixing(true);
    try {
      const success = await onAutoFix(autoFixError);
      if (success) {
        logger.info('Auto-fix completed successfully');
        // Clear the error from the list since it should be fixed
        onDismiss(autoFixError.type);
      } else {
        logger.warn('Auto-fix failed or made no changes');
      }
    } catch (error) {
      logger.error('Auto-fix process failed:', error);
    } finally {
      setIsAutoFixing(false);
      setAutoFixError(null);
    }
  };

  const handleAutoFixCancel = () => {
    setAutoFixError(null);
  };

  return (
    <div className="settings-error-banner">
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
              {(error.canAutoFix && TomlAutoFixer.canAutoFix(error) && onAutoFix) && (
                <button 
                  className="error-action-button auto-fix"
                  onClick={() => handleAutoFixClick(error)}
                  disabled={isAutoFixing}
                >
                  {isAutoFixing ? t('errors.autoFixing', 'Fixing...') : t('errors.autoFix', 'Auto Fix')}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Auto Fix Confirmation Dialog */}
      {autoFixError && (
        <AutoFixConfirmDialog
          isOpen={!!autoFixError}
          error={autoFixError}
          onConfirm={handleAutoFixConfirm}
          onCancel={handleAutoFixCancel}
        />
      )}
    </div>
  );
};