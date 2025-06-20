import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAllShortcutsForDisplay, getModifierKey } from '../utils/keyboardShortcuts';
import { useWindowDrag } from '../hooks/useWindowDrag';

interface ShortcutHelpProps {
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const shortcutPanelRef = useRef<HTMLDivElement>(null);
  
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
  
  // 中央集権的なショートカット定義から動的に取得
  const displayShortcuts = getAllShortcutsForDisplay();
  const modifierKey = getModifierKey();
  
  // 追加の非キーボードショートカット（マウス操作など）
  const additionalShortcuts = [
    { key: `${modifierKey} + Click`, description: t('shortcuts.multipleSelection') },
    { key: 'Shift + Click', description: t('shortcuts.rangeSelection') }
  ];
  
  // ショートカット情報をマージ
  const shortcuts = [
    ...displayShortcuts.map(shortcut => ({
      key: shortcut.displayKey,
      description: t(`shortcuts.${shortcut.id}`, { defaultValue: shortcut.description })
    })),
    ...additionalShortcuts
  ];
  return (
    <div className="settings-overlay">
      <div className="settings-panel" ref={shortcutPanelRef} data-testid="shortcut-help">
        <div className="settings-header" onMouseDown={handleHeaderDrag}>
          <h2>
            <Keyboard size={20} />
            {t('shortcuts.title')}
          </h2>
          <button onClick={onClose} className="settings-close">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <div className="shortcut-list">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <kbd className="shortcut-key">{shortcut.key}</kbd>
                <span 
                  className="shortcut-description"
                  data-testid={index < displayShortcuts.length ? `shortcut-${displayShortcuts[index].id}` : undefined}
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