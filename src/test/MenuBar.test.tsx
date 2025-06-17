import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MenuBar } from '../components/MenuBar';
import { AppSettings } from '../types/todo';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MenuBar', () => {
  const mockSettings: AppSettings = {
    alwaysOnTop: false,
    detailedMode: true,
    darkMode: 'auto',
    confirmDelete: true,
    customCss: '',
    serverUrl: 'http://localhost:3001',
    language: 'auto',
    currentView: 'tasks',
  };

  const defaultProps = {
    settings: mockSettings,
    onNewTask: vi.fn(),
    onSelectAll: vi.fn(),
    onDeleteSelected: vi.fn(),
    onShowSettings: vi.fn(),
    onToggleSlim: vi.fn(),
    onToggleAlwaysOnTop: vi.fn(),
    onShowShortcuts: vi.fn(),
    onShowAbout: vi.fn(),
    onImportTasks: vi.fn(),
    onExportTasks: vi.fn(),
    onMenuStateChange: vi.fn(),
    isAltKeyActive: false,
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

  it('calls onViewChange when switching to tasks', () => {
    render(<MenuBar {...defaultProps} />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const tasksItem = screen.getByText('menu.showingTasks');
    fireEvent.click(tasksItem);
    
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('tasks');
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

  it('shows keyboard shortcuts when Alt key is active', () => {
    render(<MenuBar {...defaultProps} isAltKeyActive={true} />);
    
    expect(screen.getByText('f')).toBeInTheDocument(); // File menu shortcut
    expect(screen.getByText('e')).toBeInTheDocument(); // Edit menu shortcut
    expect(screen.getByText('v')).toBeInTheDocument(); // View menu shortcut
    expect(screen.getByText('h')).toBeInTheDocument(); // Help menu shortcut
  });

  it('does not show keyboard shortcuts when Alt key is not active', () => {
    render(<MenuBar {...defaultProps} isAltKeyActive={false} />);
    
    // Shortcuts should not be visible
    expect(screen.queryByText('F')).not.toBeInTheDocument();
    expect(screen.queryByText('E')).not.toBeInTheDocument();
    expect(screen.queryByText('V')).not.toBeInTheDocument();
    expect(screen.queryByText('H')).not.toBeInTheDocument();
  });

  it('highlights current view in view menu', () => {
    const tasksViewSettings = { ...mockSettings, currentView: 'tasks' as const };
    render(<MenuBar {...defaultProps} settings={tasksViewSettings} />);
    
    const viewMenu = screen.getByRole('button', { name: /menu\.\s*v\s*iew/ });
    fireEvent.click(viewMenu);
    
    const tasksItem = screen.getByText('menu.showingTasks');
    expect(tasksItem).toBeInTheDocument();
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