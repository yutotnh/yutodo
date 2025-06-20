import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShortcutHelpProps {
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const shortcutPanelRef = useRef<HTMLDivElement>(null);
  
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
        // タイトルバー領域（上部30px）をクリックした場合はモーダルを閉じない
        if (event.clientY <= 30) {
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
  
  // OS検知
  const detectOS = () => {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform.toUpperCase();
      if (platform.indexOf('MAC') >= 0 || platform.indexOf('IPHONE') >= 0 || platform.indexOf('IPAD') >= 0) {
        return 'mac';
      }
      if (platform.indexOf('WIN') >= 0) {
        return 'windows';
      }
      if (platform.indexOf('LINUX') >= 0) {
        return 'linux';
      }
    }
    // Tauri環境での追加チェック
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mac')) return 'mac';
      if (userAgent.includes('win')) return 'windows';
      if (userAgent.includes('linux')) return 'linux';
    }
    return 'unknown';
  };
  
  const os = detectOS();
  const modifierKey = os === 'mac' ? 'Cmd' : 'Ctrl';
  
  const shortcuts = [
    { key: `${modifierKey} + N`, description: t('shortcuts.addNewTask') },
    { key: `${modifierKey} + Shift + P`, description: t('shortcuts.commandPalette') },
    { key: `${modifierKey} + ,`, description: t('shortcuts.openSettings') },
    { key: `${modifierKey} + F`, description: t('shortcuts.search') },
    { key: `${modifierKey} + A`, description: t('shortcuts.selectAll') },
    { key: `${modifierKey} + K, ${modifierKey} + S`, description: t('shortcuts.showShortcutHelp') },
    { key: 'Delete', description: t('shortcuts.deleteSelectedTasks') },
    { key: 'Escape', description: t('shortcuts.removeFocus') },
    { key: `${modifierKey} + D`, description: t('shortcuts.toggleTaskCompletion') },
    { key: 'E', description: t('shortcuts.editTask') },
    { key: 'F2', description: t('shortcuts.editTask') },
    { key: `${modifierKey} + Click`, description: t('shortcuts.multipleSelection') },
    { key: 'Shift + Click', description: t('shortcuts.rangeSelection') }
  ];
  return (
    <div className="settings-overlay">
      <div className="settings-panel" ref={shortcutPanelRef}>
        <div className="settings-header">
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
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};