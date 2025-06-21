import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWindowDrag } from '../hooks/useWindowDrag';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemCount?: number;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemCount = 1
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Window drag functionality
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();
  
  // 外側クリック検知（タイトルバー除く）
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        // アプリヘッダー領域（28px + padding = 44px）をクリックした場合はモーダルを閉じない
        if (event.clientY <= 44) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="delete-confirm-overlay" onKeyDown={handleKeyDown}>
      <div className="delete-confirm-dialog" ref={dialogRef}>
        <div className="delete-confirm-header" onMouseDown={handleHeaderDrag}>
          <div className="delete-confirm-icon">
            <AlertTriangle size={24} />
          </div>
          <h3>{title}</h3>
          <button onClick={onClose} className="delete-confirm-close">
            <X size={20} />
          </button>
        </div>
        
        <div className="delete-confirm-content">
          <p>{message}</p>
          {itemCount > 1 && (
            <p className="delete-confirm-count">
              {t('tasks.tasksWillBeDeleted', { count: itemCount })}
            </p>
          )}
          <p className="delete-confirm-warning">
            {t('tasks.actionCannotBeUndone')}
          </p>
        </div>
        
        <div className="delete-confirm-actions">
          <button onClick={onClose} className="btn btn--secondary">
            {t('buttons.cancel')}
          </button>
          <button 
            onClick={handleConfirm} 
            className="btn btn--danger"
            data-testid="confirm-delete"
            autoFocus
          >
            {t('buttons.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};