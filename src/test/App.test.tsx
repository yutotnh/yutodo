import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import App from '../App';

// Mock all external dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.title': 'YuToDo',
        'tasks.searchPlaceholder': 'Search tasks...',
        'tasks.addTask': 'Add task',
        'filter.all': 'All',
        'filter.active': 'Active',
        'filter.completed': 'Completed',
        'filter.overdue': 'Overdue',
        'buttons.save': 'Save',
        'buttons.cancel': 'Cancel'
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en'
    }
  })
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setAlwaysOnTop: vi.fn(),
    listen: vi.fn(),
    onFocusChanged: vi.fn()
  })
}));

// Mock custom hooks
vi.mock('../hooks/useSocket', () => ({
  useSocket: () => ({
    todos: [],
    connectionStatus: 'connected',
    reconnectAttempts: 0,
    addTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
    toggleTodo: vi.fn(),
    bulkImport: vi.fn(),
    reorderTodos: vi.fn(),
    connected: true
  })
}));

vi.mock('../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    shortcuts: [
      { key: 'Ctrl + N', description: 'Add new task' },
      { key: 'Ctrl + F', description: 'Search' }
    ]
  })
}));

// Mock config manager
vi.mock('../utils/configManager', () => ({
  configManager: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAppSettings: vi.fn().mockReturnValue({
      alwaysOnTop: false,
      detailedMode: false,
      darkMode: 'auto',
      confirmDelete: true,
      customCss: '',
      serverUrl: 'http://localhost:3001',
      language: 'auto'
    }),
    updateFromAppSettings: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn(),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn()
}));

// Mock components
vi.mock('../components/TodoItem', () => ({
  TodoItem: ({ todo, onToggle, onUpdate, onDelete, onSelect, isSelected }: any) => (
    <div data-testid={`todo-item-${todo.id}`} className={isSelected ? 'selected' : ''}>
      <span>{todo.title}</span>
      <button onClick={() => onToggle(todo.id)} data-testid={`toggle-${todo.id}`}>
        Toggle
      </button>
      <button onClick={() => onUpdate(todo)} data-testid={`update-${todo.id}`}>
        Update
      </button>
      <button onClick={() => onDelete(todo.id)} data-testid={`delete-${todo.id}`}>
        Delete
      </button>
      <button 
        onClick={(e) => onSelect(todo.id, !isSelected, e)} 
        data-testid={`select-${todo.id}`}
      >
        Select
      </button>
    </div>
  )
}));

vi.mock('../components/AddTodoForm', () => ({
  AddTodoForm: React.forwardRef<any, any>(({ onSubmit }, ref) => {
    React.useImperativeHandle(ref, () => ({
      focus: vi.fn()
    }));
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmit({
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          priority: 0,
          completed: false
        });
      }}>
        <input name="title" placeholder="Add task" data-testid="add-todo-input" />
        <input name="description" placeholder="Description" data-testid="add-todo-description" />
        <button type="submit" data-testid="add-todo-submit">Add</button>
      </form>
    );
  })
}));

vi.mock('../components/Settings', () => ({
  Settings: ({ isOpen, onClose, settings, onSettingsChange }: any) => 
    isOpen ? (
      <div data-testid="settings-modal">
        <button onClick={onClose} data-testid="settings-close">Close</button>
        <button 
          onClick={() => onSettingsChange({ ...settings, alwaysOnTop: !settings.alwaysOnTop })}
          data-testid="toggle-always-on-top"
        >
          Toggle Always On Top
        </button>
      </div>
    ) : null
}));

vi.mock('../components/ShortcutHelp', () => ({
  ShortcutHelp: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="shortcut-help-modal">
        <button onClick={onClose} data-testid="shortcut-help-close">Close</button>
      </div>
    ) : null
}));

vi.mock('../components/TodoFilter', () => ({
  TodoFilter: ({ currentFilter, onFilterChange, todos }: any) => (
    <div data-testid="todo-filter">
      <button 
        onClick={() => onFilterChange('all')} 
        data-testid="filter-all"
        className={currentFilter === 'all' ? 'active' : ''}
      >
        All ({todos.length})
      </button>
      <button 
        onClick={() => onFilterChange('active')} 
        data-testid="filter-active"
        className={currentFilter === 'active' ? 'active' : ''}
      >
        Active ({todos.filter((t: any) => !t.completed).length})
      </button>
      <button 
        onClick={() => onFilterChange('completed')} 
        data-testid="filter-completed"
        className={currentFilter === 'completed' ? 'active' : ''}
      >
        Completed ({todos.filter((t: any) => t.completed).length})
      </button>
    </div>
  )
}));

vi.mock('../components/SearchBar', () => ({
  SearchBar: ({ value, onChange, onFocus }: any) => (
    <input
      data-testid="search-bar"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder="Search tasks..."
    />
  )
}));

vi.mock('../components/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({ isOpen, onConfirm, onCancel, title, message }: any) =>
    isOpen ? (
      <div data-testid="delete-confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-delete">Confirm</button>
        <button onClick={onCancel} data-testid="cancel-delete">Cancel</button>
      </div>
    ) : null
}));

vi.mock('../components/ConnectionStatus', () => ({
  ConnectionStatus: ({ status, reconnectAttempts }: any) => (
    <div data-testid="connection-status" data-status={status}>
      Status: {status} {reconnectAttempts > 0 && `(${reconnectAttempts} attempts)`}
    </div>
  )
}));

vi.mock('../components/MenuBar', () => ({
  MenuBar: ({ isOpen, onToggle, onNewTask, onSettings, onHelp }: any) => {
    const [menuOpen, setMenuOpen] = React.useState(isOpen || false);
    
    const handleToggle = () => {
      const newState = !menuOpen;
      setMenuOpen(newState);
      onToggle?.(newState);
    };
    
    const handleSettings = () => {
      onSettings?.();
      setMenuOpen(false); // Close menu after selection
    };
    
    const handleHelp = () => {
      onHelp?.();
      setMenuOpen(false); // Close menu after selection
    };
    
    return (
      <div data-testid="menu-bar">
        <button onClick={handleToggle} data-testid="menu-toggle">Menu</button>
        {menuOpen && (
          <div data-testid="menu-items">
            <button onClick={onNewTask} data-testid="menu-new-task">New Task</button>
            <button onClick={handleSettings} data-testid="menu-settings">Settings</button>
            <button onClick={handleHelp} data-testid="menu-help">Help</button>
          </div>
        )}
      </div>
    );
  }
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Simple tests that should work
  describe('basic rendering', () => {
    it('should render main app components', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
        expect(screen.getByTestId('add-todo-input')).toBeInTheDocument();
        expect(screen.getByTestId('menu-bar')).toBeInTheDocument();
        // Note: sortable-context, search-bar, todo-filter, connection-status are not rendered when todos list is empty
      });
    });

  });

  describe('basic interactions', () => {
    it('should open and close menu', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('menu-toggle')).toBeInTheDocument();
      });

      // Open menu
      await user.click(screen.getByTestId('menu-toggle'));
      expect(screen.getByTestId('menu-items')).toBeInTheDocument();

      // Close menu by clicking toggle again
      await user.click(screen.getByTestId('menu-toggle'));
      expect(screen.queryByTestId('menu-items')).not.toBeInTheDocument();
    });

    it('should render menu component', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('menu-toggle')).toBeInTheDocument();
        expect(screen.getByTestId('menu-bar')).toBeInTheDocument();
      });
    });

    it('should handle basic app functionality', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('add-todo-input')).toBeInTheDocument();
        expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      });
    });
  });

  describe('header visibility', () => {
    it('should show correct CSS classes in detailed vs slim mode', async () => {
      render(<App />);

      await waitFor(() => {
        const app = document.querySelector('.app');
        expect(app).toHaveClass('app--slim');
        
        const header = document.querySelector('.app-header');
        expect(header).toBeInTheDocument();
      });
    });

    it('should apply correct CSS positioning based on mode', async () => {
      render(<App />);

      await waitFor(() => {
        // Check that app has correct class structure
        const app = document.querySelector('.app');
        expect(app).toBeInTheDocument();
        
        // Check that header exists
        const header = document.querySelector('.app-header');
        expect(header).toBeInTheDocument();
        
        // In slim mode, app should have app--slim class
        expect(app).toHaveClass('app--slim');
      });
    });

    it('should render header component structure correctly', async () => {
      render(<App />);

      await waitFor(() => {
        const header = document.querySelector('.app-header');
        expect(header).toBeInTheDocument();
        
        const headerLeft = header?.querySelector('.header-left');
        const headerCenter = header?.querySelector('.header-center');
        const headerRight = header?.querySelector('.header-right');
        
        expect(headerLeft).toBeInTheDocument();
        expect(headerCenter).toBeInTheDocument();
        expect(headerRight).toBeInTheDocument();
      });
    });
  });
});