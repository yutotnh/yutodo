import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsFileError } from '../types/settings';
import { useWindowDrag } from '../hooks/useWindowDrag';

interface AutoFixConfirmDialogProps {
  isOpen: boolean;
  error: SettingsFileError;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AutoFixConfirmDialog: React.FC<AutoFixConfirmDialogProps> = ({
  isOpen,
  error,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation();
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();

  if (!isOpen) {
    return null;
  }

  const fileName = error.filePath.split('/').pop() || error.filePath;

  return (
    <div className="settings-overlay" style={{ pointerEvents: 'none' }}>
      <div 
        className="auto-fix-confirm-dialog"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="auto-fix-header" onMouseDown={handleHeaderDrag}>
          <div className="auto-fix-icon">🔧</div>
          <h3>{t('autoFix.confirmTitle', 'Confirm Auto Fix')}</h3>
        </div>
        
        <div className="auto-fix-content">
          <p className="auto-fix-description">
            {t('autoFix.description', 'This will automatically fix common syntax errors in your configuration file.')}
          </p>
          
          <div className="auto-fix-details">
            <div className="auto-fix-file">
              <strong>{t('autoFix.file', 'File')}:</strong> {fileName}
            </div>
            <div className="auto-fix-error">
              <strong>{t('autoFix.issue', 'Issue')}:</strong> {error.userMessage}
            </div>
            {error.details?.suggestion && (
              <div className="auto-fix-suggestion">
                <strong>{t('autoFix.fix', 'Fix')}:</strong> {error.details.suggestion}
              </div>
            )}
          </div>
          
          <div className="auto-fix-safety">
            <div className="safety-notice">
              <span className="safety-icon">🛡️</span>
              <span>{t('autoFix.safetyNotice', 'A backup will be created before making changes.')}</span>
            </div>
          </div>
          
          <div className="auto-fix-actions">
            <button className="auto-fix-cancel" onClick={onCancel}>
              {t('autoFix.cancel', 'Cancel')}
            </button>
            <button className="auto-fix-confirm" onClick={onConfirm}>
              {t('autoFix.confirm', 'Fix Now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};