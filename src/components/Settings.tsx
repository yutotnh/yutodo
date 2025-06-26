import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, Monitor, Palette, Server, Moon, FileText, Download, Upload, Shield, Globe } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { AppSettings, Todo } from '../types/todo';
import { DataManager } from './DataManager';
import { supportedLanguages } from '../i18n';
import { useWindowDrag } from '../hooks/useWindowDrag';
import logger from '../utils/logger';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onClose: () => void;
  todos?: Todo[];
  onImportTodos?: (todos: Todo[]) => void;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts?: number;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange, onClose, todos = [], onImportTodos, connectionStatus = 'disconnected', reconnectAttempts = 0 }) => {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  
  // Window drag functionality
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 設定パネル外側クリック検知（タイトルバー除く）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) {
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

  // Escキーで設定を閉じる
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

  const handleAlwaysOnTopChange = async (alwaysOnTop: boolean) => {
    // 現在の状態を保存
    const previousSettings = { ...localSettings };
    
    // まずUIを即座に更新
    const newSettings = { ...localSettings, alwaysOnTop };
    setLocalSettings(newSettings);
    
    try {
      // Tauri環境でのみウィンドウ操作を実行
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        logger.debug('Setting always on top:', alwaysOnTop);
        const appWindow = getCurrentWindow();
        await appWindow.setAlwaysOnTop(alwaysOnTop);
        logger.debug('Always on top set successfully');
      } else {
        logger.debug('Not in Tauri environment, skipping window operation');
      }
      
      // 成功したら親コンポーネントに通知
      onSettingsChange(newSettings);
    } catch (error) {
      logger.error('Failed to set always on top:', error);
      // エラーが発生した場合は状態を元に戻す
      setLocalSettings(previousSettings);
      alert(`Failed to set always on top: ${error}`);
    }
  };


  const handleDarkModeChange = (darkMode: 'auto' | 'light' | 'dark') => {
    const newSettings = { ...localSettings, darkMode };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleCustomCssChange = (customCss: string) => {
    const newSettings = { ...localSettings, customCss };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleServerUrlChange = (serverUrl: string) => {
    const newSettings = { ...localSettings, serverUrl };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleConfirmDeleteChange = (confirmDelete: boolean) => {
    const newSettings = { ...localSettings, confirmDelete };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleLanguageChange = (language: 'auto' | 'en' | 'ja') => {
    const newSettings = { ...localSettings, language };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  // Configuration file management handlers
  const handleExportConfig = () => {
    // Note: Configuration file management is now handled through the file-based settings system
    // This feature could be re-implemented using the SettingsManager if needed
    alert('Configuration export/import is now handled through the file-based settings system. Check your config directory for settings.toml and keybindings.toml files.');
  };

  const handleImportConfig = () => {
    // Note: Configuration file management is now handled through the file-based settings system  
    // This feature could be re-implemented using the SettingsManager if needed
    alert('Configuration export/import is now handled through the file-based settings system. You can manually edit settings.toml and keybindings.toml files in your config directory.');
  };

  // 設定ファイル管理は useFileSettings フックで実装されています

  return (
    <div className="settings-overlay">
      <div data-testid="settings-modal" className="settings-panel" ref={settingsPanelRef}>
        <div className="settings-header" onMouseDown={handleHeaderDrag}>
          <h2>
            <SettingsIcon size={20} />
            {t('settings.title')}
          </h2>
          <button data-testid="settings-close" onClick={onClose} className="settings-close">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>
              <Monitor size={16} />
              Window Options
            </h3>
            <label className="setting-item">
              <input
                data-testid="always-on-top-toggle"
                type="checkbox"
                checked={localSettings.alwaysOnTop}
                onChange={(e) => handleAlwaysOnTopChange(e.target.checked)}
              />
              <span>{t('settings.alwaysOnTop')}</span>
            </label>
            <div className="setting-item setting-item--full">
              <span>
                <Moon size={14} />
                Theme
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="darkMode"
                    value="auto"
                    checked={localSettings.darkMode === 'auto'}
                    onChange={() => handleDarkModeChange('auto')}
                  />
                  <span>{t('settings.auto')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="darkMode"
                    value="light"
                    checked={localSettings.darkMode === 'light'}
                    onChange={() => handleDarkModeChange('light')}
                  />
                  <span>{t('settings.light')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="darkMode"
                    value="dark"
                    checked={localSettings.darkMode === 'dark'}
                    onChange={() => handleDarkModeChange('dark')}
                  />
                  <span>{t('settings.dark')}</span>
                </label>
              </div>
            </div>
            
            <div className="setting-item setting-item--full">
              <span>
                <Globe size={14} />
                Language
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="language"
                    value="auto"
                    checked={localSettings.language === 'auto'}
                    onChange={() => handleLanguageChange('auto')}
                  />
                  <span>{t('settings.auto')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={localSettings.language === 'en'}
                    onChange={() => handleLanguageChange('en')}
                  />
                  <span>{supportedLanguages.en}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="language"
                    value="ja"
                    checked={localSettings.language === 'ja'}
                    onChange={() => handleLanguageChange('ja')}
                  />
                  <span>{supportedLanguages.ja}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <Shield size={16} />
              Behavior Settings
            </h3>
            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.confirmDelete}
                onChange={(e) => handleConfirmDeleteChange(e.target.checked)}
              />
              <span>{t('settings.confirmDelete')}</span>
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <Server size={16} />
              Server Connection
            </h3>
            <div className="setting-item setting-item--full">
              <span>Connection Status:</span>
              <div className="connection-status-info">
                <span className={`status-indicator status-${connectionStatus}`}>
                  {connectionStatus === 'connected' && '● Connected'}
                  {connectionStatus === 'connecting' && `○ Connecting${reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}`}
                  {connectionStatus === 'disconnected' && '× Disconnected'}
                  {connectionStatus === 'error' && '! Connection Error'}
                </span>
              </div>
            </div>
            <label className="setting-item setting-item--full">
              <span>{t('settings.server.url')}:</span>
              <input
                type="text"
                value={localSettings.serverUrl}
                onChange={(e) => handleServerUrlChange(e.target.value)}
                placeholder="http://localhost:3001"
                className="server-url-input"
              />
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <Palette size={16} />
              {t('settings.customCss')}
            </h3>
            <label className="setting-item setting-item--full">
              <span>{t('settings.customCss')}:</span>
              <textarea
                value={localSettings.customCss}
                onChange={(e) => handleCustomCssChange(e.target.value)}
                placeholder="/* Add your custom CSS here */&#10;.todo-item { background: #f0f0f0; }"
                className="custom-css-textarea"
                rows={8}
              />
            </label>
          </div>

          <div className="settings-section">
            <h3>
              <FileText size={16} />
              Configuration File
            </h3>
            <div className="data-manager-actions">
              <div className="data-manager-section">
                <h4>{t('settings.exportSettings')} / {t('settings.importSettings')}</h4>
                <div className="data-manager-buttons">
                  <button
                    onClick={handleExportConfig}
                    className="data-btn data-btn--export"
                  >
                    <Download size={16} />
                    {t('settings.exportSettings')}
                  </button>
                  <label className="data-btn data-btn--import">
                    <Upload size={16} />
                    {t('settings.importSettings')}
                    <input
                      type="file"
                      accept=".toml,.txt"
                      onChange={handleImportConfig}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <p className="data-description">
                  Export your settings as a TOML file or import from a previously exported file.
                </p>
              </div>
              
            </div>
          </div>

          {onImportTodos && (
            <DataManager
              todos={todos}
              onImport={onImportTodos}
            />
          )}
        </div>
      </div>
    </div>
  );
};