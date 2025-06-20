import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShortcutHelp } from '../components/ShortcutHelp';

// Mock centralized keyboard shortcuts
vi.mock('../utils/keyboardShortcuts', () => ({
  getAllShortcutsForDisplay: () => {
    // Detect platform directly in the mock
    const platform = typeof navigator !== 'undefined' ? navigator.platform.toUpperCase() : 'WIN32';
    const modifier = platform.indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl';
    return [
      { id: 'new-task', displayKey: `${modifier}+N`, description: 'Add new task' },
      { id: 'command-palette', displayKey: `${modifier}+Shift+P`, description: 'Open command palette' },
      { id: 'open-settings', displayKey: `${modifier}+,`, description: 'Open settings' },
      { id: 'focus-search', displayKey: `${modifier}+F`, description: 'Search' },
      { id: 'select-all', displayKey: `${modifier}+A`, description: 'Select all' },
      { id: 'delete-selected', displayKey: 'Delete', description: 'Delete selected tasks' },
      { id: 'toggle-completion', displayKey: `${modifier}+D`, description: 'Toggle task completion' },
      { id: 'edit-task-e', displayKey: 'E', description: 'Edit task' },
      { id: 'edit-task-f2', displayKey: 'F2', description: 'Edit task' },
      { id: 'clear-selection', displayKey: 'Escape', description: 'Remove focus' },
      { id: 'show-help', displayKey: `${modifier}+K ${modifier}+S`, description: 'Show shortcut help' }
    ];
  },
  getModifierKey: () => {
    const platform = typeof navigator !== 'undefined' ? navigator.platform.toUpperCase() : 'WIN32';
    return platform.indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl';
  }
}));

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: { [key: string]: string } = {
        'shortcuts.title': 'Keyboard Shortcuts',
        'shortcuts.addNewTask': 'Add new task',
        'shortcuts.commandPalette': 'Open command palette',
        'shortcuts.openSettings': 'Open settings',
        'shortcuts.search': 'Search',
        'shortcuts.selectAll': 'Select all',
        'shortcuts.showShortcutHelp': 'Show shortcut help',
        'shortcuts.deleteSelectedTasks': 'Delete selected tasks',
        'shortcuts.removeFocus': 'Remove focus',
        'shortcuts.toggleTaskCompletion': 'Toggle task completion',
        'shortcuts.editTask': 'Edit task',
        'shortcuts.multipleSelection': 'Multiple selection',
        'shortcuts.rangeSelection': 'Range selection',
        // New centralized shortcut keys
        'shortcuts.new-task': 'Add new task',
        'shortcuts.command-palette': 'Open command palette',
        'shortcuts.open-settings': 'Open settings',
        'shortcuts.focus-search': 'Search',
        'shortcuts.select-all': 'Select all',
        'shortcuts.delete-selected': 'Delete selected tasks',
        'shortcuts.toggle-completion': 'Toggle task completion',
        'shortcuts.edit-task-e': 'Edit task',
        'shortcuts.edit-task-f2': 'Edit task',
        'shortcuts.clear-selection': 'Remove focus',
        'shortcuts.show-help': 'Show shortcut help'
      };
      return translations[key] || options?.defaultValue || key;
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
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+,')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+A')).toBeInTheDocument();
  });

  it('displays platform-specific shortcuts for macOS', () => {
    // Mock navigator.platform to simulate macOS
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true
    });

    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Should show Cmd shortcuts for macOS
    expect(screen.getByText('Cmd+N')).toBeInTheDocument();
    expect(screen.getByText('Cmd+,')).toBeInTheDocument();
    expect(screen.getByText('Cmd+A')).toBeInTheDocument();
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

  it('calls onClose when clicking outside the modal (excluding header area)', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    const overlay = document.querySelector('.settings-overlay');
    // ヘッダー領域外（Y座標30px以上）でクリック
    fireEvent.mouseDown(overlay!, { clientY: 100 });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal content', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    const modalContent = document.querySelector('.settings-panel');
    fireEvent.mouseDown(modalContent!);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not close when clicking in header area', () => {
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    const overlay = document.querySelector('.settings-overlay');
    // ヘッダー領域内（Y座標30px以下）でクリック
    fireEvent.mouseDown(overlay!, { clientY: 20 });
    
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
    expect(screen.getAllByText('Edit task')).toHaveLength(2); // E and F2 both have "Edit task"
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
    expect(shortcutItems.length).toBe(13); // Should have 13 shortcuts (11 centralized + 2 additional)
    
    const shortcutKeys = container.querySelectorAll('.shortcut-key');
    expect(shortcutKeys.length).toBe(13); // Each shortcut should have a key combination
  });

  it('shows complex key combinations correctly', () => {
    // Mock platform to ensure consistent results
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true
    });
    
    render(<ShortcutHelp onClose={mockOnClose} />);
    
    // Should show sequence shortcuts like Ctrl+K, Ctrl+S
    expect(screen.getByText('Ctrl+K Ctrl+S')).toBeInTheDocument();
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
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+A')).toBeInTheDocument();
  });
});