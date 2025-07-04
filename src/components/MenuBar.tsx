import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFileSettings } from '../hooks/useFileSettings';
import { detectOS } from '../utils/osDetection';

interface MenuBarProps {
  currentView: 'tasks-detailed' | 'tasks-simple' | 'schedules';
  sessionAlwaysOnTop: boolean;
  onNewTask: () => void;
  onNewWindow: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onShowSettings: () => void;
  onToggleAlwaysOnTop: () => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
  onImportTasks: () => void;
  onExportTasks: () => void;
  onQuit?: () => void;
  onMenuStateChange?: (isOpen: boolean) => void;
  onViewChange: (view: 'tasks-detailed' | 'tasks-simple' | 'schedules') => void;
}

interface MenuItemData {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
  prefix?: string;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  currentView,
  sessionAlwaysOnTop,
  onNewTask,
  onNewWindow,
  onSelectAll,
  onDeleteSelected,
  onShowSettings,
  onToggleAlwaysOnTop,
  onShowShortcuts,
  onShowAbout,
  onImportTasks,
  onExportTasks,
  onQuit,
  onMenuStateChange,
  onViewChange
}) => {
  const { t, i18n } = useTranslation();
  const { keybindings } = useFileSettings();
  
  // コマンドからキーバインディングを取得するヘルパー関数
  const getShortcutForCommand = useMemo(() => {
    const commandMap = new Map<string, string>();
    
    // フォールバックキーバインディング
    const fallbackKeybindings = [
      { key: 'Ctrl+Shift+P', command: 'openCommandPalette' },
      { key: 'Ctrl+N', command: 'newTask' },
      { key: 'Ctrl+Shift+N', command: 'newWindow' },
      { key: 'Ctrl+,', command: 'openSettings' },
      { key: 'Ctrl+A', command: 'selectAll' },
      { key: 'Delete', command: 'deleteSelected' },
      { key: 'Ctrl+1', command: 'showTasksDetailed' },
      { key: 'Ctrl+2', command: 'showTasksSimple' },
      { key: 'Ctrl+3', command: 'showSchedules' },
      { key: 'Ctrl+K Ctrl+S', command: 'showKeybindings' }
    ];
    
    // 実際のキーバインディングがある場合はそれを使用、なければフォールバック
    const effectiveKeybindings = keybindings.length > 0 ? keybindings : fallbackKeybindings;
    
    effectiveKeybindings.forEach(kb => {
      commandMap.set(kb.command, kb.key);
    });
    
    return (command: string): string | undefined => {
      const key = commandMap.get(command);
      if (!key) return undefined;
      
      // OS別の表示調整
      const os = detectOS();
      const modifierKey = os === 'mac' ? 'Cmd' : 'Ctrl';
      return key.replace(/Ctrl/g, modifierKey);
    };
  }, [keybindings]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [isHamburgerMode, setIsHamburgerMode] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);


  // メニュー定義（実際のキーバインディングから取得）
  const menus = useMemo(() => ({
    file: {
      label: t('menu.file'),
      accessKey: 'F',
      items: [
        { id: 'new-task', label: t('menu.newTask'), shortcut: getShortcutForCommand('newTask'), action: onNewTask },
        { id: 'new-window', label: t('menu.newWindow'), shortcut: getShortcutForCommand('newWindow'), action: onNewWindow },
        { id: 'separator-1', separator: true },
        { id: 'import', label: t('menu.importTasks'), action: onImportTasks },
        { id: 'export', label: t('menu.exportTasks'), action: onExportTasks },
        { id: 'separator-2', separator: true },
        { id: 'preferences', label: t('menu.preferences'), shortcut: getShortcutForCommand('openSettings'), action: onShowSettings },
        ...(onQuit ? [{ id: 'separator-3', separator: true }, { id: 'quit', label: t('menu.quit'), shortcut: 'Ctrl+Q', action: onQuit }] : [])
      ] as MenuItemData[]
    },
    edit: {
      label: t('menu.edit'),
      accessKey: 'E',
      items: [
        { id: 'select-all', label: t('menu.selectAll'), shortcut: getShortcutForCommand('selectAll'), action: onSelectAll },
        { id: 'delete-selected', label: t('menu.deleteSelected'), shortcut: getShortcutForCommand('deleteSelected'), action: onDeleteSelected }
      ] as MenuItemData[]
    },
    view: {
      label: t('menu.view'),
      accessKey: 'V',
      items: [
        { id: 'show-tasks-detailed', label: currentView === 'tasks-detailed' ? t('menu.showingTasksDetailed') : t('menu.showTasksDetailed'), shortcut: getShortcutForCommand('showTasksDetailed'), action: () => onViewChange('tasks-detailed') },
        { id: 'show-tasks-simple', label: currentView === 'tasks-simple' ? t('menu.showingTasksSimple') : t('menu.showTasksSimple'), shortcut: getShortcutForCommand('showTasksSimple'), action: () => onViewChange('tasks-simple') },
        { id: 'show-schedules', label: currentView === 'schedules' ? t('menu.showingSchedules') : t('menu.showSchedules'), shortcut: getShortcutForCommand('showSchedules'), action: () => onViewChange('schedules') },
        { id: 'separator-1', separator: true },
        { id: 'always-on-top', prefix: sessionAlwaysOnTop ? '✓ ' : '  ', label: t('menu.alwaysOnTop'), action: onToggleAlwaysOnTop }
      ] as MenuItemData[]
    },
    help: {
      label: t('menu.help'),
      accessKey: 'H',
      items: [
        { id: 'shortcuts', label: t('menu.keyboardShortcuts'), shortcut: getShortcutForCommand('showKeybindings'), action: onShowShortcuts },
        { id: 'separator-1', separator: true },
        { id: 'about', label: t('menu.about'), action: onShowAbout }
      ] as MenuItemData[]
    }
  }), [t, getShortcutForCommand, onNewTask, onNewWindow, onImportTasks, onExportTasks, onShowSettings, onQuit, onSelectAll, onDeleteSelected, onShowShortcuts, onShowAbout, onToggleAlwaysOnTop, onViewChange, sessionAlwaysOnTop, currentView]);


  // 言語に応じてアクセスキーを括弧で表示する必要があるかチェック
  const shouldShowAccessKeyInParens = useMemo(() => {
    const currentLanguage = i18n.language;
    return currentLanguage === 'ja';
  }, [i18n.language]);


  // 外部クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        onMenuStateChange?.(false);
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu, onMenuStateChange]);

  // ウィンドウ幅を監視してハンバーガーモードを切り替え
  useEffect(() => {
    const checkWindowWidth = () => {
      // メニューが必要とする最小幅を計算
      // File(50px) + Edit(50px) + View(50px) + Help(50px) + ウィンドウコントロール(60px) + 余白(40px) = 約300px
      const minWidth = 300;
      const shouldUseHamburger = window.innerWidth < minWidth;
      
      if (shouldUseHamburger !== isHamburgerMode) {
        setIsHamburgerMode(shouldUseHamburger);
        // モード切り替え時にメニューを閉じる
        setActiveMenu(null);
        setShowHamburgerMenu(false);
        onMenuStateChange?.(false);
      }
    };

    // 初期チェック
    checkWindowWidth();

    // リサイズイベントリスナー
    window.addEventListener('resize', checkWindowWidth);
    return () => window.removeEventListener('resize', checkWindowWidth);
  }, [isHamburgerMode, onMenuStateChange]);

  // ハンバーガーメニューの外部クリックを処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowHamburgerMenu(false);
        setActiveSubmenu(null);
        onMenuStateChange?.(false);
      }
    };

    if (showHamburgerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHamburgerMenu, onMenuStateChange]);

  // キーボードイベントハンドラー（Alt+キー、ESC、矢印キー）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Altキーの状態を追跡
      if (event.key === 'Alt') {
        setIsAltPressed(true);
        return;
      }

      // ESCキーでメニューを閉じる
      if (event.key === 'Escape') {
        setActiveMenu(null);
        setIsAltPressed(false);
        setSelectedItemIndex(-1);
        setIsKeyboardNavigation(false);
        onMenuStateChange?.(false);
        return;
      }

      // メニューが開いている時の矢印キーナビゲーション
      if (activeMenu) {
        const currentMenuItems = menus[activeMenu as keyof typeof menus].items;
        const validItems = currentMenuItems.filter(item => !item.separator);

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setIsKeyboardNavigation(true);
          setSelectedItemIndex(prev => {
            const nextIndex = prev + 1;
            return nextIndex >= validItems.length ? 0 : nextIndex;
          });
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setIsKeyboardNavigation(true);
          setSelectedItemIndex(prev => {
            const nextIndex = prev - 1;
            return nextIndex < 0 ? validItems.length - 1 : nextIndex;
          });
          return;
        }

        // 左右矢印キーでメニュー間移動
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          const menuKeys = Object.keys(menus);
          const currentIndex = menuKeys.indexOf(activeMenu);
          let nextIndex;
          
          if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % menuKeys.length;
          } else {
            nextIndex = currentIndex - 1 < 0 ? menuKeys.length - 1 : currentIndex - 1;
          }
          
          setActiveMenu(menuKeys[nextIndex]);
          setSelectedItemIndex(0); // 新しいメニューの最初の項目を選択
          setIsKeyboardNavigation(true);
          return;
        }

        // Enterキーで選択された項目を実行
        if (event.key === 'Enter' && selectedItemIndex >= 0) {
          event.preventDefault();
          const selectedItem = validItems[selectedItemIndex];
          if (selectedItem) {
            selectedItem.action();
            setActiveMenu(null);
            setSelectedItemIndex(-1);
            setIsKeyboardNavigation(false);
            onMenuStateChange?.(false);
          }
          return;
        }
      }

      // Alt + 文字キーでメニューを開く
      if (event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        const menuEntry = Object.entries(menus).find(([, menu]) => 
          menu.accessKey.toLowerCase() === key
        );
        
        if (menuEntry) {
          event.preventDefault();
          event.stopPropagation();
          const [menuKey] = menuEntry;
          setActiveMenu(menuKey);
          setSelectedItemIndex(0); // 最初の項目を選択
          setIsKeyboardNavigation(true);
          onMenuStateChange?.(true);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Altキーが離されたときの処理
      if (event.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    // 最優先でイベントを処理するためtrue（キャプチャフェーズ）で登録
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [activeMenu, selectedItemIndex, onMenuStateChange, menus]);

  const handleMenuClick = (menuKey: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); // Stop propagation to prevent window dragging interference
    }
    
    const newActiveMenu = activeMenu === menuKey ? null : menuKey;
    setActiveMenu(newActiveMenu);
    setSelectedItemIndex(-1); // マウス操作時は選択状態をリセット
    setIsKeyboardNavigation(false);
    onMenuStateChange?.(newActiveMenu !== null);
  };

  const handleMenuItemClick = (action: () => void, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    action();
    setActiveMenu(null);
    setSelectedItemIndex(-1);
    setIsKeyboardNavigation(false);
    onMenuStateChange?.(false);
  };

  // ハンバーガーメニューのクリックハンドラー
  const handleHamburgerClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowHamburgerMenu(!showHamburgerMenu);
    setActiveMenu(null);
    setActiveSubmenu(null);
    onMenuStateChange?.(!showHamburgerMenu);
  };

  // ハンバーガーメニュー内のアイテムクリックハンドラー
  const handleHamburgerItemClick = (action: () => void, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    action();
    setShowHamburgerMenu(false);
    setActiveMenu(null);
    setActiveSubmenu(null);
    onMenuStateChange?.(false);
  };

  // サブメニューのホバーハンドラー
  const handleSubmenuHover = (menuKey: string) => {
    setActiveSubmenu(menuKey);
  };

  const handleSubmenuLeave = () => {
    setActiveSubmenu(null);
  };

  // メニューラベルを表示するヘルパー関数（言語別アクセスキー対応）
  const renderMenuLabel = (label: string, accessKey: string) => {
    // 日本語など、アクセスキーを括弧で表示する必要がある言語
    if (shouldShowAccessKeyInParens) {
      return (
        <span>
          {label}
          <span className="menu-access-key-suffix">({accessKey.toLowerCase()})</span>
        </span>
      );
    }
    
    // 英語など、Alt押下時のみアンダーライン表示
    if (isAltPressed) {
      const accessKeyIndex = label.toLowerCase().indexOf(accessKey.toLowerCase());
      if (accessKeyIndex === -1) {
        return <span>{label}</span>;
      }
      
      return (
        <span>
          {label.slice(0, accessKeyIndex)}
          <span className="menu-access-key menu-access-key--visible">
            {label[accessKeyIndex]}
          </span>
          {label.slice(accessKeyIndex + 1)}
        </span>
      );
    }
    
    return <span>{label}</span>;
  };

  return (
    <div ref={menuRef} className="menu-bar">
      {isHamburgerMode ? (
        // ハンバーガーメニューモード
        <div className="menu-item">
          <button
            className={`menu-button menu-button--hamburger ${showHamburgerMenu ? 'menu-button--active' : ''}`}
            onClick={handleHamburgerClick}
            title={t('menu.menu')}
            data-testid="hamburger-menu"
          >
            <Menu size={16} />
          </button>
          
          {showHamburgerMenu && (
            <div className="side-menu">
              {/* 左側: メイン項目 */}
              <div className="side-menu-main">
                {Object.entries(menus).map(([menuKey, menu]) => (
                  <button
                    key={menuKey}
                    className={`side-menu-item ${activeSubmenu === menuKey ? 'side-menu-item--active' : ''}`}
                    onMouseEnter={() => handleSubmenuHover(menuKey)}
                    onMouseLeave={handleSubmenuLeave}
                    onClick={() => handleSubmenuHover(menuKey)}
                  >
                    <span>{menu.label}</span>
                    <span className="side-menu-arrow">▶</span>
                  </button>
                ))}
              </div>
              
              {/* 右側: サブメニュー */}
              {activeSubmenu && (
                <div 
                  className="side-menu-submenu"
                  style={{
                    top: `${Object.keys(menus).indexOf(activeSubmenu) * 3}rem` // 各項目の高さ分だけオフセット
                  }}
                  onMouseEnter={() => setActiveSubmenu(activeSubmenu)}
                  onMouseLeave={handleSubmenuLeave}
                >
                  {menus[activeSubmenu as keyof typeof menus].items.map((item, index) => {
                    if (item.separator) {
                      return <div key={`${item.id}-${index}`} className="menu-separator" />;
                    }
                    return (
                      <button
                        key={item.id}
                        data-testid={`menu-item-${item.id}`}
                        className="menu-dropdown-item side-menu-subitem"
                        onClick={(e) => handleHamburgerItemClick(item.action, e)}
                      >
                        <span>{item.prefix || ''}{item.label}</span>
                        {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // 通常メニューモード
        Object.entries(menus).map(([key, menu]) => {
          return (
            <div key={key} className="menu-item">
              <button
                data-testid={`menu-${key}`}
                className={`menu-button ${activeMenu === key ? 'menu-button--active' : ''}`}
                onClick={(e) => handleMenuClick(key, e)}
                onMouseEnter={() => {
                  if (activeMenu) {
                    setActiveMenu(key);
                  }
                }}
                title={`${menu.label} (Alt+${menu.accessKey})`}
              >
                {renderMenuLabel(menu.label, menu.accessKey)}
              </button>
            
              {activeMenu === key && (
                <div data-testid={`menu-${key}-dropdown`} className="menu-dropdown">
                  {menu.items.map((item, index) => {
                    if (item.separator) {
                      return <div key={`${item.id}-${index}`} className="menu-separator" />;
                    }

                    // セパレーターを除いた実際のメニュー項目のインデックスを計算
                    const validItems = menu.items.filter(i => !i.separator);
                    const validItemIndex = validItems.findIndex(i => i.id === item.id);
                    const isSelected = isKeyboardNavigation && selectedItemIndex === validItemIndex;

                    return (
                      <button
                        key={item.id}
                        data-testid={`menu-item-${item.id}`}
                        className={`menu-dropdown-item ${isSelected ? 'menu-dropdown-item--selected' : ''}`}
                        onClick={(e) => handleMenuItemClick(item.action, e)}
                        onMouseEnter={() => {
                          // マウスが項目に入ったときはキーボードナビゲーションをリセット
                          if (isKeyboardNavigation) {
                            setIsKeyboardNavigation(false);
                            setSelectedItemIndex(-1);
                          }
                        }}
                      >
                        <span>{item.prefix || ''}{item.label}</span>
                        {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};