import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText, Edit, Eye, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSettings } from '../types/todo';

interface MenuBarProps {
  settings: AppSettings;
  onNewTask: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onShowSettings: () => void;
  onToggleSlim: () => void;
  onToggleTheme: () => void;
  onToggleAlwaysOnTop: () => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
  onImportTasks: () => void;
  onExportTasks: () => void;
  onQuit?: () => void;
  onMenuStateChange?: (isOpen: boolean) => void;
}

interface MenuItemData {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  settings,
  onNewTask,
  onSelectAll,
  onDeleteSelected,
  onShowSettings,
  onToggleSlim,
  onToggleTheme,
  onToggleAlwaysOnTop,
  onShowShortcuts,
  onShowAbout,
  onImportTasks,
  onExportTasks,
  onQuit,
  onMenuStateChange
}) => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー定義
  const menus = {
    file: {
      label: t('menu.file'),
      icon: <FileText size={12} />,
      items: [
        { id: 'new-task', label: t('menu.newTask'), shortcut: 'Ctrl+N', action: onNewTask },
        { id: 'separator-1', separator: true },
        { id: 'import', label: t('menu.importTasks'), action: onImportTasks },
        { id: 'export', label: t('menu.exportTasks'), action: onExportTasks },
        { id: 'separator-2', separator: true },
        ...(onQuit ? [{ id: 'quit', label: t('menu.quit'), shortcut: 'Ctrl+Q', action: onQuit }] : [])
      ] as MenuItemData[]
    },
    edit: {
      label: t('menu.edit'),
      icon: <Edit size={12} />,
      items: [
        { id: 'select-all', label: t('menu.selectAll'), shortcut: 'Ctrl+A', action: onSelectAll },
        { id: 'delete-selected', label: t('menu.deleteSelected'), shortcut: 'Del', action: onDeleteSelected },
        { id: 'separator-1', separator: true },
        { id: 'preferences', label: t('menu.preferences'), shortcut: 'Ctrl+,', action: onShowSettings }
      ] as MenuItemData[]
    },
    view: {
      label: t('menu.view'),
      icon: <Eye size={12} />,
      items: [
        { id: 'toggle-slim', label: settings.detailedMode ? t('menu.enableSlimMode') : t('menu.disableSlimMode'), action: onToggleSlim },
        { id: 'toggle-theme', label: t('menu.toggleTheme'), action: onToggleTheme },
        { id: 'separator-1', separator: true },
        { id: 'always-on-top', label: settings.alwaysOnTop ? t('menu.disableAlwaysOnTop') : t('menu.enableAlwaysOnTop'), action: onToggleAlwaysOnTop }
      ] as MenuItemData[]
    },
    help: {
      label: t('menu.help'),
      icon: <HelpCircle size={12} />,
      items: [
        { id: 'shortcuts', label: t('menu.keyboardShortcuts'), shortcut: 'Ctrl+K Ctrl+S', action: onShowShortcuts },
        { id: 'separator-1', separator: true },
        { id: 'about', label: t('menu.about'), action: onShowAbout }
      ] as MenuItemData[]
    }
  };

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

  // ESCキーでメニューを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
        onMenuStateChange?.(false);
      }
    };

    if (activeMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [activeMenu, onMenuStateChange]);

  const handleMenuClick = (menuKey: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const newActiveMenu = activeMenu === menuKey ? null : menuKey;
    setActiveMenu(newActiveMenu);
    onMenuStateChange?.(newActiveMenu !== null);
  };

  const handleMenuItemClick = (action: () => void, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    action();
    setActiveMenu(null);
    onMenuStateChange?.(false);
  };

  return (
    <div ref={menuRef} className="menu-bar">
      {Object.entries(menus).map(([key, menu]) => (
        <div key={key} className="menu-item">
          <button
            className={`menu-button ${activeMenu === key ? 'menu-button--active' : ''}`}
            onClick={(e) => handleMenuClick(key, e)}
            onMouseEnter={() => activeMenu && setActiveMenu(key)}
          >
            {menu.icon}
            <span>{menu.label}</span>
            <ChevronDown size={10} />
          </button>
          
          {activeMenu === key && (
            <div className="menu-dropdown">
              {menu.items.map((item, index) => 
                item.separator ? (
                  <div key={`${item.id}-${index}`} className="menu-separator" />
                ) : (
                  <button
                    key={item.id}
                    className="menu-dropdown-item"
                    onClick={(e) => handleMenuItemClick(item.action, e)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};