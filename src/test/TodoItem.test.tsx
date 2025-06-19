import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TodoItem } from '../components/TodoItem';
import { Todo } from '../types/todo';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tasks.selectDateTime': 'Select date/time',
        'buttons.save': 'Save',
        'buttons.cancel': 'Cancel'
      };
      return translations[key] || key;
    }
  })
}));

// Mock Tauri plugins
const mockTauriOpener = {
  open: vi.fn().mockResolvedValue(undefined)
};

const mockTauriClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@tauri-apps/plugin-opener', () => mockTauriOpener);
vi.mock('@tauri-apps/plugin-clipboard-manager', () => mockTauriClipboard);

// Mock react-datepicker
vi.mock('react-datepicker', () => ({
  default: ({ selected, onChange, className, placeholderText }: any) => (
    <input
      type="datetime-local"
      value={selected ? selected.toISOString().slice(0, 16) : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      className={className}
      placeholder={placeholderText}
      data-testid="date-picker"
    />
  )
}));

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: vi.fn()
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children, components }: any) => {
    // Simple markdown simulation for testing
    if (typeof children === 'string') {
      // Handle links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      if (linkRegex.test(children)) {
        const parts = children.split(linkRegex);
        return (
          <div data-testid="markdown-content">
            {parts.map((part: string, index: number) => {
              if (index % 3 === 1) {
                // Link text
                const href = parts[index + 1];
                const LinkComponent = components?.a || 'a';
                return <LinkComponent key={index} href={href}>{part}</LinkComponent>;
              } else if (index % 3 === 2) {
                // Link URL - skip
                return null;
              } else {
                // Regular text
                return part;
              }
            })}
          </div>
        );
      }
    }
    return <div data-testid="markdown-content">{children}</div>;
  }
}));

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: () => {}
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: ({ size }: { size?: number }) => <span data-testid="check-icon" data-size={size}>✓</span>,
  Edit2: ({ size }: { size?: number }) => <span data-testid="edit-icon" data-size={size}>✎</span>,
  Trash2: ({ size }: { size?: number }) => <span data-testid="trash-icon" data-size={size}>🗑</span>,
  Clock: ({ size }: { size?: number }) => <span data-testid="clock-icon" data-size={size}>🕐</span>,
  AlertCircle: ({ size }: { size?: number }) => <span data-testid="alert-icon" data-size={size}>⚠</span>,
}));

// Helper component to wrap TodoItem with DndKit context
const TodoItemWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext onDragEnd={() => {}}>
    <SortableContext items={['test-id']} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  </DndContext>
);

describe('TodoItem', () => {
  const mockTodo: Todo = {
    id: 'test-id',
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    priority: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  const mockHandlers = {
    onToggle: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global mocks
    if ((global.window as any).__TAURI_INTERNALS__) {
      (global.window as any).__TAURI_INTERNALS__ = undefined;
    }
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render todo item with title and description', () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should render without description when not provided', () => {
      const todoWithoutDescription = { ...mockTodo, description: undefined };
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithoutDescription} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    });

    it('should show completion status', () => {
      const completedTodo = { ...mockTodo, completed: true };
      render(
        <TodoItemWrapper>
          <TodoItem todo={completedTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should show priority badge', () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should show scheduled date when provided', () => {
      const scheduledTodo = {
        ...mockTodo,
        scheduledFor: '2023-12-25T10:00:00.000Z'
      };
      render(
        <TodoItemWrapper>
          <TodoItem todo={scheduledTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should show edit and delete buttons in full mode', () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={false} />
        </TodoItemWrapper>
      );

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should show both edit and delete buttons in slim mode', () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should display priority and date in slim mode with small text', () => {
      const todoWithDetails = {
        ...mockTodo,
        priority: 2,
        scheduledFor: '2023-12-25T10:00:00.000Z',
        description: 'This is a test description'
      };
      
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithDetails} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      // スリムモード専用のメタ情報が表示されることを確認
      const slimMeta = document.querySelector('.todo-item__slim-meta');
      expect(slimMeta).toBeInTheDocument();
      
      // 優先度が小さく表示されることを確認
      expect(screen.getByText('High')).toBeInTheDocument();
      
      // 日付が簡潔に表示されることを確認
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      
      // 詳細が小さく表示されることを確認
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should not show slim mode details when not in slim mode', () => {
      const todoWithDetails = {
        ...mockTodo,
        priority: 2,
        scheduledFor: '2023-12-25T10:00:00.000Z',
        description: 'This is a test description'
      };
      
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithDetails} {...mockHandlers} slimMode={false} />
        </TodoItemWrapper>
      );

      // スリムモード専用のメタ情報が表示されないことを確認
      const slimMeta = document.querySelector('.todo-item__slim-meta');
      expect(slimMeta).not.toBeInTheDocument();
      
      // 通常のメタ情報が表示されることを確認
      const normalMeta = document.querySelector('.todo-item__meta');
      expect(normalMeta).toBeInTheDocument();
    });

    it('should show description inline in slim mode', () => {
      const todoWithDescription = {
        ...mockTodo,
        description: 'A very long description that should be truncated in slim mode'
      };
      
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithDescription} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      const slimDescription = document.querySelector('.todo-item__description--slim');
      expect(slimDescription).toBeInTheDocument();
      expect(slimDescription).toHaveTextContent('A very long description that should be truncated in slim mode');
    });
  });

  describe('priority handling', () => {
    it('should display high priority correctly', () => {
      const highPriorityTodo = { ...mockTodo, priority: 2 };
      render(
        <TodoItemWrapper>
          <TodoItem todo={highPriorityTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should display low priority correctly', () => {
      const lowPriorityTodo = { ...mockTodo, priority: 0 };
      render(
        <TodoItemWrapper>
          <TodoItem todo={lowPriorityTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('overdue handling', () => {
    it('should mark task as overdue when scheduled date is in the past', () => {
      const overdueTodo = {
        ...mockTodo,
        scheduledFor: '2020-01-01T00:00:00.000Z',
        completed: false
      };
      
      const { container } = render(
        <TodoItemWrapper>
          <TodoItem todo={overdueTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(container.querySelector('.todo-item--overdue')).toBeInTheDocument();
    });

    it('should not mark completed task as overdue', () => {
      const overdueCompletedTodo = {
        ...mockTodo,
        scheduledFor: '2020-01-01T00:00:00.000Z',
        completed: true
      };
      
      const { container } = render(
        <TodoItemWrapper>
          <TodoItem todo={overdueCompletedTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(container.querySelector('.todo-item--overdue')).not.toBeInTheDocument();
    });
  });

  describe('selection handling', () => {
    it('should show selected state when isSelected is true', () => {
      const { container } = render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} isSelected={true} />
        </TodoItemWrapper>
      );

      expect(container.querySelector('.todo-item--selected')).toBeInTheDocument();
    });

    it('should handle click for selection', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const todoItem = screen.getByText('Test Todo').closest('.todo-item')!;
      await user.click(todoItem);

      expect(mockHandlers.onSelect).toHaveBeenCalledWith('test-id', true, expect.any(Object));
    });

    it('should handle Ctrl+click for multi-selection', async () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const todoItem = screen.getByText('Test Todo').closest('.todo-item')!;
      
      // Simulate the ctrl+click event by manually dispatching a click event with ctrlKey
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        ctrlKey: true,
      });
      todoItem.dispatchEvent(clickEvent);

      expect(mockHandlers.onSelect).toHaveBeenCalled();
    });
  });

  describe('basic interactions', () => {
    it('should handle toggle completion', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      // Find the check button by its class instead of aria label
      const checkButton = document.querySelector('.check-btn');
      expect(checkButton).toBeTruthy();
      await user.click(checkButton!);

      expect(mockHandlers.onToggle).toHaveBeenCalledWith('test-id');
    });

    it('should handle delete', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const deleteButton = screen.getByTestId('trash-icon').closest('button')!;
      await user.click(deleteButton);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith('test-id');
    });

    it('should not trigger selection when clicking on buttons', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const deleteButton = screen.getByTestId('trash-icon').closest('button')!;
      await user.click(deleteButton);

      expect(mockHandlers.onSelect).not.toHaveBeenCalled();
    });
  });

  describe('editing functionality', () => {
    it('should enter edit mode on double click', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      const titleElement = screen.getByText('Test Todo');
      await user.dblClick(titleElement);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument();
      });
    });

    it('should enter edit mode on edit button click (full mode)', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={false} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument();
      });
    });

    it('should save changes in slim mode on blur', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      // Enter edit mode
      const titleElement = screen.getByText('Test Todo');
      await user.dblClick(titleElement);

      const input = await screen.findByDisplayValue('Test Todo');
      await user.clear(input);
      await user.type(input, 'Updated Todo');
      
      // Blur the input to save
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockHandlers.onUpdate).toHaveBeenCalledWith({
          ...mockTodo,
          title: 'Updated Todo'
        });
      });
    });

    it('should cancel edit with Escape key', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      // Enter edit mode
      const titleElement = screen.getByText('Test Todo');
      await user.dblClick(titleElement);

      const input = await screen.findByDisplayValue('Test Todo');
      await user.clear(input);
      await user.type(input, 'Updated Todo');
      
      // Press Escape to cancel
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.getByText('Test Todo')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Updated Todo')).not.toBeInTheDocument();
      });

      expect(mockHandlers.onUpdate).not.toHaveBeenCalled();
    });

    it('should show detailed edit form in full mode', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={false} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Description (supports Markdown)...')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Medium Priority')).toBeInTheDocument();
        expect(screen.getByTestId('date-picker')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should open modal edit form in slim mode', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Description (supports Markdown)...')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Medium Priority')).toBeInTheDocument();
        expect(screen.getByTestId('date-picker')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
      });
    });

    it('should save detailed changes in modal edit', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      // Wait for edit form
      const titleInput = await screen.findByPlaceholderText('Task title...');
      const descriptionInput = screen.getByPlaceholderText('Description (supports Markdown)...');
      const prioritySelect = screen.getByDisplayValue('Medium Priority');

      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Todo');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated Description');
      await user.selectOptions(prioritySelect, '2');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(mockHandlers.onUpdate).toHaveBeenCalledWith({
        ...mockTodo,
        title: 'Updated Todo',
        description: 'Updated Description',
        priority: 2,
        scheduledFor: undefined
      });
    });

    it('should cancel modal edit changes', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      const titleInput = await screen.findByPlaceholderText('Task title...');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Todo');

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('Test Todo')).toBeInTheDocument();
        expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
      });

      expect(mockHandlers.onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('global edit event handling', () => {
    it('should start inline editing when receiving global startEdit event', async () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      // Dispatch global edit event
      const editEvent = new CustomEvent('startEdit', {
        detail: { todoId: 'test-id' }
      });

      act(() => {
        document.dispatchEvent(editEvent);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument();
        // Should be inline edit, not modal
        expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
      });
    });

    it('should not start editing for different todo ID', async () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={true} />
        </TodoItemWrapper>
      );

      const editEvent = new CustomEvent('startEdit', {
        detail: { todoId: 'different-id' }
      });

      act(() => {
        document.dispatchEvent(editEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Todo')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Test Todo')).not.toBeInTheDocument();
      });
    });
  });

  describe('markdown link handling', () => {
    const todoWithLink = {
      ...mockTodo,
      title: 'Check out [Google](https://google.com)',
      description: 'Visit [GitHub](https://github.com) for more info'
    };

    it('should render markdown links in title and description', () => {
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', 'https://google.com');
      expect(links[1]).toHaveAttribute('href', 'https://github.com');
    });

    it('should open links in browser environment', async () => {
      const mockWindowOpen = vi.fn();
      Object.defineProperty(global.window, 'open', {
        value: mockWindowOpen,
        writable: true
      });

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Google' });
      await user.click(link);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://google.com',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should use Tauri opener in Tauri environment', async () => {
      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true
      });

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Google' });
      await user.click(link);

      await waitFor(() => {
        expect(mockTauriOpener.open).toHaveBeenCalledWith('https://google.com');
      });
    });

    it('should copy URL to clipboard on right-click', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Google' });
      
      // Mock navigator.clipboard
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.defineProperty(global.navigator, 'clipboard', {
        value: mockClipboard,
        writable: true
      });

      await user.pointer({ keys: '[MouseRight]', target: link });

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith('https://google.com');
      });
    });

    it('should use Tauri clipboard in Tauri environment for right-click', async () => {
      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true
      });

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Google' });
      await user.pointer({ keys: '[MouseRight]', target: link });

      await waitFor(() => {
        expect(mockTauriClipboard.writeText).toHaveBeenCalledWith('https://google.com');
      });
    });
  });

  describe('WSLg environment handling', () => {
    it('should detect WSLg environment and provide clipboard fallback', async () => {
      // Mock WSLg environment
      Object.defineProperty(global.window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true
      });
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        writable: true
      });

      const todoWithLink = {
        ...mockTodo,
        title: 'Visit [Test](https://test.com)'
      };

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Test' });
      await user.click(link);

      await waitFor(() => {
        expect(mockTauriOpener.open).toHaveBeenCalledWith('https://test.com');
        expect(mockTauriClipboard.writeText).toHaveBeenCalledWith('https://test.com');
      });
    });
  });

  describe('date picker handling', () => {
    it('should update scheduled date in full edit mode', async () => {
      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} slimMode={false} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      const datePicker = await screen.findByTestId('date-picker');
      await user.type(datePicker, '2023-12-25T10:00');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      // The timezone offset causes the hour to be adjusted, so we check for the date part
      expect(mockHandlers.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockTodo,
          scheduledFor: expect.stringContaining('2023-12-25')
        })
      );
    });

    it('should clear scheduled date when date picker is cleared', async () => {
      const scheduledTodo = {
        ...mockTodo,
        scheduledFor: '2023-12-25T10:00:00.000Z'
      };

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={scheduledTodo} {...mockHandlers} slimMode={false} />
        </TodoItemWrapper>
      );

      const editButton = screen.getByTestId('edit-icon').closest('button')!;
      await user.click(editButton);

      const datePicker = await screen.findByTestId('date-picker');
      await user.clear(datePicker);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(mockHandlers.onUpdate).toHaveBeenCalledWith({
        ...scheduledTodo,
        scheduledFor: undefined
      });
    });
  });

  describe('error handling', () => {
    it('should handle link opening errors gracefully', async () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Tauri opener to throw error
      mockTauriOpener.open.mockRejectedValueOnce(new Error('Test error'));
      
      // Mock window.open as fallback
      const mockWindowOpen = vi.fn();
      Object.defineProperty(global.window, 'open', {
        value: mockWindowOpen,
        writable: true
      });

      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true
      });

      const todoWithLink = {
        ...mockTodo,
        title: 'Visit [Test](https://test.com)'
      };

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Test' });
      await user.click(link);

      await waitFor(() => {
        expect(mockTauriOpener.open).toHaveBeenCalled();
        expect(mockWindowOpen).toHaveBeenCalledWith(
          'https://test.com',
          '_blank',
          'noopener,noreferrer'
        );
      });
      
      // Restore console.error
      consoleSpy.mockRestore();
    });

    it('should handle clipboard copy errors gracefully', async () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockAlert = vi.fn();
      Object.defineProperty(global.window, 'alert', {
        value: mockAlert,
        writable: true
      });

      // Mock Tauri clipboard to throw error
      mockTauriClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true
      });

      const todoWithLink = {
        ...mockTodo,
        title: 'Visit [Test](https://test.com)'
      };

      const user = userEvent.setup();
      render(
        <TodoItemWrapper>
          <TodoItem todo={todoWithLink} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const link = screen.getByRole('link', { name: 'Test' });
      
      // Right-click to copy URL
      await user.pointer({ keys: '[MouseRight]', target: link });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to copy URL')
        );
      }, { timeout: 3000 });
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe('prop updates', () => {
    it('should update edit form when todo prop changes', () => {
      const { rerender } = render(
        <TodoItemWrapper>
          <TodoItem todo={mockTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      const updatedTodo = { ...mockTodo, title: 'Updated Title' };
      rerender(
        <TodoItemWrapper>
          <TodoItem todo={updatedTodo} {...mockHandlers} />
        </TodoItemWrapper>
      );

      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });
  });
});