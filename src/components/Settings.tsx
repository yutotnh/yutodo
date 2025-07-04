import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, Monitor, Palette, Server, List, Moon, FileText, Shield, Globe, ExternalLink, Keyboard, Pin, PinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSettings, Todo } from '../types/todo';
import { DataManager } from './DataManager';
import { supportedLanguages } from '../i18n';
import { useWindowDrag } from '../hooks/useWindowDrag';
import { useFileSettings, fileSettingsToAppSettings, appSettingsToFileSettings } from '../hooks/useFileSettings';
import { SettingsErrorBanner } from './SettingsErrorBanner';
import logger from '../utils/logger';

interface SettingsProps {
  settings: AppSettings;
  sessionAlwaysOnTop: boolean;
  onSettingsChange: (settings: AppSettings) => void;
  onSessionAlwaysOnTopChange: (alwaysOnTop: boolean) => void;
  onClose: () => void;
  todos?: Todo[];
  onImportTodos?: (todos: Todo[]) => void;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts?: number;
}

type SettingsTab = 'general' | 'appearance' | 'server' | 'data' | 'keybindings';

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  sessionAlwaysOnTop,
  onSettingsChange, 
  onSessionAlwaysOnTopChange,
  onClose, 
  todos = [], 
  onImportTodos, 
  connectionStatus = 'disconnected', 
  reconnectAttempts = 0 
}) => {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  
  // File-based settings hook
  const {
    settings: fileSettings,
    keybindings,
    settingsErrors,
    copiedToClipboard,
    updateSettings: updateFileSettings,
    openSettingsFile,
    openKeybindingsFile,
    clearError
  } = useFileSettings();
  
  // Window drag functionality
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();

  // Sync file settings with local settings
  useEffect(() => {
    if (fileSettings) {
      const appSettings = fileSettingsToAppSettings(fileSettings);
      setLocalSettings(prev => ({ ...prev, ...appSettings }));
    }
  }, [fileSettings]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) {
        // Don't close if clicking on app header
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

  // Handle Escape key
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

  const handleSettingChange = async (key: keyof AppSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    // Update file settings if available
    if (fileSettings) {
      try {
        const fileUpdates = appSettingsToFileSettings({ [key]: value });
        await updateFileSettings(fileUpdates);
      } catch (error) {
        logger.error('Failed to update file settings:', error);
      }
    }
    
    onSettingsChange(newSettings);
  };

  const handleStartupAlwaysOnTopChange = async (startupAlwaysOnTop: boolean) => {
    try {
      // 起動時設定値を変更（設定ファイルに保存される）
      const newSettings = { ...localSettings, startupAlwaysOnTop };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
      logger.debug('Startup always on top setting changed to:', startupAlwaysOnTop);
    } catch (error) {
      logger.error('Failed to change startup always on top setting:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="settings-content">
            {/* Window Settings */}
            <div className="settings-group">
              <h3>
                <Monitor size={16} />
                {t('settings.window.title')}
              </h3>
              
              {/* Startup behavior */}
              <div className="setting-section">
                <div className="setting-section-title">
                  {t('settings.window.startup.title', 'Startup Behavior')}
                </div>
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={localSettings.startupAlwaysOnTop}
                    onChange={(e) => handleStartupAlwaysOnTopChange(e.target.checked)}
                  />
                  <span>{t('settings.window.startup.alwaysOnTop', 'Always on Top on startup')}</span>
                  <small className="setting-description">
                    {t('settings.window.startup.description', 'Window will be pinned on top when app starts')}
                  </small>
                </label>
              </div>
              
              {/* Current session control */}
              <div className="setting-section setting-section--current">
                <div className="current-session-header">
                  <span className="current-session-label">
                    {t('settings.window.session.title', 'Current Session')}
                  </span>
                  <span className={`session-status ${sessionAlwaysOnTop ? 'pinned' : 'unpinned'}`}>
                    {sessionAlwaysOnTop 
                      ? t('settings.window.session.pinned', 'Pinned') 
                      : t('settings.window.session.unpinned', 'Not pinned')
                    }
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => onSessionAlwaysOnTopChange(!sessionAlwaysOnTop)}
                  className={`session-toggle-btn ${sessionAlwaysOnTop ? 'unpin' : 'pin'}`}
                >
                  {sessionAlwaysOnTop ? (
                    <>
                      <PinOff size={16} />
                      {t('settings.window.session.unpin', 'Unpin now')}
                    </>
                  ) : (
                    <>
                      <Pin size={16} />
                      {t('settings.window.session.pin', 'Pin now')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Language Settings */}
            <div className="settings-group">
              <h3>
                <Globe size={16} />
                {t('settings.language.title')}
              </h3>
              <div className="setting-item">
                <select
                  value={localSettings.language || 'auto'}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="setting-select"
                >
                  <option value="auto">{t('settings.language.auto')}</option>
                  {Object.entries(supportedLanguages).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Startup Settings */}
            <div className="settings-group">
              <h3>
                <List size={16} />
                {t('settings.startup.title')}
              </h3>
              <div className="setting-item">
                <label htmlFor="startup-view">{t('settings.startup.defaultView')}</label>
                <select
                  id="startup-view"
                  value={localSettings.startupView}
                  onChange={(e) => handleSettingChange('startupView', e.target.value)}
                  className="setting-select"
                >
                  <option value="tasks-detailed">{t('settings.startup.viewOptions.tasks-detailed')}</option>
                  <option value="tasks-simple">{t('settings.startup.viewOptions.tasks-simple')}</option>
                  <option value="schedules">{t('settings.startup.viewOptions.schedules')}</option>
                </select>
              </div>
            </div>

            {/* Delete Confirmation */}
            <div className="settings-group">
              <h3>
                <Shield size={16} />
                {t('settings.behavior.title')}
              </h3>
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={localSettings.confirmDelete}
                  onChange={(e) => handleSettingChange('confirmDelete', e.target.checked)}
                />
                <span>{t('settings.behavior.confirmDelete')}</span>
              </label>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-content">
            <div className="settings-group">
              <h3>
                <Palette size={16} />
                {t('settings.theme.title')}
              </h3>
              <div className="theme-options">
                <label className={`theme-option ${localSettings.darkMode === 'auto' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    value="auto"
                    checked={localSettings.darkMode === 'auto'}
                    onChange={(e) => handleSettingChange('darkMode', e.target.value)}
                  />
                  <Monitor size={20} />
                  <span>{t('settings.theme.auto')}</span>
                </label>
                <label className={`theme-option ${localSettings.darkMode === 'light' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={localSettings.darkMode === 'light'}
                    onChange={(e) => handleSettingChange('darkMode', e.target.value)}
                  />
                  <Monitor size={20} />
                  <span>{t('settings.theme.light')}</span>
                </label>
                <label className={`theme-option ${localSettings.darkMode === 'dark' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={localSettings.darkMode === 'dark'}
                    onChange={(e) => handleSettingChange('darkMode', e.target.value)}
                  />
                  <Moon size={20} />
                  <span>{t('settings.theme.dark')}</span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h3>
                <FileText size={16} />
                {t('settings.appearance.customCss')}
              </h3>
              <textarea
                className="custom-css-textarea"
                placeholder={t('settings.appearance.customCssPlaceholder')}
                value={localSettings.customCss || ''}
                onChange={(e) => handleSettingChange('customCss', e.target.value)}
                rows={10}
              />
            </div>
          </div>
        );

      case 'server':
        return (
          <div className="settings-content">
            <div className="settings-group">
              <h3>
                <Server size={16} />
                {t('settings.server.title')}
              </h3>
              <div className="setting-item">
                <label>{t('settings.server.url')}</label>
                <input
                  type="text"
                  className="server-url-input"
                  value={localSettings.serverUrl}
                  onChange={(e) => handleSettingChange('serverUrl', e.target.value)}
                  placeholder="http://localhost:3001"
                />
              </div>
              <div className="server-status">
                <span className={`status-indicator ${connectionStatus}`}></span>
                <span>{t(`settings.server.status.${connectionStatus}`)}</span>
                {reconnectAttempts > 0 && (
                  <span className="reconnect-info">
                    ({t('settings.server.reconnectAttempts', { count: reconnectAttempts })})
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="settings-content">
            <DataManager
              todos={todos}
              onImport={onImportTodos || (() => {})}
            />
          </div>
        );

      case 'keybindings':
        return (
          <div className="settings-content">
            <div className="settings-group">
              <h3>
                <Keyboard size={16} />
                {t('settings.keybindings.title')}
              </h3>
              
              {fileSettings ? (
                <>
                  {copiedToClipboard && (
                    <div className="copy-success-message">
                      {t('settings.keybindings.pathCopiedToClipboard')}
                    </div>
                  )}
                  <div className="file-settings-info">
                    <p>{t('settings.keybindings.fileBasedDescription')}</p>
                    <div className="file-actions">
                      <button
                        className="file-action-button"
                        onClick={openKeybindingsFile}
                        title={t('settings.keybindings.openFile')}
                      >
                        <ExternalLink size={14} />
                        {t('settings.keybindings.openFile')}
                      </button>
                    </div>
                  </div>
                  
                  <div className="keybindings-list">
                    {keybindings.map((kb, index) => (
                      <div key={index} className="keybinding-item">
                        <span className="keybinding-key">{kb.key}</span>
                        <span className="keybinding-command">{kb.command}</span>
                        {kb.when && (
                          <span className="keybinding-when" title={kb.when}>
                            {t('settings.keybindings.when')}: {kb.when}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="keybindings-legacy">
                  <p>{t('settings.keybindings.legacyDescription')}</p>
                  <p className="keybindings-hint">
                    {t('settings.keybindings.pressForHelp', { key: 'Ctrl+K, Ctrl+S' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-overlay" style={{ pointerEvents: 'none' }}>
      <div 
        className="settings-panel" 
        ref={settingsPanelRef}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="settings-header" onMouseDown={handleHeaderDrag}>
          <h2>
            <SettingsIcon size={20} />
            {t('settings.title')}
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Monitor size={16} />
            {t('settings.tabs.general')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            {t('settings.tabs.appearance')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'server' ? 'active' : ''}`}
            onClick={() => setActiveTab('server')}
          >
            <Server size={16} />
            {t('settings.tabs.server')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <List size={16} />
            {t('settings.tabs.data')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'keybindings' ? 'active' : ''}`}
            onClick={() => setActiveTab('keybindings')}
          >
            <Keyboard size={16} />
            {t('settings.tabs.keybindings')}
          </button>
        </div>
        
        {/* TOML Error Banner */}
        <SettingsErrorBanner
          errors={settingsErrors}
          onDismiss={clearError}
          onOpenFile={async (filePath) => {
            if (filePath.includes('keybindings')) {
              await openKeybindingsFile();
            } else {
              await openSettingsFile();
            }
          }}
        />
        
        <div className="settings-body">
          {renderTabContent()}
        </div>
        
        {fileSettings && (
          <div className="settings-footer">
            <button
              className="settings-file-link"
              onClick={openSettingsFile}
              title={t('settings.openSettingsFile')}
            >
              <ExternalLink size={14} />
              {t('settings.openSettingsFile')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};