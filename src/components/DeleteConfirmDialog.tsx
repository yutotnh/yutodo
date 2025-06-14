import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
      <div className="delete-confirm-dialog">
        <div className="delete-confirm-header">
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
              {itemCount}個のタスクが削除されます。
            </p>
          )}
          <p className="delete-confirm-warning">
            この操作は取り消すことができません。
          </p>
        </div>
        
        <div className="delete-confirm-actions">
          <button onClick={onClose} className="btn btn--secondary">
            キャンセル
          </button>
          <button 
            onClick={handleConfirm} 
            className="btn btn--danger"
            autoFocus
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
};