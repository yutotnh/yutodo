import { useEffect, useCallback, useState, useRef } from 'react';
import { getAllShortcutsForDisplay, getModifierKey } from '../utils/keyboardShortcuts';

export interface KeyboardShortcutHandlers {
  onNewTask: () => void;
  onToggleSettings: () => void;
  onFocusSearch: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onShowHelp: () => void;
  onClearSelection: () => void;
  onEditSelected: () => void;
  onToggleSelectedCompletion: () => void;
  onOpenCommandPalette: () => void;
}

interface KeyboardShortcutOptions {
  isModalOpen?: boolean;
}

export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers, options: KeyboardShortcutOptions = {}) => {
  // 連続キーシーケンス状態管理
  const [isWaitingForSecondKey, setIsWaitingForSecondKey] = useState(false);
  const [firstKey, setFirstKey] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // タイムアウトをリセット
  const resetKeySequence = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsWaitingForSecondKey(false);
    setFirstKey(null);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 連続キーシーケンスの処理
    if (isWaitingForSecondKey && firstKey === 'k') {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        // Ctrl+K, Ctrl+S: キーボードショートカットヘルプを表示
        event.preventDefault();
        resetKeySequence();
        handlers.onShowHelp();
        return;
      } else {
        // 期待されたキー以外が押された場合はリセット
        resetKeySequence();
      }
    }

    // Ctrl/Cmd + K: 連続キーシーケンス開始
    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !isWaitingForSecondKey) {
      event.preventDefault();
      setIsWaitingForSecondKey(true);
      setFirstKey('k');
      
      // 2秒後にタイムアウト
      timeoutRef.current = setTimeout(() => {
        resetKeySequence();
      }, 2000);
      return;
    }

    // 他のキーが押された場合、連続キーシーケンスをリセット
    if (isWaitingForSecondKey) {
      resetKeySequence();
    }

    // Ctrl/Cmd + N: 新しいタスクを追加
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      handlers.onNewTask();
    }
    
    // Enter: 何もしない（AddTodoForm以外では処理しない）
    if (event.key === 'Enter') {
      const activeElement = document.activeElement;
      // AddTodoForm以外でEnterが押された場合は何もしない
      if (!activeElement?.closest('.add-todo-form, .add-todo-input, .add-todo-description')) {
        event.preventDefault();
        // 何もしない - AddTodoFormにフォーカスしない
      }
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
    
    // Ctrl/Cmd + Shift + P: コマンドパレットを開く
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      handlers.onOpenCommandPalette();
    }
    
    
    // Ctrl/Cmd + A: 全選択（入力フィールド以外での不要な選択を防ぐ）
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      const activeElement = document.activeElement;
      // 入力系の要素でない場合は、タスクの全選択として処理
      if (!activeElement?.closest('input, textarea, [contenteditable="true"]')) {
        event.preventDefault();
        handlers.onSelectAll();
      }
    }
    
    // Delete/Backspace: 選択されたタスクを削除
    if ((event.key === 'Delete' || event.key === 'Backspace')) {
      const activeElement = document.activeElement;
      // 入力フィールドにフォーカスがない場合のみ削除を実行
      if (!activeElement?.closest('input, textarea, [contenteditable="true"]')) {
        event.preventDefault();
        handlers.onDeleteSelected();
      }
    }
    
    // E/F2: 選択されたタスクを編集
    if ((event.key === 'e' || event.key === 'F2')) {
      const activeElement = document.activeElement;
      // 入力フィールドにフォーカスがない場合のみ編集を実行
      if (!activeElement?.closest('input, textarea, [contenteditable="true"]')) {
        event.preventDefault();
        handlers.onEditSelected();
      }
    }
    
    // Ctrl/Cmd + D: 選択されたタスクの完了状態を切り替え
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      const activeElement = document.activeElement;
      // 入力フィールドにフォーカスがない場合のみ完了状態を切り替え
      if (!activeElement?.closest('input, textarea, [contenteditable="true"]')) {
        event.preventDefault();
        event.stopPropagation();
        handlers.onToggleSelectedCompletion();
      }
    }
    
    // Escape: 選択解除、フォーカスを外す、編集モードを終了（モーダルが開いていない場合のみ）
    if (event.key === 'Escape' && !options.isModalOpen) {
      const activeElement = document.activeElement as HTMLElement;
      
      // まず選択をクリア
      handlers.onClearSelection();
      
      // 次にフォーカスを外す
      if (activeElement) {
        activeElement.blur();
      }
      
      event.preventDefault();
    }
  }, [handlers, isWaitingForSecondKey, firstKey, resetKeySequence, options.isModalOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // クリーンアップ
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // 中央集権的なショートカット定義から動的に取得
  const displayShortcuts = getAllShortcutsForDisplay();
  const modifierKey = getModifierKey();
  
  // 追加の非キーボードショートカット（マウス操作など）
  const additionalShortcuts = [
    { key: `${modifierKey} + Click`, description: '個別選択/解除' },
    { key: 'Shift + Click', description: '範囲選択' },
    { key: 'Double Click', description: 'タスクを編集' }
  ];
  
  // ショートカット情報をマージ（useKeyboardShortcutsでは英語の説明を使用）
  const shortcuts = [
    ...displayShortcuts.map(shortcut => ({
      key: shortcut.displayKey,
      description: shortcut.description
    })),
    ...additionalShortcuts
  ];

  return { shortcuts };
};