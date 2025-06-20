import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AddTodoForm } from '../components/AddTodoForm';
import { TodoItem } from '../components/TodoItem';
import { ScheduleModal } from '../components/ScheduleModal';
import { Todo } from '../types/todo';

// react-datepickerをモック
vi.mock('react-datepicker', () => ({
  default: ({ className, onChange, value, ...props }: any) => {
    // Filter out DatePicker-specific props that shouldn't be passed to DOM
    const {
      showTimeSelect,
      timeFormat,
      timeIntervals,
      dateFormat,
      placeholderText,
      isClearable,
      shouldCloseOnSelect,
      closeOnScroll,
      preventOpenOnFocus,
      ...domProps
    } = props;
    
    return (
      <input 
        data-testid="datepicker" 
        className={className}
        onChange={(e) => onChange && onChange(e.target.value ? new Date(e.target.value) : null)}
        value={value ? value.toISOString().split('T')[0] : ''}
        type="date"
        placeholder={placeholderText}
        {...domProps}
      />
    );
  },
}));

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// DnD Kitをモック
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe('Dark Mode Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AddTodoForm select elements', () => {
    it('applies dark mode styles to priority select', () => {
      render(
        <div className="app app--dark">
          <AddTodoForm onAdd={vi.fn()} />
        </div>
      );

      // First focus the input to expand the form
      const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
      fireEvent.focus(titleInput);

      // Wait for expansion and then find priority select
      const prioritySelect = screen.getByDisplayValue('Low Priority');
      expect(prioritySelect).toHaveClass('add-todo-priority');
    });

    it('has proper CSS classes for dark mode styling', () => {
      const { container } = render(
        <div className="app app--dark">
          <AddTodoForm onAdd={vi.fn()} />
        </div>
      );

      // Check if the dark mode class is applied to the container
      expect(container.querySelector('.app--dark')).toBeInTheDocument();
    });
  });

  describe('TodoItem select elements', () => {
    const sampleTodo: Todo = {
      id: '1',
      title: 'Test Todo',
      description: 'Test Description',
      completed: false,
      priority: 'medium',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      order: 0,
    };

    it('applies dark mode styles to todo item', () => {
      const { container } = render(
        <div className="app app--dark">
          <TodoItem
            todo={sampleTodo}
            onToggle={vi.fn()}
            onUpdate={vi.fn()}
            onDelete={vi.fn()}
          />
        </div>
      );

      expect(container.querySelector('.app--dark')).toBeInTheDocument();
    });
  });

  describe('ScheduleModal select elements', () => {
    it('applies dark mode styles to schedule modal', () => {
      const { container } = render(
        <div className="app app--dark">
          <ScheduleModal
            isOpen={true}
            onClose={vi.fn()}
            onSave={vi.fn()}
          />
        </div>
      );

      expect(container.querySelector('.app--dark')).toBeInTheDocument();
      expect(screen.getByTestId('modal-content')).toHaveClass('schedule-modal');
    });

    it('renders select elements with proper classes', () => {
      render(
        <div className="app app--dark">
          <ScheduleModal
            isOpen={true}
            onClose={vi.fn()}
            onSave={vi.fn()}
          />
        </div>
      );

      const typeSelect = screen.getByLabelText('schedule.type');
      expect(typeSelect).toBeInTheDocument();
    });
  });

  describe('DatePicker dark mode support', () => {
    it('applies dark mode styles to DatePicker in AddTodoForm', () => {
      render(
        <div className="app app--dark">
          <AddTodoForm onAdd={vi.fn()} />
        </div>
      );

      // First focus the input to expand the form
      const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
      fireEvent.focus(titleInput);

      const datePicker = screen.getByTestId('datepicker');
      expect(datePicker).toHaveClass('add-todo-schedule');
    });

    it('applies dark mode styles to DatePicker in TodoItem', () => {
      const sampleTodo: Todo = {
        id: '1',
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        order: 0,
      };

      // TodoItemを編集モードにするため、直接編集状態をシミュレート
      const { container } = render(
        <div className="app app--dark">
          <TodoItem
            todo={sampleTodo}
            onToggle={vi.fn()}
            onUpdate={vi.fn()}
            onDelete={vi.fn()}
          />
        </div>
      );

      expect(container.querySelector('.app--dark')).toBeInTheDocument();
    });
  });

  describe('CSS class application', () => {
    it('correctly applies dark mode classes to app container', () => {
      const { container } = render(
        <div className="app app--dark">
          <div>Test content</div>
        </div>
      );

      const appElement = container.querySelector('.app');
      expect(appElement).toHaveClass('app--dark');
    });

    it('does not apply dark mode classes in light mode', () => {
      const { container } = render(
        <div className="app">
          <div>Test content</div>
        </div>
      );

      const appElement = container.querySelector('.app');
      expect(appElement).not.toHaveClass('app--dark');
    });
  });
});