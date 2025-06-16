import React, { useState, useEffect, useRef } from 'react';
import { Minus, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TodoItem } from './components/TodoItem';
import { AddTodoForm, AddTodoFormRef } from './components/AddTodoForm';
import { Settings } from './components/Settings';
import { ShortcutHelp } from './components/ShortcutHelp';
import { TodoFilter, FilterType } from './components/TodoFilter';
import { SearchBar } from './components/SearchBar';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { ConnectionStatus } from './components/ConnectionStatus';
import { MenuBar } from './components/MenuBar';
import { useSocket } from './hooks/useSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppSettings, Todo } from './types/todo';
import { configManager } from './utils/configManager';
import './App.css';

const DEFAULT_SETTINGS: AppSettings = {
  alwaysOnTop: false,
  detailedMode: false,
  darkMode: 'auto',
  confirmDelete: true,
  customCss: '',
  serverUrl: 'http://localhost:3001',
  language: 'auto'
};

function App() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeader, setShowHeader] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    todoIds: string[];
    title: string;
    message: string;
  }>({ isOpen: false, todoIds: [], title: '', message: '' });
  const [showConnectionTooltip, setShowConnectionTooltip] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAltKeyActive, setIsAltKeyActive] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const addTodoFormRef = useRef<AddTodoFormRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { todos, connectionStatus, reconnectAttempts, addTodo, updateTodo, deleteTodo, toggleTodo, bulkImport, reorderTodos } = useSocket(settings.serverUrl);

  useEffect(() => {
    const initializeConfig = async () => {
      try {
        console.log('Initializing config manager...');
        
        // 古いlocalStorageキーからのマイグレーション
        const oldSettings = localStorage.getItem('todoAppSettings');
        if (oldSettings && !localStorage.getItem('yutodoAppSettings')) {
          console.log('🔄 Migrating old localStorage data...');
          localStorage.setItem('yutodoAppSettings', oldSettings);
          localStorage.removeItem('todoAppSettings');
        }
        
        // 古いi18n言語設定をクリア（アプリ設定に統一）
        if (localStorage.getItem('yutodo-language')) {
          console.log('🔄 Removing old i18n language setting...');
          localStorage.removeItem('yutodo-language');
        }
        
        await configManager.initialize();
        const appSettings = configManager.getAppSettings();
        console.log('Loaded app settings:', appSettings);
        console.log('🔍 Language setting from config:', appSettings.language);
        
        // 設定を適用
        const finalSettings = { ...DEFAULT_SETTINGS, ...appSettings };
        setSettings(finalSettings);
        
        // 言語設定を明示的に適用
        if (finalSettings.language === 'auto') {
          const browserLang = navigator.language.split('-')[0];
          const supportedLang = ['en', 'ja'].includes(browserLang) ? browserLang : 'en';
          i18n.changeLanguage(supportedLang);
        } else {
          i18n.changeLanguage(finalSettings.language);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize config:', error);
        // フォールバック: localStorage
        console.log('Attempting localStorage fallback...');
        const savedSettings = localStorage.getItem('yutodoAppSettings');
        if (savedSettings) {
          console.log('Found saved settings in localStorage:', savedSettings);
          const parsed = JSON.parse(savedSettings);
          const finalSettings = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(finalSettings);
          
          // 言語設定を明示的に適用
          if (finalSettings.language === 'auto') {
            const browserLang = navigator.language.split('-')[0];
            const supportedLang = ['en', 'ja'].includes(browserLang) ? browserLang : 'en';
            i18n.changeLanguage(supportedLang);
          } else {
            i18n.changeLanguage(finalSettings.language);
          }
          
          setIsInitialized(true);
        } else {
          console.log('No saved settings found in localStorage');
          // デフォルト言語設定を適用
          i18n.changeLanguage('en');
          setIsInitialized(true);
        }
      }
    };

    initializeConfig();
  }, []);

  // 言語設定の変更を適用
  useEffect(() => {
    if (!isInitialized) return;
    
    if (settings.language === 'auto') {
      const browserLang = navigator.language.split('-')[0];
      const supportedLang = ['en', 'ja'].includes(browserLang) ? browserLang : 'en';
      i18n.changeLanguage(supportedLang);
    } else {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n, isInitialized]);

  useEffect(() => {
    // 初期化完了後にのみ保存処理を実行
    if (!isInitialized) return;

    console.log('🔄 Settings changed, saving to both localStorage and config file:', settings);
    console.log('🔍 Language being saved:', settings.language);

    // localStorageに保存
    try {
      localStorage.setItem('yutodoAppSettings', JSON.stringify(settings));
      console.log('✅ Settings saved to localStorage');
      console.log('🔍 Verification - localStorage content:', localStorage.getItem('yutodoAppSettings'));
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
    }

    // 設定ファイルにも保存
    configManager.updateFromAppSettings(settings)
      .then(() => {
        console.log('✅ Settings successfully saved to config file');
      })
      .catch(error => {
        console.error('❌ Failed to update config file:', error);
      });
  }, [settings, isInitialized]);

  // Tauri環境でAlways On Topを適用
  useEffect(() => {
    const applyAlwaysOnTop = async () => {
      if (!isInitialized) return;

      try {
        // Tauri環境でのみ実行
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          console.log('🔝 Applying always on top setting:', settings.alwaysOnTop);
          const appWindow = getCurrentWindow();
          await appWindow.setAlwaysOnTop(settings.alwaysOnTop);
          console.log('✅ Always on top applied successfully');
        }
      } catch (error) {
        console.error('❌ Failed to apply always on top:', error);
      }
    };

    applyAlwaysOnTop();
  }, [settings.alwaysOnTop, isInitialized]);

  useEffect(() => {
    if (settings.customCss) {
      const styleEl = document.getElementById('custom-styles') as HTMLStyleElement;
      if (styleEl) {
        styleEl.textContent = settings.customCss;
      } else {
        const newStyleEl = document.createElement('style');
        newStyleEl.id = 'custom-styles';
        newStyleEl.textContent = settings.customCss;
        document.head.appendChild(newStyleEl);
      }
    }
  }, [settings.customCss]);

  // システムのダークモード設定を監視
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // マウス位置によるヘッダー表示制御（オーバーレイ方式）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 30;
      // メニューが開いている時またはAltキーが押されている時はヘッダーを隠さない
      if (!isMenuOpen && !isAltKeyActive) {
        setShowHeader(e.clientY <= threshold);
      }
    };

    const handleMouseEnter = () => {
      // ウィンドウにマウスが入った時の処理
    };

    const handleMouseLeave = () => {
      // メニューが開いている時またはAltキーが押されている時はヘッダーを隠さない
      if (!isMenuOpen && !isAltKeyActive) {
        setShowHeader(false);
      }
    };

    // Tauri環境での追加対応
    const handleWindowBlur = () => {
      if (!isMenuOpen && !isAltKeyActive) {
        setShowHeader(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isMenuOpen && !isAltKeyActive) {
        setShowHeader(false);
      }
    };

    // bodyレベルでもマウス追跡を追加
    const handleBodyMouseLeave = () => {
      if (!isMenuOpen && !isAltKeyActive) {
        setShowHeader(false);
      }
    };

    // htmlレベルでのマウス追跡
    const handleDocumentMouseLeave = () => {
      if (!isMenuOpen && !isAltKeyActive) {
        setShowHeader(false);
      }
    };

    // ウィンドウレベルでのマウス追跡
    const handleWindowMouseOut = (e: MouseEvent) => {
      // マウスがウィンドウから完全に出た場合
      if (!e.relatedTarget && !isMenuOpen && !isAltKeyActive) {
        setShowHeader(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseleave', handleBodyMouseLeave);
    document.documentElement.addEventListener('mouseleave', handleDocumentMouseLeave);
    window.addEventListener('mouseout', handleWindowMouseOut);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseleave', handleBodyMouseLeave);
      document.documentElement.removeEventListener('mouseleave', handleDocumentMouseLeave);
      window.removeEventListener('mouseout', handleWindowMouseOut);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMenuOpen, isAltKeyActive]);

  // ウィンドウフォーカス状態を監視
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // ウィンドウタイトルを接続状態に応じて更新
  useEffect(() => {

    const updateTitle = async () => {
      try {
        const reconnectText = reconnectAttempts > 0 ? ` (${reconnectAttempts})` : '';
        const newTitle = `YuToDo${reconnectText}`;

        // Tauriの場合
        if ((window as any).__TAURI__) {
          const appWindow = getCurrentWindow();
          await appWindow.setTitle(newTitle);
        } else {
          // ブラウザの場合
          document.title = newTitle;
        }
      } catch (error) {
        console.error('Failed to update window title:', error);
      }
    };

    updateTitle();
  }, [connectionStatus, reconnectAttempts]);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleImportTodos = (importedTodos: Todo[]) => {
    const todosToImport = importedTodos.map(todo => ({
      title: todo.title,
      description: todo.description,
      completed: todo.completed,
      priority: todo.priority,
      scheduledFor: todo.scheduledFor
    }));
    bulkImport(todosToImport);
  };

  // ウィンドウコントロールハンドラ
  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // メニューアクションハンドラー

  const handleToggleSlim = () => {
    handleSettingsChange({ ...settings, detailedMode: !settings.detailedMode });
  };

  const handleToggleAlwaysOnTop = () => {
    handleSettingsChange({ ...settings, alwaysOnTop: !settings.alwaysOnTop });
  };

  const handleShowAbout = () => {
    alert(`YuToDo v0.1.0\n\nA modern, feature-rich todo list application built with Tauri, React, and TypeScript.\n\nFeatures real-time synchronization, keyboard shortcuts, and native desktop integration.`);
  };

  const handleImportTasksFromMenu = async () => {
    try {
      // Tauri環境でのファイルインポート
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const dialog = await import('@tauri-apps/plugin-dialog');
        const fs = await import('@tauri-apps/plugin-fs');
        const TOML = await import('@ltd/j-toml');
        
        const filePath = await dialog.open({
          title: t('dataManager.selectTomlFile'),
          filters: [{
            name: 'TOML Files',
            extensions: ['toml']
          }]
        });
        
        if (filePath && typeof filePath === 'string') {
          const content = await fs.readTextFile(filePath);
          const importedData = TOML.parse(content);
          
          // TOMLデータのバリデーション
          if (importedData && typeof importedData === 'object' && 'tasks' in importedData) {
            const tasks = importedData.tasks as any[];
            
            if (Array.isArray(tasks)) {
              const validTodos = tasks.filter((todo: any) => 
                todo && 
                typeof todo.id === 'string' &&
                typeof todo.title === 'string' &&
                typeof todo.completed === 'boolean' &&
                typeof todo.priority === 'number'
              ).map((todo: any) => ({
                ...todo,
                // TOML形式でのデータマッピング（空文字列をundefinedに変換）
                scheduledFor: (todo.scheduled_for && todo.scheduled_for !== '') ? todo.scheduled_for : 
                             (todo.scheduledFor && todo.scheduledFor !== '') ? todo.scheduledFor : undefined,
                createdAt: todo.created_at || todo.createdAt,
                updatedAt: todo.updated_at || todo.updatedAt,
                description: (todo.description && todo.description !== '') ? todo.description : undefined
              }));
              
              if (validTodos.length > 0) {
                handleImportTodos(validTodos);
                alert(t('dataManager.tasksImported', { count: validTodos.length }));
              } else {
                alert(t('dataManager.noValidTasks'));
              }
            } else {
              alert(t('dataManager.invalidFileFormat'));
            }
          } else {
            alert(t('dataManager.invalidFileFormat'));
          }
        }
      } else {
        // ブラウザ環境ではファイル選択
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.toml';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              const content = await file.text();
              const TOML = await import('@ltd/j-toml');
              const importedData = TOML.parse(content);
              
              // TOMLデータのバリデーション
              if (importedData && typeof importedData === 'object' && 'tasks' in importedData) {
                const tasks = importedData.tasks as any[];
                
                if (Array.isArray(tasks)) {
                  const validTodos = tasks.filter((todo: any) => 
                    todo && 
                    typeof todo.id === 'string' &&
                    typeof todo.title === 'string' &&
                    typeof todo.completed === 'boolean' &&
                    typeof todo.priority === 'number'
                  ).map((todo: any) => ({
                    ...todo,
                    // TOML形式でのデータマッピング（空文字列をundefinedに変換）
                    scheduledFor: (todo.scheduled_for && todo.scheduled_for !== '') ? todo.scheduled_for : 
                                 (todo.scheduledFor && todo.scheduledFor !== '') ? todo.scheduledFor : undefined,
                    createdAt: todo.created_at || todo.createdAt,
                    updatedAt: todo.updated_at || todo.updatedAt,
                    description: (todo.description && todo.description !== '') ? todo.description : undefined
                  }));
                  
                  if (validTodos.length > 0) {
                    handleImportTodos(validTodos);
                    alert(t('dataManager.tasksImported', { count: validTodos.length }));
                  } else {
                    alert(t('dataManager.noValidTasks'));
                  }
                } else {
                  alert(t('dataManager.invalidFileFormat'));
                }
              } else {
                alert(t('dataManager.invalidFileFormat'));
              }
            } catch (error) {
              console.error('Import failed:', error);
              alert(t('dataManager.failedToReadFile'));
            }
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(t('dataManager.failedToReadFile'));
    }
  };

  const handleExportTasksFromMenu = async () => {
    try {
      // TOML形式でのエクスポート
      const TOML = await import('@ltd/j-toml');
      
      // メタデータセクションを生成
      const metadata = {
        exported_at: new Date().toISOString(),
        app_version: "0.1.0",
        format_version: "1.0",
        total_tasks: todos.length
      };

      const metadataToml = TOML.stringify({ metadata }, {
        newline: '\n',
        indent: '  '
      });

      // タスクを[[tasks]]形式で手動生成
      let tasksToml = '';
      todos.forEach(todo => {
        tasksToml += '\n[[tasks]]\n';
        tasksToml += `id = "${todo.id}"\n`;
        tasksToml += `title = "${todo.title.replace(/"/g, '\\"')}"\n`;  // エスケープ処理
        tasksToml += `description = "${(todo.description || "").replace(/"/g, '\\"')}"\n`;
        tasksToml += `completed = ${todo.completed}\n`;
        tasksToml += `priority = ${todo.priority}\n`;
        tasksToml += `scheduled_for = "${todo.scheduledFor || ""}"\n`;
        tasksToml += `created_at = "${todo.createdAt}"\n`;
        tasksToml += `updated_at = "${todo.updatedAt}"\n`;
        tasksToml += `order = ${todo.order || 0}\n`;
      });

      const tomlContent = metadataToml + tasksToml;

      // ヘッダーコメントを追加
      const headerComment = `# YuToDo Tasks Export
# Generated on ${new Date().toLocaleString()}
#
# This file contains all your tasks in TOML format.
# You can re-import this file to restore your tasks.
#
# Format: TOML (Tom's Obvious, Minimal Language)
# Website: https://toml.io/

`;

      const finalContent = headerComment + tomlContent;

      // Tauri環境でのTOMLエクスポート
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const dialog = await import('@tauri-apps/plugin-dialog');
        const fs = await import('@tauri-apps/plugin-fs');
        
        const filename = `yutodo_tasks_${new Date().toISOString().split('T')[0]}.toml`;
        const filePath = await dialog.save({
          title: t('dataManager.export'),
          defaultPath: filename,
          filters: [{
            name: 'TOML Files',
            extensions: ['toml']
          }]
        });
        
        if (filePath) {
          await fs.writeTextFile(filePath, finalContent);
          alert(`${t('dataManager.export')} ${t('buttons.save')}: ${filePath}`);
        }
      } else {
        // ブラウザ環境ではファイルダウンロード
        const blob = new Blob([finalContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yutodo_tasks_${new Date().toISOString().split('T')[0]}.toml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('TOML Export failed:', error);
      alert(t('dataManager.tomlExportFailed', { error: error }));
    }
  };

  // ヘッダードラッグハンドラ
  const handleHeaderMouseDown = async (e: React.MouseEvent) => {
    // ボタンクリックの場合はドラッグしない
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  };

  // キーボードショートカットハンドラ
  const keyboardHandlers = {
    onNewTask: () => {
      // 選択状態をクリアしてからフォーカス（Ctrl+Nのみで実行）
      setSelectedTodos(new Set());
      setLastSelectedIndex(-1);
      addTodoFormRef.current?.focusInput();
    },
    onToggleSettings: () => {
      setShowSettings(prev => !prev);
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onSelectAll: () => {
      setSelectedTodos(new Set(todos.map(todo => todo.id)));
    },
    onDeleteSelected: () => {
      handleBulkDeleteWithConfirm();
    },
    onShowHelp: () => {
      setShowShortcutHelp(true);
    },
    onClearSelection: () => {
      setSelectedTodos(new Set());
      setLastSelectedIndex(-1);
    },
    onEditSelected: () => {
      // 最初に選択されたタスクを編集モードにする
      if (selectedTodos.size === 1) {
        const selectedId = Array.from(selectedTodos)[0];
        const todo = todos.find(t => t.id === selectedId);
        if (todo) {
          // 選択を解除して編集モードに入る
          setSelectedTodos(new Set());
          setLastSelectedIndex(-1);
          
          // AddTodoFormのフォーカスを防ぐため、少し遅延してイベントを発火
          setTimeout(() => {
            const editEvent = new CustomEvent('startEdit', { detail: { todoId: selectedId } });
            document.dispatchEvent(editEvent);
          }, 10);
        }
      }
    },
    onToggleSelectedCompletion: () => {
      // 選択されたタスクの完了状態を一括切り替え
      if (selectedTodos.size > 0) {
        const selectedIds = Array.from(selectedTodos);
        const selectedTodosList = todos.filter(todo => selectedIds.includes(todo.id));
        
        // すべて完了している場合は未完了に、それ以外は完了にする
        const allCompleted = selectedTodosList.every(todo => todo.completed);
        const newCompletedState = !allCompleted;
        
        selectedTodosList.forEach(todo => {
          if (todo.completed !== newCompletedState) {
            toggleTodo(todo.id);
          }
        });
      }
    }
  };

  useKeyboardShortcuts(keyboardHandlers, { isModalOpen: showSettings || showShortcutHelp || deleteConfirm.isOpen });

  // Altキーの状態を監視してヘッダー表示を制御
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAltKeyActive(true);
        setShowHeader(true); // Altキーが押されたらヘッダーを表示
      }
    };

    const handleGlobalKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAltKeyActive(false);
        // Altキーが離されたときの処理（メニューが開いていない場合はヘッダーを隠す）
        if (!isMenuOpen) {
          // 少し遅延してからヘッダーを隠す（メニュー操作の時間を確保）
          setTimeout(() => {
            if (!isMenuOpen) {
              setShowHeader(false);
            }
          }, 500);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keyup', handleGlobalKeyUp);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [isMenuOpen]);


  // 実際のダークモード状態を計算
  const isDarkMode = settings.darkMode === 'dark' ||
    (settings.darkMode === 'auto' && systemPrefersDark);

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return t('connection.connected');
      case 'connecting':
        return reconnectAttempts > 0 ? t('connection.reconnecting', { attempt: reconnectAttempts }) : t('connection.connecting');
      case 'disconnected':
        return t('connection.disconnected');
      case 'error':
        return t('connection.error');
      default:
        return t('connection.unknown');
    }
  };

  const getConnectionStatusBgColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#10b981'; // green-500
      case 'connecting':
        return '#3b82f6'; // blue-500
      case 'disconnected':
        return '#6b7280'; // gray-500
      case 'error':
        return '#ef4444'; // red-500
      default:
        return '#9ca3af'; // gray-400
    }
  };


  // 削除ハンドラー（設定に応じて確認ダイアログを表示）
  const handleDeleteWithConfirm = (todoId: string) => {
    if (settings.confirmDelete) {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;

      setDeleteConfirm({
        isOpen: true,
        todoIds: [todoId],
        title: t('tasks.deleteTask'),
        message: t('tasks.deleteTaskConfirm', { title: todo.title })
      });
    } else {
      // 確認なしで即座に削除
      deleteTodo(todoId);
    }
  };

  const handleBulkDeleteWithConfirm = () => {
    if (selectedTodos.size === 0) return;

    if (settings.confirmDelete) {
      setDeleteConfirm({
        isOpen: true,
        todoIds: Array.from(selectedTodos),
        title: t('tasks.deleteSelectedTasks'),
        message: t('tasks.deleteSelectedConfirm')
      });
    } else {
      // 確認なしで即座に削除
      selectedTodos.forEach(todoId => {
        deleteTodo(todoId);
      });
      setSelectedTodos(new Set());
    }
  };

  const confirmDelete = () => {
    deleteConfirm.todoIds.forEach(todoId => {
      deleteTodo(todoId);
    });
    setSelectedTodos(new Set());
  };


  // ドラッグ&ドロップセンサー（パフォーマンス最適化）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動でドラッグ開始（より軽くするため小さめ）
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ&ドロップハンドラー
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // ドラッグされたタスクがどのセクション（未完了または完了済み）にあるかを判定
      const draggedTodo = [...pendingTodos, ...completedTodos].find(todo => todo.id === active.id);
      const targetTodo = [...pendingTodos, ...completedTodos].find(todo => todo.id === over.id);
      
      if (!draggedTodo || !targetTodo) return;

      // 同じ完了状態のタスク同士でのみ並び替えを許可
      if (draggedTodo.completed !== targetTodo.completed) return;

      const sourceList = draggedTodo.completed ? completedTodos : pendingTodos;
      const oldIndex = sourceList.findIndex(todo => todo.id === active.id);
      const newIndex = sourceList.findIndex(todo => todo.id === over.id);

      const reorderedList = arrayMove(sourceList, oldIndex, newIndex);

      // 新しいorderを計算して送信（各セクション内で0からの連番）
      const reorderData = reorderedList.map((todo, index) => ({
        id: todo.id,
        order: index
      }));

      reorderTodos(reorderData);
    }
  };

  // フィルタリングと検索ロジック
  const filteredTodos = todos.filter(todo => {
    const now = new Date();
    const isOverdue = todo.scheduledFor && new Date(todo.scheduledFor) < now && !todo.completed;

    // 検索クエリでフィルタリング
    const matchesSearch = searchQuery === '' ||
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.description && todo.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // フィルターでフィルタリング
    switch (currentFilter) {
      case 'completed':
        return todo.completed;
      case 'pending':
        return !todo.completed;
      case 'overdue':
        return isOverdue;
      case 'high':
        return todo.priority === 2;
      case 'medium':
        return todo.priority === 1;
      case 'low':
        return todo.priority === 0;
      default:
        return true;
    }
  });

  // フィルターのカウント計算
  const filterCounts = {
    all: todos.length,
    completed: todos.filter(todo => todo.completed).length,
    pending: todos.filter(todo => !todo.completed).length,
    overdue: todos.filter(todo => {
      const now = new Date();
      return todo.scheduledFor && new Date(todo.scheduledFor) < now && !todo.completed;
    }).length,
    high: todos.filter(todo => todo.priority === 2).length,
    medium: todos.filter(todo => todo.priority === 1).length,
    low: todos.filter(todo => todo.priority === 0).length
  };

  // 未完了と完了済みタスクを分離
  const pendingTodos = filteredTodos.filter(todo => !todo.completed).sort((a, b) => {
    // カスタムorderがある場合はそれを優先
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    if (a.scheduledFor && b.scheduledFor) {
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    }

    if (a.scheduledFor && !b.scheduledFor) return -1;
    if (!a.scheduledFor && b.scheduledFor) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const completedTodos = filteredTodos.filter(todo => todo.completed).sort((a, b) => {
    // カスタムorderがある場合はそれを優先
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }

    // デフォルトは更新日時の新しい順
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });


  return (
    <div className={`app ${!settings.detailedMode ? 'app--slim' : ''} ${isDarkMode ? 'app--dark' : ''}`}>
      <header className={`app-header ${showHeader ? 'app-header--visible' : 'app-header--hidden'}`} onMouseDown={handleHeaderMouseDown}>
        <div className="header-left">
          <MenuBar
            settings={settings}
            onNewTask={keyboardHandlers.onNewTask}
            onSelectAll={keyboardHandlers.onSelectAll}
            onDeleteSelected={keyboardHandlers.onDeleteSelected}
            onShowSettings={() => setShowSettings(true)}
            onToggleSlim={handleToggleSlim}
            onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
            onShowShortcuts={() => setShowShortcutHelp(true)}
            onShowAbout={handleShowAbout}
            onImportTasks={handleImportTasksFromMenu}
            onExportTasks={handleExportTasksFromMenu}
            onMenuStateChange={setIsMenuOpen}
            isAltKeyActive={isAltKeyActive}
          />
        </div>
        <div className="header-center">
          {settings.detailedMode && (
            <ConnectionStatus
              connectionStatus={connectionStatus}
              reconnectAttempts={reconnectAttempts}
              isSlimMode={false}
            />
          )}
        </div>
        <div className="header-right">
          <button
            onClick={handleMinimize}
            className="window-control minimize-btn"
            title={t('app.minimize')}
          >
            <Minus size={12} />
          </button>
          <button
            onClick={handleClose}
            className="window-control close-btn"
            title={t('app.close')}
          >
            <X size={12} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {isWindowFocused && settings.detailedMode && (
          <>
            <SearchBar
              ref={searchInputRef}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <TodoFilter
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              counts={filterCounts}
            />
          </>
        )}

        {/* 選択カウンター */}
        {selectedTodos.size > 1 && (
          <div className="selection-counter">
            <span className="selection-counter__text">
              {t('tasks.selectedItems', { count: selectedTodos.size })}
            </span>
            <button 
              onClick={() => {
                setSelectedTodos(new Set());
                setLastSelectedIndex(-1);
              }}
              className="selection-counter__clear"
              title={t('tasks.clearSelection')}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          autoScroll={false} // 自動スクロール無効化でパフォーマンス向上
        >
          <div className="todo-list">
            {pendingTodos.length === 0 && completedTodos.length === 0 ? (
              <div className="empty-state">
                {todos.length === 0 ? (
                  <p>{t('tasks.noTasks')}</p>
                ) : (
                  <p>{t('tasks.noMatchingTasks')}</p>
                )}
              </div>
            ) : (
              <>
                {/* 未完了タスク */}
                {pendingTodos.length > 0 && (
                  <SortableContext
                    items={pendingTodos.map(todo => todo.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {pendingTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={toggleTodo}
                        onUpdate={updateTodo}
                        onDelete={handleDeleteWithConfirm}
                        isSelected={selectedTodos.has(todo.id)}
                        slimMode={!settings.detailedMode}
                        onSelect={(id, selected, event) => {
                          const allTodos = [...pendingTodos, ...completedTodos];
                          const currentIndex = allTodos.findIndex(todo => todo.id === id);
                          const newSelected = new Set(selectedTodos);

                          if (event?.shiftKey && lastSelectedIndex !== -1) {
                            // Shift+クリック: 範囲選択
                            const startIndex = Math.min(lastSelectedIndex, currentIndex);
                            const endIndex = Math.max(lastSelectedIndex, currentIndex);
                            
                            for (let i = startIndex; i <= endIndex; i++) {
                              newSelected.add(allTodos[i].id);
                            }
                            setSelectedTodos(newSelected);
                          } else if (event?.ctrlKey || event?.metaKey) {
                            // Ctrl+クリック: 個別選択/解除
                            if (selected) {
                              newSelected.add(id);
                            } else {
                              newSelected.delete(id);
                            }
                            setSelectedTodos(newSelected);
                            setLastSelectedIndex(currentIndex);
                          } else {
                            // 通常クリック: 単一選択
                            if (selected) {
                              setSelectedTodos(new Set([id]));
                            } else {
                              setSelectedTodos(new Set());
                            }
                            setLastSelectedIndex(currentIndex);
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                )}

                {/* 完了済みタスクセクション */}
                {completedTodos.length > 0 && (
                  <div className="completed-section">
                    <button
                      className="completed-section__header"
                      onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                    >
                      <span className={`completed-section__arrow ${isCompletedExpanded ? 'expanded' : ''}`}>
                        ▶
                      </span>
                      <span className="completed-section__title">
                        {t('tasks.completedTasks', { count: completedTodos.length })}
                      </span>
                    </button>
                    
                    {isCompletedExpanded && (
                      <div className="completed-section__content">
                        <SortableContext
                          items={completedTodos.map(todo => todo.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {completedTodos.map((todo) => (
                            <TodoItem
                              key={todo.id}
                              todo={todo}
                              onToggle={toggleTodo}
                              onUpdate={updateTodo}
                              onDelete={handleDeleteWithConfirm}
                              isSelected={selectedTodos.has(todo.id)}
                              slimMode={!settings.detailedMode}
                              onSelect={(id, selected, event) => {
                                const allTodos = [...pendingTodos, ...completedTodos];
                                const currentIndex = allTodos.findIndex(todo => todo.id === id);
                                const newSelected = new Set(selectedTodos);

                                if (event?.ctrlKey || event?.metaKey) {
                                  // Ctrl+クリック: 個別選択/解除
                                  if (selected) {
                                    newSelected.add(id);
                                  } else {
                                    newSelected.delete(id);
                                  }
                                  setSelectedTodos(newSelected);
                                  setLastSelectedIndex(currentIndex);
                                } else {
                                  // 通常クリック: 単一選択
                                  if (selected) {
                                    setSelectedTodos(new Set([id]));
                                  } else {
                                    setSelectedTodos(new Set());
                                  }
                                  setLastSelectedIndex(currentIndex);
                                }
                              }}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DndContext>
      </main>

      {showSettings && (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
          todos={todos}
          onImportTodos={handleImportTodos}
          connectionStatus={connectionStatus}
          reconnectAttempts={reconnectAttempts}
        />
      )}

      {showShortcutHelp && (
        <ShortcutHelp
          onClose={() => setShowShortcutHelp(false)}
        />
      )}

      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, todoIds: [], title: '', message: '' })}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        itemCount={deleteConfirm.todoIds.length}
      />

      {/* 底部固定のAddTodoForm */}
      {isWindowFocused && (
        <div className="add-todo-overlay">
          <AddTodoForm ref={addTodoFormRef} onAdd={addTodo} slimMode={!settings.detailedMode} />
        </div>
      )}

      {/* ミニモード用の固定接続状況インジケーター */}
      {!settings.detailedMode && (
        <div 
          className="fixed-connection-indicator-container"
          style={{
            position: 'fixed',
            bottom: '12px',
            right: '12px',
            zIndex: 1000
          }}
          onMouseEnter={() => setShowConnectionTooltip(true)}
          onMouseLeave={() => setShowConnectionTooltip(false)}
        >
          <div 
            className="fixed-connection-indicator"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getConnectionStatusBgColor(),
              border: '2px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
              cursor: 'pointer'
            }}
          />
          {showConnectionTooltip && (
            <div
              className="connection-tooltip"
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '0px',
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                zIndex: 1001
              }}
            >
              {getConnectionStatusText()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
