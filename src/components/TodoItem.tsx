import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Check, Edit2, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { Todo } from '../types/todo';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (todo: Todo) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean, event?: React.MouseEvent) => void;
  slimMode?: boolean;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onUpdate, onDelete, isSelected = false, onSelect, slimMode = false }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editScheduledFor, setEditScheduledFor] = useState<Date | null>(
    todo.scheduledFor ? new Date(todo.scheduledFor) : null
  );
  const editInputRef = useRef<HTMLInputElement>(null);

  // WSLg環境の検出
  const isWSLg = () => {
    try {
      return typeof window !== 'undefined' && 
             (window as any).__TAURI_INTERNALS__ &&
             navigator.userAgent.includes('Linux');
    } catch {
      return false;
    }
  };

  // URLを外部ブラウザで開く共通ハンドラー
  const handleLinkClick = async (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔗 Link clicked:', href);
    
    if (href) {
      try {
        // Tauri環境でのみopenerプラグインを使用
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          console.log('🖥️ Tauri environment detected, using opener plugin');
          try {
            // まずTauri v2のプラグイン方式を試行
            const opener = await import('@tauri-apps/plugin-opener');
            console.log('📥 Opener plugin imported successfully:', opener);
            console.log('📊 Available methods:', Object.keys(opener));
            
            // openUrlまたはopenを試行
            if (opener.open) {
              console.log('🔧 Using opener.open');
              await opener.open(href);
            } else if (opener.openUrl) {
              console.log('🔧 Using opener.openUrl');
              await opener.openUrl(href);
            } else if (opener.default && opener.default.open) {
              console.log('🔧 Using opener.default.open');
              await opener.default.open(href);
            } else {
              console.log('⚠️ Plugin methods not found');
              throw new Error('No suitable open method found in opener plugin');
            }
            console.log('✅ URL opened successfully via Tauri opener');
            
            // WSLg環境での追加対応
            if (isWSLg()) {
              console.log('🐧 WSLg environment detected');
              try {
                // Tauriのクリップボード機能を使用
                const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
                await writeText(href);
                console.log('📋 URL copied to clipboard using Tauri clipboard');
                alert(`🐧 WSLg Environment\nURL copied to clipboard:\n${href}\n\nPaste in Windows browser (Ctrl+V)`);
              } catch (clipError) {
                console.log('⚠️ Could not copy via Tauri clipboard:', clipError);
                // フォールバック: ユーザーに手動コピーを促す
                alert(`🐧 WSLg Environment\nPlease copy this URL manually:\n${href}`);
              }
            }
          } catch (importError) {
            console.error('❌ Tauri opener import/call failed:', importError);
            throw importError;
          }
        } else {
          // ブラウザ環境では新しいタブで開く
          console.log('🌐 Browser environment, using window.open');
          window.open(href, '_blank', 'noopener,noreferrer');
          console.log('✅ URL opened successfully via window.open');
        }
      } catch (error) {
        console.error('❌ Failed to open URL via primary method:', error);
        console.log('🔄 Trying fallback: window.open');
        try {
          // フォールバック: ブラウザで開く
          window.open(href, '_blank', 'noopener,noreferrer');
          console.log('✅ URL opened successfully via fallback');
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          
          // 最終手段: クリップボードにコピー
          try {
            await navigator.clipboard.writeText(href);
            alert(`Failed to open URL directly. URL copied to clipboard:\n${href}`);
            console.log('📋 URL copied to clipboard as last resort');
          } catch (clipboardError) {
            console.error('❌ Clipboard copy also failed:', clipboardError);
            alert(`Failed to open URL: ${href}\nPlease copy manually.`);
          }
        }
      }
    }
  };

  // Sortable機能
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: todo.id,
    disabled: isEditing // 編集中はドラッグを無効化
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || transform ? 'none' : transition, // ドラッグ中とtransform適用中はtransition無効化
    opacity: isDragging ? 0.8 : 1,
    pointerEvents: isDragging ? 'none' : 'auto', // ドラッグ中はイベント無効化
  };

  // todoが変更された時にeditTitleを同期
  React.useEffect(() => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority);
    setEditScheduledFor(todo.scheduledFor ? new Date(todo.scheduledFor) : null);
  }, [todo]);

  // グローバルな編集開始イベントをリッスン
  React.useEffect(() => {
    const handleStartEdit = (event: CustomEvent) => {
      if (event.detail.todoId === todo.id) {
        setIsEditing(true);
        if (slimMode) {
          setTimeout(() => {
            if (editInputRef.current) {
              editInputRef.current.focus();
              const length = editInputRef.current.value.length;
              editInputRef.current.setSelectionRange(length, length);
            }
          }, 0);
        }
      }
    };

    document.addEventListener('startEdit', handleStartEdit as EventListener);
    return () => {
      document.removeEventListener('startEdit', handleStartEdit as EventListener);
    };
  }, [todo.id, slimMode]);

  const handleSave = () => {
    onUpdate({
      ...todo,
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      scheduledFor: editScheduledFor?.toISOString() || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority);
    setEditScheduledFor(
      todo.scheduledFor ? new Date(todo.scheduledFor) : null
    );
    setIsEditing(false);
  };

  // スリムモード用の簡単な保存（タイトルのみ）
  const handleSlimSave = () => {
    onUpdate({
      ...todo,
      title: editTitle
    });
    setIsEditing(false);
  };

  // ダブルクリックハンドラ（全モード対応）
  const handleTitleDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isEditing) {
      e.preventDefault(); // デフォルト動作を停止
      e.stopPropagation(); // 親のクリックイベントを停止
      
      // クリック位置を計算
      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      setIsEditing(true);
      
      // 選択状態をクリア（編集開始時は選択を解除）
      onSelect?.(todo.id, false, e);
      
      // 少し遅延してフォーカス（レンダリング後）
      setTimeout(() => {
        if (editInputRef.current) {
          editInputRef.current.focus();
          
          // テキストの幅を測定してクリック位置に対応する文字位置を計算
          const text = editInputRef.current.value;
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            // 入力フィールドと同じフォントスタイルを適用
            const computedStyle = window.getComputedStyle(editInputRef.current);
            context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
            
            let charIndex = 0;
            for (let i = 0; i <= text.length; i++) {
              const textWidth = context.measureText(text.substring(0, i)).width;
              if (textWidth > clickX) {
                charIndex = Math.max(0, i - 1);
                break;
              }
              charIndex = i;
            }
            
            editInputRef.current.setSelectionRange(charIndex, charIndex);
          } else {
            // フォールバック: 最後に配置
            const length = editInputRef.current.value.length;
            editInputRef.current.setSelectionRange(length, length);
          }
        }
      }, 0);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 2: return 'text-red-500';
      case 1: return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 2: return 'High';
      case 1: return 'Medium';
      default: return 'Low';
    }
  };

  const isOverdue = todo.scheduledFor && new Date(todo.scheduledFor) < new Date() && !todo.completed;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEditing) return;
    
    switch (event.key) {
      case ' ':
        event.preventDefault();
        onToggle(todo.id);
        break;
      case 'e':
        event.preventDefault();
        setIsEditing(true);
        // スリムモードでのキーボード編集開始時はフォーカスとカーソル位置設定
        if (slimMode) {
          setTimeout(() => {
            if (editInputRef.current) {
              editInputRef.current.focus();
              const length = editInputRef.current.value.length;
              editInputRef.current.setSelectionRange(length, length);
            }
          }, 0);
        }
        break;
      case 'F2':
        event.preventDefault();
        if (slimMode) {
          setIsEditing(true);
          // F2での編集開始時はフォーカスとカーソル位置設定
          setTimeout(() => {
            if (editInputRef.current) {
              editInputRef.current.focus();
              const length = editInputRef.current.value.length;
              editInputRef.current.setSelectionRange(length, length);
            }
          }, 0);
        }
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        onDelete(todo.id);
        break;
    }
  };

  // スリムモード編集時のキー処理
  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation(); // イベントの伝播を停止
    if (event.key === 'Escape') {
      event.preventDefault();
      setEditTitle(todo.title); // 元のタイトルに戻す
      setIsEditing(false);
    }
  };

  // フォーカスが外れた時の処理
  const handleEditBlur = () => {
    // ESCキーでのキャンセル以外の場合のみ保存
    if (isEditing) {
      handleSlimSave();
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    // ダブルクリックの場合は選択処理をスキップ
    if (event.detail === 2) {
      return;
    }

    // クリック可能な要素（チェックボックス、編集ボタン、削除ボタン等）をクリックした場合は選択処理をスキップ
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      // 修飾キーがある場合は選択状態をトグル
      onSelect?.(todo.id, !isSelected, event);
    } else {
      // 通常クリックの場合も選択処理を呼び出し（単一選択として扱われる）
      onSelect?.(todo.id, !isSelected, event);
    }
  };

  // スリムモードでない場合のみ詳細編集画面を表示
  if (isEditing && !slimMode) {
    return (
      <div className="todo-item todo-item--editing">
        <div className="todo-edit-form">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="todo-edit-title"
            placeholder="Task title..."
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="todo-edit-description"
            placeholder="Description (supports Markdown)..."
            rows={3}
          />
          <div className="todo-edit-meta">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(Number(e.target.value))}
              className="todo-edit-priority"
            >
              <option value={0}>Low Priority</option>
              <option value={1}>Medium Priority</option>
              <option value={2}>High Priority</option>
            </select>
            <DatePicker
              selected={editScheduledFor}
              onChange={(date: Date | null) => setEditScheduledFor(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy/MM/dd HH:mm"
              placeholderText={t('tasks.selectDateTime')}
              className="todo-edit-schedule"
              isClearable
            />
          </div>
          <div className="todo-edit-actions">
            <button onClick={handleSave} className="btn btn--primary">{t('buttons.save')}</button>
            <button onClick={handleCancel} className="btn btn--secondary">{t('buttons.cancel')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`todo-item ${todo.completed ? 'todo-item--completed' : ''} ${isOverdue ? 'todo-item--overdue' : ''} ${isSelected ? 'todo-item--selected' : ''}`}
      data-dragging={isDragging}
      onClick={handleClick}
      {...attributes}
      {...(!isEditing ? listeners : {})} // 編集中でない場合のみドラッグリスナーを適用
    >
      <div className="todo-item__check">
        <button
          onClick={() => onToggle(todo.id)}
          className={`check-btn ${todo.completed ? 'check-btn--checked' : ''}`}
        >
          {todo.completed && <Check size={16} />}
        </button>
      </div>
      
      <div className="todo-item__content">
        {isEditing && slimMode ? (
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            className="todo-item__title-edit"
            autoFocus
          />
        ) : (
          <div 
            className="todo-item__title" 
            onDoubleClick={handleTitleDoubleClick}
            style={{ cursor: 'pointer' }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // タイトル内では段落要素を使用せずインライン要素として表示
                p: ({ children }) => <span>{children}</span>,
                // 見出し要素もspanとして表示
                h1: ({ children }) => <span className="markdown-h1">{children}</span>,
                h2: ({ children }) => <span className="markdown-h2">{children}</span>,
                h3: ({ children }) => <span className="markdown-h3">{children}</span>,
                h4: ({ children }) => <span className="markdown-h4">{children}</span>,
                h5: ({ children }) => <span className="markdown-h5">{children}</span>,
                h6: ({ children }) => <span className="markdown-h6">{children}</span>,
                // 改行を削除してインライン表示にする
                br: () => null,
                // リンクをクリックでブラウザで開く
                a: ({ href, children }) => (
                  <a
                    href={href}
                    onClick={(e) => handleLinkClick(e, href || '')}
                    onContextMenu={async (e) => {
                      // 右クリックでURLをクリップボードにコピー
                      e.preventDefault();
                      e.stopPropagation();
                      if (href) {
                        try {
                          // Tauri環境ではTauriクリップボードを使用
                          if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                            const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
                            await writeText(href);
                            console.log('📋 URL copied to clipboard via Tauri (right-click):', href);
                            alert(`📋 URL copied to clipboard:\n${href}`);
                          } else {
                            await navigator.clipboard.writeText(href);
                            console.log('📋 URL copied to clipboard via browser (right-click):', href);
                          }
                        } catch (error) {
                          console.error('Failed to copy URL to clipboard:', error);
                          alert(`Failed to copy URL. Please copy manually:\n${href}`);
                        }
                      }
                    }}
                    title={`Click to open: ${href} | Right-click to copy`}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {todo.title}
            </ReactMarkdown>
          </div>
        )}
        {todo.description && (
          <div className="todo-item__description">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // リンクをクリックでブラウザで開く
                a: ({ href, children }) => (
                  <a
                    href={href}
                    onClick={(e) => handleLinkClick(e, href || '')}
                    onContextMenu={async (e) => {
                      // 右クリックでURLをクリップボードにコピー
                      e.preventDefault();
                      e.stopPropagation();
                      if (href) {
                        try {
                          // Tauri環境ではTauriクリップボードを使用
                          if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                            const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
                            await writeText(href);
                            console.log('📋 URL copied to clipboard via Tauri (right-click):', href);
                            alert(`📋 URL copied to clipboard:\n${href}`);
                          } else {
                            await navigator.clipboard.writeText(href);
                            console.log('📋 URL copied to clipboard via browser (right-click):', href);
                          }
                        } catch (error) {
                          console.error('Failed to copy URL to clipboard:', error);
                          alert(`Failed to copy URL. Please copy manually:\n${href}`);
                        }
                      }
                    }}
                    title={`Click to open: ${href} | Right-click to copy`}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {todo.description}
            </ReactMarkdown>
          </div>
        )}
        
        <div className="todo-item__meta">
          <span className={`priority-badge ${getPriorityColor(todo.priority)}`}>
            <AlertCircle size={12} />
            {getPriorityText(todo.priority)}
          </span>
          
          {todo.scheduledFor && (
            <span className={`schedule-badge ${isOverdue ? 'schedule-badge--overdue' : ''}`}>
              <Clock size={12} />
              {new Date(todo.scheduledFor).toLocaleString()}
            </span>
          )}
        </div>
      </div>
      
      <div className="todo-item__actions">
        {!slimMode && (
          <button
            onClick={() => setIsEditing(true)}
            className="action-btn action-btn--edit"
          >
            <Edit2 size={16} />
          </button>
        )}
        <button
          onClick={() => onDelete(todo.id)}
          className="action-btn action-btn--delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};