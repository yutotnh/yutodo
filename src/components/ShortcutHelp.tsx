import React, { useEffect, useRef, useState } from 'react';
import { X, Keyboard, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAllShortcutsForDisplay, getModifierKey } from '../utils/keyboardShortcuts';
import { useWindowDrag } from '../hooks/useWindowDrag';
import logger from '../utils/logger';

interface ShortcutHelpProps {
  onClose: () => void;
  shortcuts?: Array<{ key: string; description: string; command?: string; when?: string }>;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose, shortcuts: propShortcuts }) => {
  const { t } = useTranslation();
  const shortcutPanelRef = useRef<HTMLDivElement>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  // Window drag functionality
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();
  
  // Escキーでヘルプを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // ヘルプパネル外側クリック検知（タイトルバー除く）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shortcutPanelRef.current && !shortcutPanelRef.current.contains(event.target as Node)) {
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
  }, [onClose]);
  
  // Use provided shortcuts or fall back to default
  let shortcuts = propShortcuts;
  
  if (!shortcuts) {
    // 中央集権的なショートカット定義から動的に取得
    const displayShortcuts = getAllShortcutsForDisplay();
    const modifierKey = getModifierKey();
    
    // 追加の非キーボードショートカット（マウス操作など）
    const additionalShortcuts = [
      { key: `${modifierKey} + Click`, description: t('shortcuts.multipleSelection') },
      { key: 'Shift + Click', description: t('shortcuts.rangeSelection') }
    ];
    
    // ショートカット情報をマージ
    shortcuts = [
      ...displayShortcuts.map(shortcut => ({
        key: shortcut.displayKey,
        description: t(`shortcuts.${shortcut.id}`, { defaultValue: shortcut.description })
      })),
      ...additionalShortcuts
    ];
  }
  
  // Filter out shortcuts that should not be shown in help
  const visibleShortcuts = shortcuts.filter(s => {
    // Don't show Enter or confirmEdit in the help
    return s.command !== 'confirmEdit' && s.key !== 'Enter';
  });
  
  // Copy shortcuts to clipboard
  const copyToClipboard = async () => {
    try {
      const shortcutText = visibleShortcuts
        .map(shortcut => `${shortcut.key}: ${shortcut.description}`)
        .join('\n');
      
      // Try Tauri clipboard first, then fallback to navigator clipboard
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(shortcutText);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shortcutText);
      } else {
        throw new Error('Clipboard API not available');
      }
      
      // Show success message
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
      
      logger.info('Shortcuts copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy shortcuts to clipboard:', error);
      // You could add error notification here if needed
    }
  };
  return (
    <div className="settings-overlay">
      <div className="settings-panel" ref={shortcutPanelRef} data-testid="shortcut-help">
        <div className="settings-header" onMouseDown={handleHeaderDrag}>
          <h2>
            <Keyboard size={20} />
            {t('shortcuts.title')}
          </h2>
          <div className="header-actions">
            <button 
              onClick={copyToClipboard}
              className="copy-button"
              title={t('shortcuts.copyToClipboard')}
            >
              <Copy size={16} />
            </button>
            <button onClick={onClose} className="settings-close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="settings-content">
          {showCopySuccess && (
            <div className="copy-success-message">
              {t('shortcuts.copiedToClipboard')}
            </div>
          )}
          <div className="shortcut-list">
            {visibleShortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <kbd className="shortcut-key">{shortcut.key}</kbd>
                <span 
                  className="shortcut-description"
                  data-testid={shortcut.command ? `shortcut-${shortcut.command}` : undefined}
                >
                  {shortcut.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};