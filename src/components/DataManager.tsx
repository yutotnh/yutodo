import React, { useRef } from 'react';
import { Download, Upload, FileText, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Todo } from '../types/todo';


interface DataManagerProps {
  todos: Todo[];
  onImport: (todos: Todo[]) => void;
}

export const DataManager: React.FC<DataManagerProps> = ({ todos, onImport }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルダウンロード関数（Tauri対応）
  const downloadFile = async (content: string, filename: string, mimeType: string) => {
    try {
      // Tauri環境の場合、saveFileDialogを使用
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        console.log('🖥️ Detected Tauri environment, using save dialog');
        try {
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
              name: 'TOML Files',
              extensions: ['toml']
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

  const exportToTOML = async () => {
    console.log('📤 Export to TOML clicked');
    console.log('📋 Todos to export:', todos);
    
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
      
      const filename = `yutodo_tasks_${new Date().toISOString().split('T')[0]}.toml`;
      const success = await downloadFile(finalContent, filename, 'text/plain');
      if (success) {
        console.log('✅ TOML export completed');
        return;
      }
      
      // ダウンロードに失敗した場合、クリップボードにコピー
      console.log('⚠️ Standard download failed, trying clipboard');
      await navigator.clipboard.writeText(finalContent);
      alert(t('dataManager.tomlCopiedToClipboard'));
      console.log('✅ TOML content copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to export TOML:', error);
      alert(t('dataManager.tomlExportFailed', { error }));
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
            onImport(validTodos);
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
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="data-manager">
      <h3 className="data-manager-title">
        <Database size={16} />
        {t('dataManager.title')}
      </h3>
      
      <div className="data-manager-actions">
        <div className="data-manager-section">
          <h4>{t('dataManager.export')}</h4>
          <div className="data-manager-buttons">
            <button
              onClick={exportToTOML}
              className="data-btn data-btn--export"
              disabled={todos.length === 0}
            >
              <FileText size={14} />
              {t('dataManager.export')}
            </button>
          </div>
          <p className="data-description">
            {t('dataManager.saveTasksToFile', { count: todos.length })}
          </p>
        </div>

        <div className="data-manager-section">
          <h4>{t('dataManager.import')}</h4>
          <div className="data-manager-buttons">
            <button
              onClick={triggerFileImport}
              className="data-btn data-btn--import"
            >
              <Upload size={14} />
              {t('dataManager.import')}
            </button>
          </div>
          <p className="data-description">
            {t('dataManager.loadTasksFromToml')}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".toml"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </div>
  );
};