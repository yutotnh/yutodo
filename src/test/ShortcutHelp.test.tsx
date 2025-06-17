import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShortcutHelp } from '../components/ShortcutHelp';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'shortcuts.title': 'Keyboard Shortcuts',
        'shortcuts.addNewTask': 'Add new task',
        'shortcuts.openSettings': 'Open settings',
        'shortcuts.search': 'Search',
        'shortcuts.selectAll': 'Select all',
        'shortcuts.showShortcutHelp': 'Show shortcut help',
        'shortcuts.deleteSelectedTasks': 'Delete selected tasks',
        'shortcuts.removeFocus': 'Remove focus',
        'shortcuts.toggleTaskCompletion': 'Toggle task completion',
        'shortcuts.editTask': 'Edit task',
        'shortcuts.multipleSelection': 'Multiple selection',
        'shortcuts.rangeSelection': 'Range selection'
      };
      return translations[key] || key;
    },
  }),
}));

describe('ShortcutHelp', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shortcut help modal', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Add new task')).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('displays platform-specific shortcuts for Windows/Linux', () => {
    // Mock navigator.platform to simulate Windows
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true
    });

    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Should show Ctrl shortcuts for Windows/Linux
    expect(screen.getByText('Ctrl + N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + ,')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + A')).toBeInTheDocument();
  });

  it('displays platform-specific shortcuts for macOS', () => {
    // Mock navigator.platform to simulate macOS
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true
    });

    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Should show Cmd shortcuts for macOS
    expect(screen.getByText('Cmd + N')).toBeInTheDocument();
    expect(screen.getByText('Cmd + ,')).toBeInTheDocument();
    expect(screen.getByText('Cmd + A')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when escape key is pressed', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside the modal', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    const overlay = document.querySelector('.settings-overlay');
    fireEvent.mouseDown(overlay!);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal content', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    const modalContent = document.querySelector('.settings-panel');
    fireEvent.mouseDown(modalContent!);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders all shortcut categories', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Check for various shortcut categories
    expect(screen.getByText('Add new task')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Select all')).toBeInTheDocument();
    expect(screen.getByText('Delete selected tasks')).toBeInTheDocument();
    expect(screen.getByText('Remove focus')).toBeInTheDocument();
    expect(screen.getByText('Toggle task completion')).toBeInTheDocument();
    expect(screen.getByText('Edit task')).toBeInTheDocument();
  });

  it('renders keyboard sequence shortcuts', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Check for VS Code style shortcuts (Ctrl+K sequences)
    expect(screen.getByText('Show shortcut help')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<ShortcutHelp onClose={mockOnClose} />);
    
    const overlay = container.querySelector('.settings-overlay');
    expect(overlay).toBeInTheDocument();
    
    const panel = container.querySelector('.settings-panel');
    expect(panel).toBeInTheDocument();
  });

  it('handles multiple escape key presses', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Should call onClose multiple times (each escape press)
    expect(mockOnClose).toHaveBeenCalledTimes(3);
  });

  it('shows multiselection shortcuts', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    expect(screen.getByText('Multiple selection')).toBeInTheDocument();
    expect(screen.getByText('Range selection')).toBeInTheDocument();
  });

  it('organizes shortcuts in a logical grouping', () => {
    const { container } = render(<ShortcutHelp onClose={mockOnClose} />);
    
    const shortcutItems = container.querySelectorAll('.shortcut-item');
    expect(shortcutItems.length).toBe(11); // Should have 11 shortcuts based on component
    
    const shortcutKeys = container.querySelectorAll('.shortcut-key');
    expect(shortcutKeys.length).toBe(11); // Each shortcut should have a key combination
  });

  it('shows complex key combinations correctly', () => {
    // Mock platform to ensure consistent results
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true
    });
    
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Should show sequence shortcuts like Ctrl+K, Ctrl+S
    expect(screen.getByText('Ctrl + K, Ctrl + S')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + Click')).toBeInTheDocument();
    expect(screen.getByText('Shift + Click')).toBeInTheDocument();
  });

  it('handles platform detection correctly for unknown platforms', () => {
    // Mock navigator.platform to simulate unknown platform
    Object.defineProperty(navigator, 'platform', {
      value: 'UnknownOS',
      configurable: true
    });

    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Should default to Ctrl for unknown platforms
    expect(screen.getByText('Ctrl + N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + A')).toBeInTheDocument();
  });
});