import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Check, Edit2, Trash2, Clock, AlertCircle, MoreHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { Todo, Priority } from '../types/todo';
import { getPriorityText, getPriorityClassSuffix } from '../utils/priorityUtils';
import { calculateUrgencyLevel, getUrgencyClassSuffix } from '../utils/dateUtils';
import logger from '../utils/logger';

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
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editScheduledFor, setEditScheduledFor] = useState<Date | null>(
    todo.scheduledFor ? new Date(todo.scheduledFor) : null
  );
  const editInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef(null);

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
    logger.debug("Link clicked:", href);
    
    if (href) {
      try {
        // Tauri環境でのみopenerプラグインを使用
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          logger.debug("Tauri environment detected, using opener plugin");
          try {
            // まずTauri v2のプラグイン方式を試行
            const opener = await import('@tauri-apps/plugin-opener');
            logger.debug("Opener plugin imported successfully");
            // logger.debug("Available methods:", Object.keys(opener));
            
            // 正しいopenメソッドを使用
            logger.debug("Using opener.open");
            await (opener as any).open(href);
            logger.debug("URL opened successfully via Tauri opener");
            
            // WSLg環境での追加対応
            if (isWSLg()) {
              logger.debug("WSLg environment detected");
              try {
                // Tauriのクリップボード機能を使用
                const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
                await writeText(href);
                logger.debug("URL copied to clipboard using Tauri clipboard");
                alert(`🐧 WSLg Environment\nURL copied to clipboard:\n${href}\n\nPaste in Windows browser (Ctrl+V)`);
              } catch (clipError) {
                logger.warn("Could not copy via Tauri clipboard:", clipError);
                // フォールバック: ユーザーに手動コピーを促す
                alert(`🐧 WSLg Environment\nPlease copy this URL manually:\n${href}`);
              }
            }
          } catch (importError) {
            logger.error("Tauri opener import/call failed:", importError);
            throw importError;
          }
        } else {
          // ブラウザ環境では新しいタブで開く
          logger.debug("Browser environment, using window.open");
          window.open(href, '_blank', 'noopener,noreferrer');
          logger.debug("URL opened successfully via window.open");
        }
      } catch (error) {
        logger.error("Failed to open URL via primary method:", error);
        logger.debug("Trying fallback: window.open");
        try {
          // フォールバック: ブラウザで開く
          window.open(href, '_blank', 'noopener,noreferrer');
          logger.debug("URL opened successfully via fallback");
        } catch (fallbackError) {
          logger.error("Fallback also failed:", fallbackError);
          
          // 最終手段: クリップボードにコピー
          try {
            await navigator.clipboard.writeText(href);
            alert(`Failed to open URL directly. URL copied to clipboard:\n${href}`);
            logger.debug("URL copied to clipboard as last resort");
          } catch (clipboardError) {
            logger.error("Clipboard copy also failed:", clipboardError);
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
    disabled: isEditing || isInlineEditing // 編集中はドラッグを無効化
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
        setIsInlineEditing(true);
        setTimeout(() => {
          if (editInputRef.current) {
            editInputRef.current.focus();
            const length = editInputRef.current.value.length;
            editInputRef.current.setSelectionRange(length, length);
          }
        }, 0);
      }
    };

    document.addEventListener('startEdit', handleStartEdit as EventListener);
    return () => {
      document.removeEventListener('startEdit', handleStartEdit as EventListener);
    };
  }, [todo.id]);

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

  const handleCancel = useCallback(() => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority);
    setEditScheduledFor(
      todo.scheduledFor ? new Date(todo.scheduledFor) : null
    );
    setIsEditing(false);
  }, [todo.title, todo.description, todo.priority, todo.scheduledFor]);

  // スリムモード用の簡単な保存（タイトルのみ）
  const handleSlimSave = () => {
    onUpdate({
      ...todo,
      title: editTitle
    });
    setIsInlineEditing(false);
  };

  // ダブルクリックハンドラ（スリムモード専用のインライン編集）
  const handleTitleDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isInlineEditing && slimMode) {
      e.preventDefault(); // デフォルト動作を停止
      e.stopPropagation(); // 親のクリックイベントを停止
      
      // クリック位置を計算
      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      setIsInlineEditing(true);
      
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

  const getPriorityClass = (priority: Priority) => {
    return `schedule-priority-inline schedule-priority--${getPriorityClassSuffix(priority)}`;
  };

  // Calculate urgency level for staged visual indicators
  const urgencyLevel = calculateUrgencyLevel(todo.scheduledFor, todo.completed);
  const urgencyClassSuffix = getUrgencyClassSuffix(urgencyLevel);


  // スリムモード編集時のキー処理
  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation(); // イベントの伝播を停止
    if (event.key === 'Escape') {
      event.preventDefault();
      setEditTitle(todo.title); // 元のタイトルに戻す
      setIsInlineEditing(false);
    }
  };

  // フォーカスが外れた時の処理
  const handleEditBlur = () => {
    // ESCキーでのキャンセル以外の場合のみ保存
    if (isInlineEditing) {
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

  // Escapeキー処理
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEditing) {
        event.preventDefault();
        event.stopPropagation();
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, handleCancel]);

  // ドロップダウンの外側クリック検出
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // メニューボタンやドロップダウンメニュー内のクリックは無視
      if (
        (menuButtonRef.current && (menuButtonRef.current as any).contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      
      // 外側をクリックした場合は閉じる
      setShowDropdown(false);
      setDropdownPosition(null);
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showDropdown]);

  // ドロップダウンメニューの位置を計算
  const calculateDropdownPosition = () => {
    if (!menuButtonRef.current) return null;

    const rect = (menuButtonRef.current as any).getBoundingClientRect();
    const menuWidth = 120; // min-width from CSS
    const menuHeight = 80; // 概算の高さ
    
    let left = rect.right - menuWidth; // 右寄せ
    let top = rect.bottom + 2; // ボタンの下に表示

    // 画面右端を超える場合は左寄せ
    if (left < 0) {
      left = rect.left;
    }

    // 画面下端を超える場合は上に表示
    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 2;
    }

    // 画面上端を超える場合は下に戻す
    if (top < 0) {
      top = rect.bottom + 2;
    }

    return { top, left };
  };

  // ドロップダウンを開く/閉じる
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!showDropdown) {
      const position = calculateDropdownPosition();
      setDropdownPosition(position);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setDropdownPosition(null);
    }
  };

  // モーダル編集画面
  if (isEditing) {
    return (
      <div className="modal-overlay" data-testid="modal-overlay" onClick={(e) => {
        // アプリヘッダー領域（28px + padding = 44px）でのクリックの場合は閉じない
        if (e.clientY <= 44) return;
        handleCancel();
      }}>
        <div className="modal-content todo-edit-modal" data-testid="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{t('tasks.editTask')}</h2>
            <button
              className="modal-close"
              onClick={handleCancel}
              aria-label={t('buttons.close')}
            >
              ×
            </button>
          </div>
          <div className="modal-body">
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
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="todo-edit-priority"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
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
                  shouldCloseOnSelect={false}
                  closeOnScroll={true}
                  preventOpenOnFocus={false}
                  autoComplete="off"
                />
              </div>
              <div className="todo-edit-actions">
                <button onClick={handleSave} className="btn btn--primary">{t('buttons.save')}</button>
                <button onClick={handleCancel} className="btn btn--secondary">{t('buttons.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-testid="todo-item"
      data-todo-id={todo.id}
      ref={setNodeRef}
      style={style}
      className={`todo-item ${todo.completed ? 'todo-item--completed' : ''} ${urgencyClassSuffix ? `todo-item${urgencyClassSuffix}` : ''} ${isSelected ? 'todo-item--selected' : ''}`}
      data-dragging={isDragging}
      onClick={handleClick}
      {...attributes}
      {...(!isEditing && !isInlineEditing ? listeners : {})} // 編集中でない場合のみドラッグリスナーを適用
    >
      <div className="todo-item__check">
        <button
          data-testid="todo-checkbox"
          onClick={() => onToggle(todo.id)}
          className={`check-btn ${todo.completed ? 'check-btn--checked' : ''}`}
        >
          {todo.completed && <Check size={16} />}
        </button>
      </div>
      
      <div className="todo-item__content">
        {isInlineEditing ? (
          <input
            data-testid="todo-edit-input"
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
            data-testid="todo-title"
            className="todo-item__title" 
            onDoubleClick={handleTitleDoubleClick}
            style={{ cursor: slimMode ? 'pointer' : 'default' }}
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
                            logger.debug("URL copied to clipboard via Tauri (right-click):", href);
                            alert(`📋 URL copied to clipboard:\n${href}`);
                          } else {
                            await navigator.clipboard.writeText(href);
                            logger.debug("URL copied to clipboard via browser (right-click):", href);
                          }
                        } catch (error) {
                          logger.error("Failed to copy URL to clipboard:", error);
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
        
        {/* スリムモードでは横並び1行レイアウト */}
        {slimMode ? (
          <div className="todo-item__ultra-compact-meta">
            {/* 優先度アイコン */}
            <div 
              className={`priority-dot priority-dot--${getPriorityClassSuffix(todo.priority)}`} 
              data-testid="todo-priority" 
              title={getPriorityText(todo.priority)}
              style={{
                backgroundColor: todo.priority === 'high' ? '#dc2626' : 
                                todo.priority === 'medium' ? '#f59e0b' : 
                                'transparent'
              }}
            >
              <AlertCircle 
                size={8} 
                style={{ 
                  color: todo.priority === 'low' ? '#94a3b8' : '#ffffff'
                }} 
              />
            </div>
            
            {/* 日時表示 */}
            {todo.scheduledFor && (
              <div className={`schedule-compact ${urgencyClassSuffix ? `schedule-compact${urgencyClassSuffix}` : ''}`}>
                <Clock size={8} />
                <span>
                  {new Date(todo.scheduledFor).toLocaleString(undefined, { 
                    month: 'numeric', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </span>
              </div>
            )}
            
            {/* 説明があることを示すドット */}
            {todo.description && (
              <div className="description-indicator" title={todo.description}>
                ⋯
              </div>
            )}
          </div>
        ) : (
          <>
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
                                logger.debug("URL copied to clipboard via Tauri (right-click):", href);
                                alert(`📋 URL copied to clipboard:\n${href}`);
                              } else {
                                await navigator.clipboard.writeText(href);
                                logger.debug("URL copied to clipboard via browser (right-click):", href);
                              }
                            } catch (error) {
                              logger.error("Failed to copy URL to clipboard:", error);
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
              <span className={getPriorityClass(todo.priority)} data-testid="todo-priority">
                <AlertCircle size={12} style={{ marginRight: '4px' }} />
                {getPriorityText(todo.priority)}
              </span>
              
              {todo.scheduledFor && (
                <span className={`schedule-badge ${urgencyClassSuffix ? `schedule-badge${urgencyClassSuffix}` : ''}`}>
                  <Clock size={12} />
                  {new Date(todo.scheduledFor).toLocaleString(undefined, { 
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="todo-item__actions">
        {slimMode ? (
          // スリムモードではドロップダウンメニュー
          <div className="action-dropdown" ref={dropdownRef}>
            <button
              ref={menuButtonRef}
              onClick={toggleDropdown}
              className="action-btn action-btn--menu"
              title={t('buttons.more')}
            >
              <MoreHorizontal size={12} />
            </button>
          </div>
        ) : (
          // 通常モードでは既存のボタン
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="action-btn action-btn--edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              data-testid="delete-button"
              onClick={() => onDelete(todo.id)}
              className="action-btn action-btn--delete"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      {/* Portal化されたドロップダウンメニュー */}
      {showDropdown && dropdownPosition && (
        <>
          {ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              className="action-dropdown__menu--portal"
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                zIndex: 999999
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setShowDropdown(false);
                  setDropdownPosition(null);
                }}
                className="action-dropdown__item"
              >
                <Edit2 size={14} />
                <span>{t('buttons.edit')}</span>
              </button>
              <button
                data-testid="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(todo.id);
                  setShowDropdown(false);
                  setDropdownPosition(null);
                }}
                className="action-dropdown__item action-dropdown__item--delete"
              >
                <Trash2 size={14} />
                <span>{t('buttons.delete')}</span>
              </button>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};