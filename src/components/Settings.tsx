import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Monitor, Palette, Server, List, Moon, FileText, Download, Upload, RotateCcw, Shield } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppSettings, Todo } from '../types/todo';
import { DataManager } from './DataManager';
import { configManager } from '../utils/configManager';

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
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleAlwaysOnTopChange = async (alwaysOnTop: boolean) => {
    // 現在の状態を保存
    const previousSettings = { ...localSettings };
    
    // まずUIを即座に更新
    const newSettings = { ...localSettings, alwaysOnTop };
    setLocalSettings(newSettings);
    
    try {
      // Tauri環境でのみウィンドウ操作を実行
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        console.log('🔝 Setting always on top:', alwaysOnTop);
        const appWindow = getCurrentWindow();
        
        // 設定前の状態を確認
        try {
          const currentState = await appWindow.isAlwaysOnTop();
          console.log('📊 Current always on top state:', currentState);
        } catch (checkError) {
          console.log('⚠️ Cannot check current always on top state:', checkError);
        }
        
        await appWindow.setAlwaysOnTop(alwaysOnTop);
        
        // 設定後の状態を確認
        try {
          const newState = await appWindow.isAlwaysOnTop();
          console.log('📊 New always on top state:', newState);
          if (newState !== alwaysOnTop) {
            console.warn('⚠️ Always on top state mismatch! Expected:', alwaysOnTop, 'Actual:', newState);
          }
        } catch (checkError) {
          console.log('⚠️ Cannot verify new always on top state:', checkError);
        }
        
        console.log('✅ Always on top set successfully');
      } else {
        console.log('ℹ️ Not in Tauri environment, skipping window operation');
      }
      
      // 成功したら親コンポーネントに通知
      onSettingsChange(newSettings);
    } catch (error) {
      console.error('❌ Failed to set always on top:', error);
      // エラーが発生した場合は状態を元に戻す
      setLocalSettings(previousSettings);
      alert(`Failed to set always on top: ${error}`);
    }
  };


  const handleDetailedModeChange = (detailedMode: boolean) => {
    const newSettings = { ...localSettings, detailedMode };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
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

  // ファイルダウンロード関数（Tauri対応）
  const downloadFile = async (content: string, filename: string, mimeType: string = 'text/plain') => {
    try {
      // Tauri環境の場合、saveFileDialogを使用
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        console.log('🖥️ Detected Tauri environment, using save dialog');
        try {
          // Tauri APIをダイナミックインポート
          console.log('📥 Importing Tauri APIs...');
          // @ts-ignore - Tauri API dynamic import
          const dialog = await import('@tauri-apps/plugin-dialog');
          // @ts-ignore - Tauri API dynamic import
          const fs = await import('@tauri-apps/plugin-fs');
          console.log('📂 Opening file save dialog...');
          // ファイル保存ダイアログを表示
          const filePath = await dialog.save({
            defaultPath: filename,
            filters: [{
              name: 'Text Files',
              extensions: ['toml', 'json', 'csv', 'txt']
            }]
          });
          
          if (filePath) {
            console.log('💾 Writing file to:', filePath);
            await fs.writeTextFile(filePath, content);
            console.log(`✅ File saved via Tauri: ${filePath}`);
            return true;
          } else {
            console.log('⚠️ User cancelled file save dialog');
            return false;
          }
        } catch (tauriError) {
          console.error('❌ Tauri save failed:', tauriError);
          console.error('Error details:', tauriError);
          // Tauriが失敗した場合、標準的な方法にフォールバック
        }
      }
      
      // 標準的なブラウザダウンロード
      console.log('🌐 Using standard browser download');
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log(`✅ Standard download triggered: ${filename}`);
      return true;
    } catch (error) {
      console.error('❌ Download failed:', error);
      return false;
    }
  };

  // 設定ファイル管理
  const handleExportConfig = async () => {
    console.log('🎯 Export config button clicked');
    try {
      console.log('📤 Calling configManager.exportConfig()');
      const tomlContent = await configManager.exportConfig();
      console.log('📋 TOML content generated:', tomlContent);
      
      // まずはダウンロードを試行
      const success = await downloadFile(tomlContent, 'todo-app-config.toml', 'text/plain');
      if (success) {
        console.log('✅ Export completed successfully');
        return;
      }
      
      // ダウンロードに失敗した場合、クリップボードにコピー
      console.log('⚠️ Standard download failed, trying clipboard');
      await navigator.clipboard.writeText(tomlContent);
      alert('設定内容をクリップボードにコピーしました。\nテキストファイルに貼り付けて保存してください。');
      console.log('✅ Content copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to export config:', error);
      alert(`設定のエクスポートに失敗しました。\nエラー: ${error}`);
    }
  };

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 Import config file selected');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📄 File selected:', file.name, 'Size:', file.size);
    try {
      console.log('📖 Reading file content');
      const content = await file.text();
      console.log('📋 File content:', content);
      
      console.log('⚙️ Importing config');
      await configManager.importConfig(content);
      const newSettings = configManager.getAppSettings();
      console.log('🔄 New settings:', newSettings);
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
      alert('設定をインポートしました。');
      console.log('✅ Import completed successfully');
    } catch (error) {
      console.error('❌ Failed to import config:', error);
      alert('設定のインポートに失敗しました。ファイル形式を確認してください。');
    }
    
    // ファイル入力をリセット
    event.target.value = '';
  };

  const handleResetConfig = async () => {
    if (confirm('すべての設定をデフォルトに戻しますか？この操作は元に戻せません。')) {
      try {
        await configManager.resetToDefaults();
        const defaultSettings = configManager.getAppSettings();
        setLocalSettings(defaultSettings);
        onSettingsChange(defaultSettings);
        alert('設定をデフォルトに戻しました。');
      } catch (error) {
        console.error('Failed to reset config:', error);
        alert('設定のリセットに失敗しました。');
      }
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>
            <SettingsIcon size={20} />
            Settings
          </h2>
          <button onClick={onClose} className="settings-close">
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
                type="checkbox"
                checked={localSettings.alwaysOnTop}
                onChange={(e) => handleAlwaysOnTopChange(e.target.checked)}
              />
              <span>Always on Top</span>
            </label>
            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.detailedMode}
                onChange={(e) => handleDetailedModeChange(e.target.checked)}
              />
              <span>
                <List size={14} />
                Detailed Mode (Show descriptions, filters, etc.)
              </span>
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
                  <span>Auto (Follow System)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="darkMode"
                    value="light"
                    checked={localSettings.darkMode === 'light'}
                    onChange={() => handleDarkModeChange('light')}
                  />
                  <span>Light</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="darkMode"
                    value="dark"
                    checked={localSettings.darkMode === 'dark'}
                    onChange={() => handleDarkModeChange('dark')}
                  />
                  <span>Dark</span>
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
              <span>Confirm before deleting tasks</span>
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
              <span>Server URL:</span>
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
              Custom Styling
            </h3>
            <label className="setting-item setting-item--full">
              <span>Custom CSS:</span>
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
                <h4>Export/Import Settings</h4>
                <div className="data-manager-buttons">
                  <button
                    onClick={handleExportConfig}
                    className="data-btn data-btn--export"
                  >
                    <Download size={16} />
                    Export Config (TOML)
                  </button>
                  <label className="data-btn data-btn--import">
                    <Upload size={16} />
                    Import Config
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
              
              <div className="data-manager-section">
                <h4>Reset Settings</h4>
                <div className="data-manager-buttons">
                  <button
                    onClick={handleResetConfig}
                    className="data-btn"
                    style={{ 
                      background: '#ef4444', 
                      borderColor: '#ef4444', 
                      color: 'white' 
                    }}
                  >
                    <RotateCcw size={16} />
                    Reset to Defaults
                  </button>
                </div>
                <p className="data-description">
                  Reset all settings to their default values. This action cannot be undone.
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