import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Minus, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
  serverUrl: 'http://localhost:3001'
};

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set());
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
  const addTodoFormRef = useRef<AddTodoFormRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { todos, connected, connectionStatus, reconnectAttempts, addTodo, updateTodo, deleteTodo, toggleTodo, bulkImport, reorderTodos } = useSocket(settings.serverUrl);

  useEffect(() => {
    const initializeConfig = async () => {
      try {
        console.log('Initializing config manager...');
        await configManager.initialize();
        const appSettings = configManager.getAppSettings();
        console.log('Loaded app settings:', appSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...appSettings });
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize config:', error);
        // フォールバック: localStorage
        console.log('Attempting localStorage fallback...');
        const savedSettings = localStorage.getItem('todoAppSettings');
        if (savedSettings) {
          console.log('Found saved settings in localStorage:', savedSettings);
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          setIsInitialized(true);
        } else {
          console.log('No saved settings found in localStorage');
          setIsInitialized(true);
        }
      }
    };

    initializeConfig();
  }, []);

  useEffect(() => {
    // 初期化完了後にのみ保存処理を実行
    if (!isInitialized) return;

    console.log('🔄 Settings changed, saving to both localStorage and config file:', settings);

    // localStorageに保存
    try {
      localStorage.setItem('todoAppSettings', JSON.stringify(settings));
      console.log('✅ Settings saved to localStorage');
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

  // ヘッダー表示制御
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 画面上部60px以内にカーソルがある場合ヘッダーを表示（ドラッグしやすくするため範囲を拡大）
      if (e.clientY <= 60) {
        setShowHeader(true);
      } else if (e.clientY > 120) {
        // 120px以下に下がったらヘッダーを隠す（余裕を持たせる）
        setShowHeader(false);
      }
    };

    const handleMouseLeave = () => {
      // マウスがウィンドウを離れても即座に隠さない（ドラッグ操作を考慮）
      setTimeout(() => {
        setShowHeader(false);
      }, 1000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

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
    const getStatusIcon = () => {
      switch (connectionStatus) {
        case 'connected':
          return '●';
        case 'connecting':
          return '○';
        case 'disconnected':
          return '×';
        case 'error':
          return '!';
        default:
          return '?';
      }
    };

    const updateTitle = async () => {
      try {
        const statusIcon = getStatusIcon();
        const reconnectText = reconnectAttempts > 0 ? ` (${reconnectAttempts})` : '';
        const newTitle = `${statusIcon} YuToDo${reconnectText}`;

        // Tauriの場合
        if (window.__TAURI__) {
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
    }
  };

  useKeyboardShortcuts(keyboardHandlers);

  // 実際のダークモード状態を計算
  const isDarkMode = settings.darkMode === 'dark' ||
    (settings.darkMode === 'auto' && systemPrefersDark);

  // 削除ハンドラー（設定に応じて確認ダイアログを表示）
  const handleDeleteWithConfirm = (todoId: string) => {
    if (settings.confirmDelete) {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;

      setDeleteConfirm({
        isOpen: true,
        todoIds: [todoId],
        title: 'タスクを削除',
        message: `「${todo.title}」を削除しますか？`
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
        title: '選択されたタスクを削除',
        message: '選択されたタスクを削除しますか？'
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
      const oldIndex = sortedTodos.findIndex(todo => todo.id === active.id);
      const newIndex = sortedTodos.findIndex(todo => todo.id === over.id);

      const reorderedTodos = arrayMove(sortedTodos, oldIndex, newIndex);

      // 新しいorderを計算して送信
      const reorderData = reorderedTodos.map((todo, index) => ({
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

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    // カスタムorderがある場合はそれを優先
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }

    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
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

  return (
    <div className={`app ${!settings.detailedMode ? 'app--slim' : ''} ${isDarkMode ? 'app--dark' : ''}`}>
      <header className={`app-header ${showHeader ? 'app-header--visible' : 'app-header--hidden'}`} onMouseDown={handleHeaderMouseDown}>
        <div className="header-left">
          <h1>YuToDo</h1>
          {!settings.detailedMode && (
            <ConnectionStatus
              connectionStatus={connectionStatus}
              reconnectAttempts={reconnectAttempts}
              isSlimMode={true}
              className="ml-2"
            />
          )}
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
            onClick={() => setShowSettings(true)}
            className="settings-btn"
          >
            <SettingsIcon size={16} />
          </button>
          <button
            onClick={handleMinimize}
            className="window-control minimize-btn"
            title="最小化"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleClose}
            className="window-control close-btn"
            title="閉じる"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <main className={`app-main ${showHeader ? 'app-main--with-header' : ''}`}>
        {isWindowFocused && <AddTodoForm ref={addTodoFormRef} onAdd={addTodo} slimMode={!settings.detailedMode} />}

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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          autoScroll={false} // 自動スクロール無効化でパフォーマンス向上
        >
          <div className="todo-list">
            {sortedTodos.length === 0 ? (
              <div className="empty-state">
                {todos.length === 0 ? (
                  <p>タスクがありません。上記から新しいタスクを追加してください。</p>
                ) : (
                  <p>検索条件またはフィルターに一致するタスクがありません。</p>
                )}
              </div>
            ) : (
              <SortableContext
                items={sortedTodos.map(todo => todo.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onUpdate={updateTodo}
                    onDelete={handleDeleteWithConfirm}
                    isSelected={selectedTodos.has(todo.id)}
                    slimMode={!settings.detailedMode}
                    onSelect={(id, selected) => {
                      const newSelected = new Set(selectedTodos);
                      if (selected) {
                        newSelected.add(id);
                      } else {
                        newSelected.delete(id);
                      }
                      setSelectedTodos(newSelected);
                    }}
                  />
                ))}
              </SortableContext>
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
    </div>
  );
}

export default App;
