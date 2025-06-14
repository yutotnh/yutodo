import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutHelpProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 'Ctrl/Cmd + N', description: '新しいタスクを追加' },
  { key: 'Ctrl/Cmd + ,', description: '設定を開く' },
  { key: 'Ctrl/Cmd + F', description: '検索' },
  { key: 'Ctrl/Cmd + A', description: '全選択' },
  { key: 'Ctrl/Cmd + ?', description: 'ショートカットヘルプを表示' },
  { key: 'Delete', description: '選択されたタスクを削除' },
  { key: 'Escape', description: 'フォーカスを外す' },
  { key: 'Enter', description: 'タスクを追加/保存' },
  { key: 'Space', description: 'タスクを完了/未完了に切り替え' },
  { key: 'e', description: 'タスクを編集' },
  { key: 'Ctrl/Cmd + Click', description: '複数選択' }
];

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ onClose }) => {
  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>
            <Keyboard size={20} />
            キーボードショートカット
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