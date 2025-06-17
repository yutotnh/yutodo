import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Todo } from '../types/todo';

interface AddTodoFormProps {
  onAdd: (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  slimMode?: boolean;
}

export interface AddTodoFormRef {
  focusInput: () => void;
}

export const AddTodoForm = forwardRef<AddTodoFormRef, AddTodoFormProps>(({ onAdd, slimMode = false }, ref) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    }
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      completed: false,
      priority,
      scheduledFor: scheduledFor?.toISOString() || undefined
    });

    setTitle('');
    setDescription('');
    setPriority(0);
    setScheduledFor(null);
    setIsExpanded(false);
    
    // タスク追加後はフォーカスをリセットしない（他の操作を妨げないため）
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // フォーム内のEnterキーのみを処理し、外部への伝播を防ぐ
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-todo-form" onKeyDown={handleKeyDown}>
      <div className="add-todo-input-group">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new task (supports Markdown)..."
          className="add-todo-input"
          onFocus={() => !slimMode && setIsExpanded(true)}
        />
        <button type="submit" className="add-todo-btn" disabled={!title.trim()}>
          <Plus size={20} />
        </button>
      </div>

      {isExpanded && !slimMode && (
        <div className="add-todo-expanded">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (supports Markdown)..."
            className="add-todo-description"
            rows={3}
          />
          
          <div className="add-todo-options">
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="add-todo-priority"
            >
              <option value={0}>Low Priority</option>
              <option value={1}>Medium Priority</option>
              <option value={2}>High Priority</option>
            </select>
            
            <DatePicker
              selected={scheduledFor}
              onChange={(date: Date | null) => setScheduledFor(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy/MM/dd HH:mm"
              placeholderText={t('tasks.selectDateTime')}
              className="add-todo-schedule"
              isClearable
              shouldCloseOnSelect={false}
              closeOnScroll={true}
              preventOpenOnFocus={false}
              autoComplete="off"
            />
          </div>
          
          <div className="add-todo-actions">
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
              {t('tasks.addTask')}
            </button>
            <button 
              type="button" 
              onClick={() => setIsExpanded(false)}
              className="btn btn--secondary"
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </form>
  );
});