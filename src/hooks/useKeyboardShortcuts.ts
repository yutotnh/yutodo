import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onNewTask: () => void;
  onToggleSettings: () => void;
  onFocusSearch: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onShowHelp: () => void;
}

export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl/Cmd + N: 新しいタスクを追加
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      handlers.onNewTask();
    }
    
    // Ctrl/Cmd + ,: 設定を開く
    if ((event.ctrlKey || event.metaKey) && event.key === ',') {
      event.preventDefault();
      handlers.onToggleSettings();
    }
    
    // Ctrl/Cmd + F: 検索フォーカス
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      handlers.onFocusSearch();
    }
    
    // Ctrl/Cmd + /: ヘルプを表示
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      handlers.onShowHelp();
    }
    
    // Ctrl/Cmd + A: 全選択（タスクリストがフォーカスされている場合のみ）
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.closest('.todo-list')) {
        event.preventDefault();
        handlers.onSelectAll();
      }
    }
    
    // Delete/Backspace: 選択されたタスクを削除
    if ((event.key === 'Delete' || event.key === 'Backspace')) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.closest('.todo-list') && !activeElement.closest('input, textarea')) {
        event.preventDefault();
        handlers.onDeleteSelected();
      }
    }
    
    // Escape: フォーカスを外す、編集モードを終了
    if (event.key === 'Escape') {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        activeElement.blur();
      }
    }
  }, [handlers]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // ショートカットヘルプ情報を返す
  const shortcuts = [
    { key: 'Ctrl/Cmd + N', description: '新しいタスクを追加' },
    { key: 'Ctrl/Cmd + ,', description: '設定を開く' },
    { key: 'Ctrl/Cmd + F', description: '検索' },
    { key: 'Ctrl/Cmd + A', description: '全選択' },
    { key: 'Delete', description: '選択されたタスクを削除' },
    { key: 'Escape', description: 'フォーカスを外す' },
    { key: 'Enter', description: 'タスクを追加/保存' },
    { key: 'Space', description: 'タスクを完了/未完了に切り替え' }
  ];

  return { shortcuts };
};