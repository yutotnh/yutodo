import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MenuBar } from '../components/MenuBar';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en'
    }
  }),
}));

describe('MenuBar', () => {
  const defaultProps = {
    currentView: 'tasks-detailed' as const,
    sessionAlwaysOnTop: false,
    onNewTask: vi.fn(),
    onSelectAll: vi.fn(),
    onDeleteSelected: vi.fn(),
    onShowSettings: vi.fn(),
    onToggleAlwaysOnTop: vi.fn(),
    onShowShortcuts: vi.fn(),
    onShowAbout: vi.fn(),
    onImportTasks: vi.fn(),
    onExportTasks: vi.fn(),
    onMenuStateChange: vi.fn(),
    onViewChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window width to ensure normal menu mode (not hamburger)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800
    });
  });

  it('renders all main menu items', () => {
    render(<MenuBar {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /menu\.\s*f\s*ile/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /m\s*e\s*nu\.edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /menu\.\s*v\s*iew/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /menu\.\s*h\s*elp/ })).toBeInTheDocument();
  });

  it('calls onViewChange when switching to schedules', () => {
    render(<MenuBar {...defaultProps} />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const schedulesItem = screen.getByText('menu.showSchedules');
    fireEvent.click(schedulesItem);
    
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('schedules');
  });

  it('calls onViewChange when switching to tasks detailed', () => {
    // Test switching from a different view to tasks-detailed
    render(<MenuBar {...defaultProps} currentView="tasks-simple" />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const tasksItem = screen.getByText('menu.showTasksDetailed');
    fireEvent.click(tasksItem);
    
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('tasks-detailed');
  });

  it('calls onNewTask when new task menu item is clicked', () => {
    render(<MenuBar {...defaultProps} />);
    
    const fileMenu = screen.getByRole('button', { name: /menu\.\s*f\s*ile/ });
    fireEvent.click(fileMenu);
    
    const newTaskItem = screen.getByText('menu.newTask');
    fireEvent.click(newTaskItem);
    
    expect(defaultProps.onNewTask).toHaveBeenCalled();
  });

  it('calls onExportTasks when export menu item is clicked', () => {
    render(<MenuBar {...defaultProps} />);
    
    const fileMenu = screen.getByRole('button', { name: /menu\.\s*f\s*ile/ });
    fireEvent.click(fileMenu);
    
    const exportItem = screen.getByText('menu.exportTasks');
    fireEvent.click(exportItem);
    
    expect(defaultProps.onExportTasks).toHaveBeenCalled();
  });

  it('calls onImportTasks when import menu item is clicked', () => {
    render(<MenuBar {...defaultProps} />);
    
    const fileMenu = screen.getByRole('button', { name: /menu\.\s*f\s*ile/ });
    fireEvent.click(fileMenu);
    
    const importItem = screen.getByText('menu.importTasks');
    fireEvent.click(importItem);
    
    expect(defaultProps.onImportTasks).toHaveBeenCalled();
  });

  it('shows hamburger menu when screen is narrow', () => {
    // Mock window width to be narrow
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 250, // Very narrow to trigger hamburger mode
    });
    
    const { rerender } = render(<MenuBar {...defaultProps} />);
    
    // Trigger resize event to switch to hamburger mode
    fireEvent(window, new Event('resize'));
    
    // Rerender to reflect the state change
    rerender(<MenuBar {...defaultProps} />);
    
    expect(screen.getByTestId('hamburger-menu')).toBeInTheDocument();
  });

  it('calls onMenuStateChange when menu state changes', () => {
    render(<MenuBar {...defaultProps} />);
    
    const fileMenu = screen.getByRole('button', { name: /menu\.\s*f\s*ile/ });
    fireEvent.click(fileMenu);
    
    expect(defaultProps.onMenuStateChange).toHaveBeenCalledWith(true);
  });

  it('shows keyboard shortcuts when Alt key is pressed', () => {
    render(<MenuBar {...defaultProps} />);
    
    // Simulate Alt key press
    fireEvent.keyDown(document, { key: 'Alt' });
    
    expect(screen.getByText('f')).toBeInTheDocument(); // File menu shortcut
    expect(screen.getByText('e')).toBeInTheDocument(); // Edit menu shortcut
    expect(screen.getByText('v')).toBeInTheDocument(); // View menu shortcut
    expect(screen.getByText('h')).toBeInTheDocument(); // Help menu shortcut
  });

  it('does not show keyboard shortcuts initially', () => {
    render(<MenuBar {...defaultProps} />);
    
    // Shortcuts should not be visible initially
    expect(screen.queryByText('F')).not.toBeInTheDocument();
    expect(screen.queryByText('E')).not.toBeInTheDocument();
    expect(screen.queryByText('V')).not.toBeInTheDocument();
    expect(screen.queryByText('H')).not.toBeInTheDocument();
  });

  it('calls onViewChange when switching to tasks simple', () => {
    render(<MenuBar {...defaultProps} />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const tasksSimpleItem = screen.getByText('menu.showTasksSimple');
    fireEvent.click(tasksSimpleItem);
    
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('tasks-simple');
  });

  it('highlights current view in view menu for tasks-detailed', () => {
    render(<MenuBar {...defaultProps} currentView="tasks-detailed" />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const tasksItem = screen.getByText('menu.showingTasksDetailed');
    expect(tasksItem).toBeInTheDocument();
  });

  it('highlights current view in view menu for tasks-simple', () => {
    render(<MenuBar {...defaultProps} currentView="tasks-simple" />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const tasksSimpleItem = screen.getByText('menu.showingTasksSimple');
    expect(tasksSimpleItem).toBeInTheDocument();
  });

  it('highlights current view in view menu for schedules', () => {
    render(<MenuBar {...defaultProps} currentView="schedules" />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const schedulesItem = screen.getByText('menu.showingSchedules');
    expect(schedulesItem).toBeInTheDocument();
  });

  it('handles hierarchical hamburger menu correctly', () => {
    // Mock narrow screen
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 250,
    });
    
    const { rerender } = render(<MenuBar {...defaultProps} />);
    fireEvent(window, new Event('resize'));
    rerender(<MenuBar {...defaultProps} />);
    
    const hamburgerButton = screen.getByTestId('hamburger-menu');
    fireEvent.click(hamburgerButton);
    
    // Should show main menu items
    expect(screen.getByText('menu.file')).toBeInTheDocument();
    expect(screen.getByText('menu.edit')).toBeInTheDocument();
  });
});