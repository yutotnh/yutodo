import React, { useRef } from 'react';
import { Download, Upload, FileText, Database } from 'lucide-react';
import { Todo } from '../types/todo';

// Tauri環境チェック関数
const isTauriEnvironment = () => {
  try {
    return typeof window !== 'undefined' && 
           (window as any).__TAURI_INTERNALS__ !== undefined;
  } catch {
    return false;
  }
};

interface DataManagerProps {
  todos: Todo[];
  onImport: (todos: Todo[]) => void;
}

export const DataManager: React.FC<DataManagerProps> = ({ todos, onImport }) => {
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
              name: 'Data Files',
              extensions: ['json', 'csv', 'txt']
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

  const exportToJSON = async () => {
    console.log('📤 Export to JSON clicked');
    console.log('📋 Todos to export:', todos);
    const dataStr = JSON.stringify(todos, null, 2);
    console.log('📄 JSON content:', dataStr);
    
    try {
      const filename = `todos_${new Date().toISOString().split('T')[0]}.json`;
      const success = await downloadFile(dataStr, filename, 'application/json');
      if (success) {
        console.log('✅ JSON export completed');
        return;
      }
      
      // ダウンロードに失敗した場合、クリップボードにコピー
      console.log('⚠️ Standard download failed, trying clipboard');
      await navigator.clipboard.writeText(dataStr);
      alert('JSONデータをクリップボードにコピーしました。\nテキストファイルに貼り付けて保存してください。');
      console.log('✅ JSON content copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to export JSON:', error);
      alert(`JSONエクスポートに失敗しました。\nエラー: ${error}`);
    }
  };

  const exportToCSV = async () => {
    console.log('📊 Export to CSV clicked');
    console.log('📋 Todos to export:', todos);
    const headers = ['ID', 'Title', 'Description', 'Completed', 'Priority', 'Scheduled For', 'Created At', 'Updated At'];
    const csvContent = [
      headers.join(','),
      ...todos.map(todo => [
        todo.id,
        `"${todo.title.replace(/"/g, '""')}"`,
        `"${(todo.description || '').replace(/"/g, '""')}"`,
        todo.completed,
        todo.priority,
        todo.scheduledFor || '',
        todo.createdAt,
        todo.updatedAt
      ].join(','))
    ].join('\n');

    console.log('📄 CSV content:', csvContent);
    
    try {
      const filename = `todos_${new Date().toISOString().split('T')[0]}.csv`;
      const success = await downloadFile(csvContent, filename, 'text/csv');
      if (success) {
        console.log('✅ CSV export completed');
        return;
      }
      
      // ダウンロードに失敗した場合、クリップボードにコピー
      console.log('⚠️ Standard download failed, trying clipboard');
      await navigator.clipboard.writeText(csvContent);
      alert('CSVデータをクリップボードにコピーしました。\nテキストファイルに貼り付けて保存してください。');
      console.log('✅ CSV content copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to export CSV:', error);
      alert(`CSVエクスポートに失敗しました。\nエラー: ${error}`);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedTodos = JSON.parse(content);
        
        // 基本的なバリデーション
        if (Array.isArray(importedTodos)) {
          const validTodos = importedTodos.filter((todo: any) => 
            todo && 
            typeof todo.id === 'string' &&
            typeof todo.title === 'string' &&
            typeof todo.completed === 'boolean' &&
            typeof todo.priority === 'number'
          );
          
          if (validTodos.length > 0) {
            onImport(validTodos);
            alert(`${validTodos.length}個のタスクをインポートしました。`);
          } else {
            alert('有効なタスクが見つかりませんでした。');
          }
        } else {
          alert('無効なファイル形式です。');
        }
      } catch (error) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    
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
        データ管理
      </h3>
      
      <div className="data-manager-actions">
        <div className="data-manager-section">
          <h4>エクスポート</h4>
          <div className="data-manager-buttons">
            <button
              onClick={exportToJSON}
              className="data-btn data-btn--export"
              disabled={todos.length === 0}
            >
              <FileText size={14} />
              JSON形式
            </button>
            <button
              onClick={exportToCSV}
              className="data-btn data-btn--export"
              disabled={todos.length === 0}
            >
              <Download size={14} />
              CSV形式
            </button>
          </div>
          <p className="data-description">
            {todos.length}個のタスクをファイルに保存します
          </p>
        </div>

        <div className="data-manager-section">
          <h4>インポート</h4>
          <div className="data-manager-buttons">
            <button
              onClick={triggerFileImport}
              className="data-btn data-btn--import"
            >
              <Upload size={14} />
              JSONファイルを選択
            </button>
          </div>
          <p className="data-description">
            JSONファイルからタスクを読み込みます
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </div>
  );
};