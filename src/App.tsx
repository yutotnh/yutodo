import React, { useState, useEffect, useRef } from 'react';
import { Minus, X, Pin, PinOff } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
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
import { ConnectionErrorOverlay } from './components/ConnectionErrorOverlay';
import { MenuBar } from './components/MenuBar';
import { ScheduleView } from './components/ScheduleView';
import { ScheduleModal } from './components/ScheduleModal';
import { CommandPalette } from './components/CommandPalette';
import { SettingsErrorBanner } from './components/SettingsErrorBanner';
import { useSocket } from './hooks/useSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileSettings } from './hooks/useFileSettings';
import { AppSettings, Todo, Schedule, SearchSettings } from './types/todo';
import { CommandContext } from './types/commands';
import { formatTomlKeyValue } from './utils/tomlUtils';
import { registerDefaultCommands } from './commands/defaultCommands';
import { isOverdue } from './utils/dateUtils';
import { openNewYuToDoWindow } from './utils/windowUtils';
import logger from './utils/logger';
import './App.css';
import './components/CommandPalette.css';

const DEFAULT_SETTINGS: AppSettings = {
  startupAlwaysOnTop: false,
  darkMode: 'auto',
  confirmDelete: true,
  customCss: '',
  serverUrl: 'http://localhost:3001',
  language: 'auto',
  startupView: 'tasks-detailed'
};

// Tauri環境でのフォールバック設定
const getTauriDefaultSettings = (): AppSettings => {
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
  
  // Tauri環境では積極的にダークモードを検出
  let defaultDarkMode: 'auto' | 'dark' | 'light' = 'auto';
  
  if (isTauri) {
    try {
      // 複数の方法でダークモードを検出
      const matchMediaResult = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // より積極的にダークモードを検出
      if (matchMediaResult) {
        defaultDarkMode = 'dark';
        logger.debug('Tauri default settings: detected dark mode via matchMedia');
      } else {
        // OS環境をより詳細にチェック
        const userAgent = navigator.userAgent.toLowerCase();
        const isLinux = userAgent.includes('linux');
        
        // WSL環境では通常ダークモードが好まれる
        if (isLinux && userAgent.includes('wsl')) {
          defaultDarkMode = 'dark';
          logger.debug('Tauri default settings: WSL environment detected, defaulting to dark');
        } else {
          defaultDarkMode = 'auto';
        }
      }
    } catch (error) {
      logger.warn('Error in Tauri default settings detection:', error);
      defaultDarkMode = 'auto';
    }
  }
  
  return {
    ...DEFAULT_SETTINGS,
    darkMode: defaultDarkMode
  };
};

function App() {
  const { t, i18n } = useTranslation();
  const { 
    settings: fileSettings, 
    updateSettings: updateFileSettings, 
    isLoading: isLoadingSettings,
    settingsErrors,
    clearError: clearSettingsError,
    openSettingsFile,
    openKeybindingsFile,
    lastChangeSource 
  } = useFileSettings();
  
  const [settings, setSettings] = useState<AppSettings>(getTauriDefaultSettings());
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set());
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState<number>(-1);
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
    itemCount?: number;
    isCompletedTasksBulkDelete?: boolean;
  }>({ isOpen: false, todoIds: [], title: '', message: '' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sessionAlwaysOnTop, setSessionAlwaysOnTop] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchSettings, setSearchSettings] = useState<SearchSettings>({
    caseSensitive: false,
    useRegex: false,
    wholeWord: false
  });
  
  // 現在のビュー状態（一時的、設定ファイルには保存しない）
  const [currentView, setCurrentView] = useState<'tasks-detailed' | 'tasks-simple' | 'schedules'>(settings.startupView);
  const addTodoFormRef = useRef<AddTodoFormRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { 
    todos, 
    schedules, 
    connectionStatus, 
    reconnectAttempts, 
    addTodo, 
    updateTodo, 
    deleteTodo, 
    deleteCompletedTodos,
    toggleTodo, 
    bulkImport, 
    reorderTodos,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
    retryConnection
  } = useSocket(!isLoadingSettings ? (fileSettings?.server.url || settings.serverUrl) : '');

  // ファイルベースの設定を適用
  useEffect(() => {
    if (!isLoadingSettings && fileSettings) {
      // 🔧 GUI変更からの設定変更の場合はファイル設定適用をスキップ
      if (lastChangeSource === 'app') {
        logger.debug('Skipping file settings application - change originated from app GUI');
        return;
      }
      
      logger.debug('Applying file-based settings from external source:', {
        fileSettings,
        source: lastChangeSource
      });
      
      // ファイル設定からAppSettings形式に変換
      const appSettings: AppSettings = {
        startupAlwaysOnTop: fileSettings.app.startupAlwaysOnTop,
        darkMode: fileSettings.app.theme,
        confirmDelete: fileSettings.app.confirmDelete,
        customCss: fileSettings.appearance.customCss,
        serverUrl: fileSettings.server.url,
        language: fileSettings.app.language,
        startupView: fileSettings.app.startupView
      };
      
      const finalSettings = { ...DEFAULT_SETTINGS, ...appSettings };
      setSettings(finalSettings);
      
      // セッションAlways on Top状態を起動時設定で初期化
      setSessionAlwaysOnTop(fileSettings.app.startupAlwaysOnTop || false);
      
      // 言語設定を明示的に適用
      if (finalSettings.language === 'auto') {
        const browserLang = navigator.language.split('-')[0];
        const supportedLang = ['en', 'ja'].includes(browserLang) ? browserLang : 'en';
        i18n.changeLanguage(supportedLang);
      } else {
        i18n.changeLanguage(finalSettings.language);
      }
      
      setIsInitialized(true);
    } else if (!isLoadingSettings && !fileSettings) {
      // ファイル設定が利用できない場合はlocalStorageフォールバック
      logger.debug('File settings not available, using localStorage fallback');
      const savedSettings = localStorage.getItem('yutodoAppSettings');
      if (savedSettings) {
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
      } else {
        setSettings(DEFAULT_SETTINGS);
        i18n.changeLanguage('en');
      }
      setIsInitialized(true);
    }
  }, [fileSettings, isLoadingSettings, lastChangeSource, i18n]);

  // currentViewとsettings.startupViewの同期
  // settings.startupViewが変更されたときにcurrentViewを更新
  useEffect(() => {
    if (isInitialized && settings.startupView) {
      setCurrentView(settings.startupView);
    }
  }, [isInitialized, settings.startupView]);

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

  // 初期化完了時にコマンドを登録
  useEffect(() => {
    if (!isInitialized) return;
    
    logger.debug('Registering default commands on initialization');
    registerDefaultCommands(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]); // 初期化完了時に必ず実行

  // 言語変更時にコマンドを再登録  
  useEffect(() => {
    if (!isInitialized) return;
    
    logger.debug('Re-registering commands due to language change');
    registerDefaultCommands(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.language]); // 言語変更時のみ


  // Tauri環境でAlways On Topを適用（セッション状態から）
  useEffect(() => {
    const applyAlwaysOnTop = async () => {
      if (!isInitialized) return;

      try {
        // Tauri環境でのみ実行
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          logger.debug('Applying always on top setting:', sessionAlwaysOnTop);
          const appWindow = getCurrentWebviewWindow();
          await appWindow.setAlwaysOnTop(sessionAlwaysOnTop);
          logger.debug('Always on top applied successfully');
        }
      } catch (error) {
        logger.error('Failed to apply always on top:', error);
      }
    };

    applyAlwaysOnTop();
  }, [sessionAlwaysOnTop, isInitialized]);

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
    const detectSystemDarkMode = async () => {
      let prefersDark = false;
      
      try {
        // Tauri環境での検出を試行
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          logger.debug('Tauri environment detected, checking system theme');
          
          // より確実な複数の検出方法を順次試行
          const detectionMethods = [
            // Method 1: Standard matchMedia
            () => {
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
              const result = mediaQuery.matches;
              logger.debug('Method 1 - matchMedia result:', result);
              return result;
            },
            
            // Method 2: CSS computed style test
            () => {
              const testElement = document.createElement('div');
              testElement.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
              testElement.className = 'tauri-dark-test';
              document.body.appendChild(testElement);
              
              const style = document.createElement('style');
              style.textContent = `
                .tauri-dark-test { 
                  color: rgb(255, 255, 255); 
                }
                @media (prefers-color-scheme: dark) {
                  .tauri-dark-test { 
                    color: rgb(1, 1, 1); 
                  }
                }
              `;
              document.head.appendChild(style);
              
              // Force style computation
              window.getComputedStyle(testElement).getPropertyValue('color');
              
              const computedStyle = window.getComputedStyle(testElement);
              const color = computedStyle.color;
              const isDark = color === 'rgb(1, 1, 1)';
              
              logger.debug('Method 2 - CSS test result:', isDark, 'color:', color);
              
              // Cleanup
              document.body.removeChild(testElement);
              document.head.removeChild(style);
              
              return isDark;
            },
            
            // Method 3: Window theme detection (Windows/Linux specific)
            () => {
              // Check for common dark theme indicators
              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              logger.debug('Method 3 - fallback matchMedia:', isDark);
              return isDark;
            }
          ];
          
          // Try each detection method until one gives a positive result
          for (const [index, method] of detectionMethods.entries()) {
            try {
              const result = method();
              if (result) {
                prefersDark = true;
                logger.debug(`Dark mode detected using method ${index + 1}`);
                break;
              }
            } catch (error) {
              logger.warn(`Detection method ${index + 1} failed:`, error);
              continue;
            }
          }
          
          // If still no dark mode detected, force check if user has dark appearance
          if (!prefersDark) {
            // Additional check for OS-level dark mode indicators
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            const hasDocumentDarkClass = document.documentElement.classList.contains('dark');
            const hasBodyDarkClass = document.body.classList.contains('dark');
            
            logger.debug('Additional checks:', { bodyBg, hasDocumentDarkClass, hasBodyDarkClass });
            
            // If any strong indicators of dark mode, assume dark
            if (hasDocumentDarkClass || hasBodyDarkClass) {
              prefersDark = true;
              logger.debug('Dark mode detected from document/body classes');
            }
          }
          
        } else {
          // Web環境では通常のmatchMediaを使用
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          prefersDark = mediaQuery.matches;
          logger.debug('Web environment matchMedia result:', prefersDark);
        }
      } catch (error) {
        logger.warn('Error detecting system dark mode:', error);
        // フォールバック: 通常のmatchMediaを使用
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        prefersDark = mediaQuery.matches;
      }
      
      setSystemPrefersDark(prefersDark);
      logger.debug('Final systemPrefersDark value:', prefersDark);
    };

    detectSystemDarkMode();

    // 通常のmediaQueryリスナーも設定
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      logger.debug('Media query changed:', e.matches);
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // マウス位置によるヘッダー表示制御（オーバーレイ方式）
  useEffect(() => {
    // Only apply auto-hide behavior in slim mode
    if (currentView !== 'tasks-simple') {
      return; // In detailed mode, header is always visible
    }

    const handleMouseMove = (e: MouseEvent) => {
      const showThreshold = 15; // 表示判定範囲: 上部タスクの編集を妨げないよう狭く
      const hideThreshold = 50; // 非表示判定範囲: 余裕を持たせて広く
      
      // メニューが開いている時はヘッダーを隠さない
      if (!isMenuOpen) {
        if (showHeader) {
          // 現在表示中: hideThreshold を超えたら非表示にする
          setShowHeader(e.clientY <= hideThreshold);
        } else {
          // 現在非表示: showThreshold 以内なら表示する
          setShowHeader(e.clientY <= showThreshold);
        }
      }
    };

    const handleMouseLeave = () => {
      // メニューが開いている時はヘッダーを隠さない
      if (!isMenuOpen) {
        setShowHeader(false);
      }
    };

    const handleWindowBlur = () => {
      if (!isMenuOpen) {
        setShowHeader(false);
      }
    };

    // Use only essential event listeners to reduce conflicts
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isMenuOpen, currentView, showHeader]); // Include showHeader as it's used in the effect

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
          const appWindow = getCurrentWebviewWindow();
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

  const handleSettingsChange = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    
    // ファイルベース設定が利用可能な場合は更新
    if (updateFileSettings) {
      try {
        // AppSettings形式からファイル設定形式に変換
        const updates = {
          app: {
            theme: newSettings.darkMode as 'auto' | 'light' | 'dark',
            language: newSettings.language,
            startupAlwaysOnTop: newSettings.startupAlwaysOnTop,
            confirmDelete: newSettings.confirmDelete,
            startupView: newSettings.startupView
          },
          server: {
            url: newSettings.serverUrl,
            reconnectInterval: 5000, // デフォルト値
            timeout: 30000 // デフォルト値
          },
          appearance: {
            customCss: newSettings.customCss
          }
        };
        
        await updateFileSettings(updates);
      } catch (error) {
        logger.error('Failed to update file-based settings:', error);
        if (error instanceof Error && error.message.includes('still initializing')) {
          logger.warn('Settings manager still initializing, settings will be applied when ready');
          // Don't fallback to localStorage in this case, just wait
          return;
        }
        // フォールバック: localStorage
        localStorage.setItem('yutodoAppSettings', JSON.stringify(newSettings));
      }
    } else {
      // ファイル設定が利用できない場合はlocalStorageに保存
      localStorage.setItem('yutodoAppSettings', JSON.stringify(newSettings));
    }
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
      const appWindow = getCurrentWebviewWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWebviewWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // メニューアクションハンドラー

  const handleToggleAlwaysOnTop = () => {
    // セッション状態のみ変更、設定ファイルには保存しない
    setSessionAlwaysOnTop(prev => !prev);
  };

  const handleSessionAlwaysOnTopChange = (alwaysOnTop: boolean) => {
    // セッション状態のみ変更、設定ファイルには保存しない
    setSessionAlwaysOnTop(alwaysOnTop);
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
                (typeof todo.priority === 'number' || typeof todo.priority === 'string')
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
                    (typeof todo.priority === 'number' || typeof todo.priority === 'string')
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
        tasksToml += formatTomlKeyValue('title', todo.title);
        tasksToml += formatTomlKeyValue('description', todo.description || '');
        tasksToml += `completed = ${todo.completed}\n`;
        tasksToml += `priority = "${todo.priority}"\n`;
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
      const appWindow = getCurrentWebviewWindow();
      await appWindow.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  };





  // 実際のダークモード状態を計算
  const isDarkMode = (() => {
    switch (settings.darkMode) {
      case 'dark':
        return true;
      case 'light':
        return false;
      case 'auto':
        return systemPrefersDark;
      default:
        return systemPrefersDark;
    }
  })();

  // ダークモード状態をデバッグログで確認
  useEffect(() => {
    const debugInfo = {
      'settings.darkMode': settings.darkMode,
      'systemPrefersDark': systemPrefersDark,
      'isDarkMode': isDarkMode,
      'isTauri': typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__,
      'matchMedia.matches': window.matchMedia('(prefers-color-scheme: dark)').matches,
      'document.body.className': document.body.className,
      'app.className': document.querySelector('.app')?.className
    };
    
    logger.debug('Dark mode debug:', debugInfo);
    
    // ブラウザコンソールにも出力（ユーザーが確認できるように）
    console.log('🌙 Dark Mode Debug:', debugInfo);
    
    // CSS適用のデバッグ - 実際の要素のスタイルを確認
    setTimeout(() => {
      const appElement = document.querySelector('.app');
      const searchBar = document.querySelector('.search-bar');
      const todoFilter = document.querySelector('.todo-filter');
      
      const cssDebugInfo = {
        'appElement.classList': appElement?.classList.toString(),
        'searchBar exists': !!searchBar,
        'todoFilter exists': !!todoFilter,
        'searchBar computed bg': searchBar ? window.getComputedStyle(searchBar).backgroundColor : 'not found',
        'todoFilter computed bg': todoFilter ? window.getComputedStyle(todoFilter).backgroundColor : 'not found'
      };
      
      logger.debug('CSS Debug:', cssDebugInfo);
      console.log('🎨 CSS Debug:', cssDebugInfo);
    }, 100);
    
    // Tauri環境でautoモードの場合、強制的に再検出を試行
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      if (settings.darkMode === 'auto' && !systemPrefersDark) {
        logger.debug('Tauri environment with auto mode but no dark detected, forcing re-detection');
        
        // 短い遅延後に再検出を実行
        setTimeout(() => {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const currentResult = mediaQuery.matches;
          logger.debug('Force re-detection result:', currentResult);
          
          if (currentResult !== systemPrefersDark) {
            logger.debug('Re-detection found different result, updating');
            setSystemPrefersDark(currentResult);
          }
        }, 100);
      }
    }
  }, [settings.darkMode, systemPrefersDark, isDarkMode]);

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
      setSelectionAnchorIndex(-1);
    }
  };

  const confirmDelete = () => {
    logger.debug('confirmDelete called', { isCompletedTasksBulkDelete: deleteConfirm.isCompletedTasksBulkDelete, todoIds: deleteConfirm.todoIds });
    
    if (deleteConfirm.isCompletedTasksBulkDelete) {
      logger.debug('Proceeding with bulk completed tasks deletion');
      // Bulk completed tasks deletion
      deleteCompletedTodos();
    } else {
      logger.debug('Proceeding with individual/selected todos deletion');
      // Individual or selected todos deletion
      deleteConfirm.todoIds.forEach(todoId => {
        deleteTodo(todoId);
      });
    }
    setSelectedTodos(new Set());
    setSelectionAnchorIndex(-1);
  };

  // ビューヘルパー関数（現在のビュー状態を使用）
  const isTasksView = () => currentView === 'tasks-detailed' || currentView === 'tasks-simple';
  const isDetailedTasksView = () => currentView === 'tasks-detailed';
  const isSimpleTasksView = () => currentView === 'tasks-simple';

  // ビュー切り替えハンドラー（現在のセッションのみ変更）
  const handleViewChange = (view: 'tasks-detailed' | 'tasks-simple' | 'schedules') => {
    setCurrentView(view);
  };

  // スケジュール関連ハンドラー
  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    deleteSchedule(scheduleId);
  };

  const handleDeleteInactiveSchedules = () => {
    // 非アクティブなスケジュールのIDを特定
    const inactiveScheduleIds = schedules.filter(schedule => {
      // スケジュールが実行予定がないかどうかを判定（ScheduleViewと同じロジック）
      if (!schedule.isActive) return true;
      
      const today = new Date().toISOString().split('T')[0];
      
      // 終了日が過去の場合
      if (schedule.endDate && schedule.endDate < today) return true;
      
      // 実行完了したスケジュール（nextExecutionがnull）は非アクティブ
      if (!schedule.nextExecution) {
        // ただし、まだ実行されていない'once'タイプは例外
        if (schedule.type === 'once' && !schedule.lastExecuted) {
          // 開始日が過去の場合のみ非アクティブ
          return schedule.startDate < today;
        }
        // その他のケース（実行完了、endDate到達など）は非アクティブ
        return true;
      }
      
      return false;
    }).map(schedule => schedule.id);

    // 一括削除
    inactiveScheduleIds.forEach(id => deleteSchedule(id));
  };

  const handleDeleteCompletedTasks = () => {
    const completedTasks = todos.filter(todo => todo.completed);
    logger.debug('handleDeleteCompletedTasks called', { completedTasksCount: completedTasks.length });
    
    if (completedTasks.length === 0) {
      logger.debug('No completed tasks to delete');
      return;
    }

    if (settings.confirmDelete) {
      logger.debug('Showing confirmation dialog for completed tasks deletion');
      // Show confirmation dialog
      setDeleteConfirm({
        isOpen: true,
        todoIds: [], // Empty array indicates bulk completed deletion
        title: t('tasks.deleteCompletedTasks'),
        message: t('tasks.deleteCompletedTasksConfirm', { count: completedTasks.length }),
        itemCount: completedTasks.length,
        isCompletedTasksBulkDelete: true
      });
    } else {
      logger.debug('Deleting completed tasks without confirmation');
      // Delete without confirmation
      deleteCompletedTodos();
    }
  };

  const handleToggleSchedule = (scheduleId: string) => {
    toggleSchedule(scheduleId);
  };

  const handleSaveSchedule = (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted' | 'nextExecution'>) => {
    if (editingSchedule) {
      // 編集
      const updatedSchedule: Schedule = {
        ...scheduleData,
        id: editingSchedule.id,
        createdAt: editingSchedule.createdAt,
        updatedAt: new Date().toISOString(),
        lastExecuted: editingSchedule.lastExecuted,
        nextExecution: editingSchedule.nextExecution
      };
      updateSchedule(updatedSchedule);
    } else {
      // 新規作成
      addSchedule(scheduleData);
    }
    setShowScheduleModal(false);
    setEditingSchedule(null);
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
    const isTaskOverdue = isOverdue(todo.scheduledFor, todo.completed);

    // 検索クエリでフィルタリング
    const matchesSearch = (() => {
      if (searchQuery === '') return true;
      
      const searchText = searchQuery;
      const targetTitle = todo.title;
      const targetDescription = todo.description || '';
      
      // 正規表現モード
      if (searchSettings.useRegex) {
        try {
          const regex = new RegExp(searchText, searchSettings.caseSensitive ? 'g' : 'gi');
          return regex.test(targetTitle) || regex.test(targetDescription);
        } catch {
          // 無効な正規表現の場合はfalseを返す
          return false;
        }
      }
      
      // 通常の検索
      let titleToSearch = targetTitle;
      let descToSearch = targetDescription;
      let queryToSearch = searchText;
      
      // 大文字小文字を区別しない場合
      if (!searchSettings.caseSensitive) {
        titleToSearch = titleToSearch.toLowerCase();
        descToSearch = descToSearch.toLowerCase();
        queryToSearch = queryToSearch.toLowerCase();
      }
      
      // 単語単位で検索
      if (searchSettings.wholeWord) {
        // 単語境界を考慮した検索
        const wordBoundaryRegex = new RegExp(`\\b${queryToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, searchSettings.caseSensitive ? 'g' : 'gi');
        return wordBoundaryRegex.test(targetTitle) || wordBoundaryRegex.test(targetDescription);
      }
      
      // 通常の部分一致検索
      return titleToSearch.includes(queryToSearch) || descToSearch.includes(queryToSearch);
    })();

    if (!matchesSearch) return false;

    // フィルターでフィルタリング
    switch (currentFilter) {
      case 'completed':
        return todo.completed;
      case 'pending':
        return !todo.completed;
      case 'overdue':
        return isTaskOverdue;
      case 'high':
        return todo.priority === 'high';
      case 'medium':
        return todo.priority === 'medium';
      case 'low':
        return todo.priority === 'low';
      default:
        return true;
    }
  });

  // フィルターのカウント計算
  const filterCounts = {
    all: todos.length,
    completed: todos.filter(todo => todo.completed).length,
    pending: todos.filter(todo => !todo.completed).length,
    overdue: todos.filter(todo => isOverdue(todo.scheduledFor, todo.completed)).length,
    high: todos.filter(todo => todo.priority === 'high').length,
    medium: todos.filter(todo => todo.priority === 'medium').length,
    low: todos.filter(todo => todo.priority === 'low').length
  };

  // キーボードショートカットハンドラ（filteredTodosを使用）
  const keyboardHandlers = {
    onNewTask: () => {
      // 選択状態をクリアしてからフォーカス（Ctrl+Nのみで実行）
      setSelectedTodos(new Set());
      setSelectionAnchorIndex(-1);
      addTodoFormRef.current?.focusInput();
    },
    onToggleSettings: () => {
      setShowSettings(prev => !prev);
    },
    onToggleSearch: () => {
      setShowSearch(prev => !prev);
      if (!showSearch) {
        // 検索を表示する場合は、少し遅延してフォーカス
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
      // 検索クエリは保持する（クリアしない）
    },
    onToggleFilter: () => {
      setShowFilter(prev => !prev);
    },
    onToggleCaseSensitive: () => {
      setSearchSettings(prev => ({
        ...prev,
        caseSensitive: !prev.caseSensitive
      }));
    },
    onToggleRegex: () => {
      setSearchSettings(prev => ({
        ...prev,
        useRegex: !prev.useRegex
      }));
    },
    onToggleWholeWord: () => {
      setSearchSettings(prev => ({
        ...prev,
        wholeWord: !prev.wholeWord
      }));
    },
    onFocusSearch: () => {
      // 後方互換性のため残す
      setShowSearch(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    },
    onSelectAll: () => {
      // フィルター結果のみを選択
      setSelectedTodos(new Set(filteredTodos.map(todo => todo.id)));
      // アンカーを全体リスト内での最後のフィルター結果アイテムのインデックスに設定
      if (filteredTodos.length > 0) {
        // 注意: この時点ではpendingTodos/completedTodosはまだ定義されていないため、
        // アンカー設定は範囲選択時に動的に計算される
        setSelectionAnchorIndex(0); // 仮の値、実際の選択時に正しく計算される
      }
    },
    onDeleteSelected: () => {
      handleBulkDeleteWithConfirm();
    },
    onShowHelp: () => {
      setShowShortcutHelp(true);
    },
    onClearSelection: () => {
      setSelectedTodos(new Set());
      setSelectionAnchorIndex(-1);
    },
    onEditSelected: () => {
      // 最初に選択されたタスクを編集モードにする
      if (selectedTodos.size === 1) {
        const selectedId = Array.from(selectedTodos)[0];
        const todo = todos.find(t => t.id === selectedId);
        if (todo) {
          // 選択を解除して編集モードに入る
          setSelectedTodos(new Set());
          setSelectionAnchorIndex(-1);
          
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
    },
    onOpenCommandPalette: () => {
      setShowCommandPalette(true);
    },
    onNewWindow: () => {
      openNewYuToDoWindow();
    },
    // View switching（現在のビューのみ変更、設定ファイルには保存しない）
    onShowTasks: () => {
      setCurrentView('tasks-detailed');
    },
    onShowTasksDetailed: () => {
      setCurrentView('tasks-detailed');
    },
    onShowTasksSimple: () => {
      setCurrentView('tasks-simple');
    },
    onShowSchedules: () => {
      setCurrentView('schedules');
    },
    // Legacy handlers for backward compatibility
    onViewTasksDetailed: () => {
      setCurrentView('tasks-detailed');
    },
    onViewTasksSimple: () => {
      setCurrentView('tasks-simple');
    },
    onViewSchedules: () => {
      setCurrentView('schedules');
    },
    // Navigation (TODO: implement these)
    onNextTask: () => {
      logger.debug('Next task navigation not yet implemented');
    },
    onPreviousTask: () => {
      logger.debug('Previous task navigation not yet implemented');
    },
    onFirstTask: () => {
      logger.debug('First task navigation not yet implemented');
    },
    onLastTask: () => {
      logger.debug('Last task navigation not yet implemented');
    }
  };

  // キーボードショートカットを有効化
  const { shortcuts, updateContext } = useKeyboardShortcuts(keyboardHandlers, { 
    isModalOpen: showSettings || showShortcutHelp || deleteConfirm.isOpen || showScheduleModal || showCommandPalette 
  });
  
  // Update keyboard context
  useEffect(() => {
    updateContext({
      hasSelectedTasks: selectedTodos.size > 0,
      isEditing: false // TODO: track editing state from TodoItem
    });
  }, [selectedTodos.size, updateContext]);

  // 未完了と完了済みタスクを分離
  const pendingTodos = filteredTodos.filter(todo => !todo.completed).sort((a, b) => {
    // カスタムorderがある場合はそれを優先
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }

    const aPriorityValue = typeof a.priority === 'number' ? a.priority : 
                         a.priority === 'high' ? 2 : a.priority === 'medium' ? 1 : 0;
    const bPriorityValue = typeof b.priority === 'number' ? b.priority : 
                         b.priority === 'high' ? 2 : b.priority === 'medium' ? 1 : 0;
    
    if (aPriorityValue !== bPriorityValue) {
      return bPriorityValue - aPriorityValue;
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


  // テーマクラスの決定
  const getThemeClass = () => {
    switch (settings.darkMode) {
      case 'dark':
        return 'app--dark';
      case 'light':
        return 'app--light';
      case 'auto':
        return isDarkMode ? 'app--dark' : '';
      default:
        return '';
    }
  };

  // CommandContext for command palette
  const commandContext: CommandContext = {
    startupView: settings.startupView,
    currentView: currentView,
    selectedTasks: selectedTodos,
    searchQuery,
    settings,
    onNewTask: keyboardHandlers.onNewTask,
    onNewWindow: keyboardHandlers.onNewWindow,
    onToggleSettings: keyboardHandlers.onToggleSettings,
    onFocusSearch: keyboardHandlers.onFocusSearch,
    onToggleSearch: keyboardHandlers.onToggleSearch,
    onToggleFilter: keyboardHandlers.onToggleFilter,
    onToggleCaseSensitive: keyboardHandlers.onToggleCaseSensitive,
    onToggleRegex: keyboardHandlers.onToggleRegex,
    onToggleWholeWord: keyboardHandlers.onToggleWholeWord,
    onSelectAll: keyboardHandlers.onSelectAll,
    onDeleteSelected: keyboardHandlers.onDeleteSelected,
    onClearSelection: keyboardHandlers.onClearSelection,
    onEditSelected: keyboardHandlers.onEditSelected,
    onToggleSelectedCompletion: keyboardHandlers.onToggleSelectedCompletion,
    onExportTasks: handleExportTasksFromMenu,
    onImportTasks: handleImportTasksFromMenu,
    onViewChange: setCurrentView,
    onToggleDarkMode: () => {
      const newMode = settings.darkMode === 'dark' ? 'light' : settings.darkMode === 'light' ? 'auto' : 'dark';
      setSettings(prev => ({ ...prev, darkMode: newMode }));
    },
    onToggleSlimMode: () => {
      if (isTasksView()) {
        const newView = isDetailedTasksView() ? 'tasks-simple' : 'tasks-detailed';
        setCurrentView(newView);
      }
    },
    onToggleAlwaysOnTop: () => setSessionAlwaysOnTop(!sessionAlwaysOnTop),
    onShowHelp: () => setShowShortcutHelp(true),
    // View handlers（現在のビューのみ変更）
    onShowTasksDetailed: () => setCurrentView('tasks-detailed'),
    onShowTasksSimple: () => setCurrentView('tasks-simple'),
    onShowSchedules: () => setCurrentView('schedules'),
    // Schedule handlers
    onDeleteInactiveSchedules: handleDeleteInactiveSchedules,
    onCreateSchedule: handleCreateSchedule,
    // Task bulk operations
    onDeleteCompletedTasks: handleDeleteCompletedTasks
  };

  return (
    <div data-testid="app-container" className={`app ${isSimpleTasksView() ? 'app--slim' : ''} ${getThemeClass()}`}>
      <header data-testid="app-header" className={`app-header ${(isDetailedTasksView() || showHeader) ? 'app-header--visible' : 'app-header--hidden'}`} onMouseDown={handleHeaderMouseDown}>
        <div className="header-left">
          <MenuBar
            currentView={currentView}
            sessionAlwaysOnTop={sessionAlwaysOnTop}
            onNewTask={keyboardHandlers.onNewTask}
            onNewWindow={keyboardHandlers.onNewWindow}
            onSelectAll={keyboardHandlers.onSelectAll}
            onDeleteSelected={keyboardHandlers.onDeleteSelected}
            onShowSettings={() => setShowSettings(true)}
            onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
            onShowShortcuts={() => setShowShortcutHelp(true)}
            onShowAbout={handleShowAbout}
            onImportTasks={handleImportTasksFromMenu}
            onExportTasks={handleExportTasksFromMenu}
            onMenuStateChange={setIsMenuOpen}
            onViewChange={handleViewChange}
          />
        </div>
        <div className="header-center">
          {/* Connection status now handled by overlay */}
        </div>
        <div className="header-right">
          <button
            data-testid="always-on-top-button"
            onClick={handleToggleAlwaysOnTop}
            className={`window-control always-on-top-btn ${sessionAlwaysOnTop ? 'active' : ''}`}
            title={sessionAlwaysOnTop ? t('app.unpinWindow') : t('app.pinWindow')}
          >
            {sessionAlwaysOnTop ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
          <button
            data-testid="minimize-button"
            onClick={handleMinimize}
            className="window-control minimize-btn"
            title={t('app.minimize')}
          >
            <Minus size={12} />
          </button>
          <button
            data-testid="close-button"
            onClick={handleClose}
            className="window-control close-btn"
            title={t('app.close')}
          >
            <X size={12} />
          </button>
        </div>
      </header>

      {/* Settings error banner - shown on main screen for immediate visibility */}
      <SettingsErrorBanner
        errors={settingsErrors}
        onDismiss={clearSettingsError}
        onOpenFile={async (filePath) => {
          if (filePath.includes('keybindings')) {
            await openKeybindingsFile();
          } else {
            await openSettingsFile();
          }
        }}
      />

      <main className="app-main">
        {isTasksView() ? (
          <>
            {showSearch && (
              <SearchBar
                ref={searchInputRef}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchSettings={searchSettings}
                onSearchSettingsChange={setSearchSettings}
                onClose={() => setShowSearch(false)}
              />
            )}

            {showFilter && (
              <TodoFilter
                currentFilter={currentFilter}
                onFilterChange={setCurrentFilter}
                counts={filterCounts}
                onClose={() => setShowFilter(false)}
              />
            )}

            {/* 選択カウンター */}
            {selectedTodos.size > 1 && (
              <div className="selection-counter">
                <span className="selection-counter__text" data-testid="selection-count">
                  {t('tasks.selectedItems', { count: selectedTodos.size })}
                </span>
                <button 
                  onClick={() => {
                    setSelectedTodos(new Set());
                    setSelectionAnchorIndex(-1);
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
          <div 
            data-testid="todo-list" 
            className="todo-list"
            style={{
              height: (() => {
                const isAddTodoVisible = isWindowFocused && isTasksView();
                if (isSimpleTasksView()) {
                  // スリムモード: AddTodoフォーム表示状態に応じて動的調整
                  return isAddTodoVisible ? 'calc(100vh - 50px)' : '100vh';
                } else {
                  // 詳細モード: ヘッダーは常に固定表示なので一定の高さを確保
                  // Header height (28px) is handled by CSS padding-top on .app-main
                  const formHeight = isAddTodoVisible ? '80px' : '0px';
                  return `calc(100vh - 28px - ${formHeight})`;
                }
              })()
            }}
          >
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
                        slimMode={isSimpleTasksView()}
                        onSelect={(id, selected, event) => {
                          const allTodos = [...pendingTodos, ...completedTodos];
                          const currentIndex = allTodos.findIndex(todo => todo.id === id);

                          if (event?.shiftKey && selectionAnchorIndex !== -1) {
                            // Shift+クリック: アンカーとの間の範囲選択（置き換え）
                            const newSelected = new Set<string>();
                            const startIndex = Math.min(selectionAnchorIndex, currentIndex);
                            const endIndex = Math.max(selectionAnchorIndex, currentIndex);
                            
                            for (let i = startIndex; i <= endIndex; i++) {
                              newSelected.add(allTodos[i].id);
                            }
                            setSelectedTodos(newSelected);
                          } else if (event?.ctrlKey || event?.metaKey) {
                            // Ctrl+クリック: 個別選択/解除
                            const newSelected = new Set(selectedTodos);
                            if (selected) {
                              newSelected.add(id);
                            } else {
                              newSelected.delete(id);
                            }
                            setSelectedTodos(newSelected);
                            setSelectionAnchorIndex(currentIndex); // Ctrl+クリックで新しいアンカーを設定
                          } else {
                            // 通常クリック: 単一選択
                            if (selected) {
                              setSelectedTodos(new Set([id]));
                            } else {
                              setSelectedTodos(new Set());
                            }
                            setSelectionAnchorIndex(currentIndex); // 通常クリックで新しいアンカーを設定
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
                              slimMode={isSimpleTasksView()}
                              onSelect={(id, selected, event) => {
                                const allTodos = [...pendingTodos, ...completedTodos];
                                const currentIndex = allTodos.findIndex(todo => todo.id === id);

                                if (event?.shiftKey && selectionAnchorIndex !== -1) {
                                  // Shift+クリック: アンカーとの間の範囲選択（置き換え）
                                  const newSelected = new Set<string>();
                                  const startIndex = Math.min(selectionAnchorIndex, currentIndex);
                                  const endIndex = Math.max(selectionAnchorIndex, currentIndex);
                                  
                                  for (let i = startIndex; i <= endIndex; i++) {
                                    newSelected.add(allTodos[i].id);
                                  }
                                  setSelectedTodos(newSelected);
                                } else if (event?.ctrlKey || event?.metaKey) {
                                  // Ctrl+クリック: 個別選択/解除
                                  const newSelected = new Set(selectedTodos);
                                  if (selected) {
                                    newSelected.add(id);
                                  } else {
                                    newSelected.delete(id);
                                  }
                                  setSelectedTodos(newSelected);
                                  setSelectionAnchorIndex(currentIndex); // Ctrl+クリックで新しいアンカーを設定
                                } else {
                                  // 通常クリック: 単一選択
                                  if (selected) {
                                    setSelectedTodos(new Set([id]));
                                  } else {
                                    setSelectedTodos(new Set());
                                  }
                                  setSelectionAnchorIndex(currentIndex); // 通常クリックで新しいアンカーを設定
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
          </>
        ) : (
          /* スケジュールビュー */
          <ScheduleView
            schedules={schedules}
            onCreateSchedule={handleCreateSchedule}
            onEditSchedule={handleEditSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onToggleSchedule={handleToggleSchedule}
            onDeleteInactiveSchedules={handleDeleteInactiveSchedules}
          />
        )}
      </main>

      {showSettings && (
        <Settings
          settings={settings}
          sessionAlwaysOnTop={sessionAlwaysOnTop}
          onSettingsChange={handleSettingsChange}
          onSessionAlwaysOnTopChange={handleSessionAlwaysOnTopChange}
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
          shortcuts={shortcuts}
        />
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        context={commandContext}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, todoIds: [], title: '', message: '' })}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        itemCount={deleteConfirm.itemCount || deleteConfirm.todoIds.length}
      />

      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          schedule={editingSchedule}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
          }}
          onSave={handleSaveSchedule}
        />
      )}

      {/* 底部固定のAddTodoForm (タスクビューのみ) */}
      {isWindowFocused && isTasksView() && (
        <div className="add-todo-overlay">
          <AddTodoForm ref={addTodoFormRef} onAdd={addTodo} slimMode={isSimpleTasksView()} />
        </div>
      )}

      {/* Connection status now handled by overlay */}

      {/* Connection Error Overlay */}
      <ConnectionErrorOverlay
        connectionStatus={connectionStatus}
        reconnectAttempts={reconnectAttempts}
        onRetry={retryConnection}
        onUpdateServerUrl={(newUrl) => {
          const newSettings = { ...settings, serverUrl: newUrl };
          setSettings(newSettings);
          // Convert AppSettings to AppSettingsFile format
          const fileSettings = {
            app: {
              theme: newSettings.darkMode,
              language: newSettings.language,
              startupAlwaysOnTop: newSettings.startupAlwaysOnTop,
              confirmDelete: newSettings.confirmDelete,
              startupView: newSettings.startupView
            },
            server: {
              url: newUrl,
              reconnectInterval: 5000,
              timeout: 30000
            },
            ui: {
              autoHideHeader: true,
              fontSize: 14,
              fontFamily: 'Inter, sans-serif'
            },
            appearance: {
              customCss: newSettings.customCss
            }
          };
          updateFileSettings(fileSettings);
        }}
        serverUrl={settings.serverUrl}
      />
    </div>
  );
}

export default App;
