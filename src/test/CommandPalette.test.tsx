import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CommandPalette } from '../components/CommandPalette';
import { CommandContext, CommandAction } from '../types/commands';
import { commandRegistry } from '../utils/commandRegistry';

// Mock the i18n hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock the logger
vi.mock('../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    network: vi.fn(),
    ui: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Command: () => <div data-testid="command-icon">Command</div>,
  ArrowUp: () => <div data-testid="arrow-up-icon">ArrowUp</div>,
  ArrowDown: () => <div data-testid="arrow-down-icon">ArrowDown</div>,
  CornerDownLeft: () => <div data-testid="enter-icon">Enter</div>,
}));

// Mock command registry
vi.mock('../utils/commandRegistry', () => ({
  commandRegistry: {
    getFilteredCommands: vi.fn(),
    executeCommand: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getCommand: vi.fn(),
    getAllCommands: vi.fn(),
  },
}));

const mockCommandRegistry = commandRegistry as any;

describe('CommandPalette - Basic Tests', () => {
  let mockContext: CommandContext;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockCommands: CommandAction[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContext = {
      startupView: 'tasks-detailed',
      selectedTasks: new Set<string>(),
      searchQuery: '',
      settings: {
        theme: 'auto',
        language: 'auto',
        startupView: 'tasks-detailed',
        slimMode: false,
        alwaysOnTop: false,
        customCss: '',
        deleteConfirmation: true,
        headerAutoHide: true,
      },
      onNewTask: vi.fn(),
      onToggleSettings: vi.fn(),
      onFocusSearch: vi.fn(),
      onSelectAll: vi.fn(),
      onDeleteSelected: vi.fn(),
      onClearSelection: vi.fn(),
      onEditSelected: vi.fn(),
      onToggleSelectedCompletion: vi.fn(),
      onExportTasks: vi.fn(),
      onImportTasks: vi.fn(),
      onViewChange: vi.fn(),
      onToggleDarkMode: vi.fn(),
      onToggleSlimMode: vi.fn(),
      onToggleAlwaysOnTop: vi.fn(),
      onShowHelp: vi.fn(),
      onToggleSearch: vi.fn(),
      onToggleFilter: vi.fn(),
      onToggleCaseSensitive: vi.fn(),
      onToggleRegex: vi.fn(),
      onToggleWholeWord: vi.fn(),
    };

    mockOnClose = vi.fn();

    mockCommands = [
      {
        id: 'file.export.tasks',
        title: 'Export Tasks',
        description: 'Export all tasks to TOML file',
        category: 'file',
        keywords: ['export', 'save', 'toml'],
        keybinding: 'Ctrl+Shift+E',
        execute: vi.fn(),
      },
      {
        id: 'settings.open',
        title: 'Open Settings',
        description: 'Open application settings',
        category: 'settings',
        keywords: ['settings', 'preferences'],
        keybinding: 'Ctrl+,',
        execute: vi.fn(),
      },
    ];

    mockCommandRegistry.getFilteredCommands.mockReturnValue(mockCommands);
    mockCommandRegistry.getAllCommands.mockReturnValue(mockCommands);
    mockCommandRegistry.executeCommand.mockResolvedValue(undefined);
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <CommandPalette
          isOpen={false}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
    });

    it('should render command items', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      expect(screen.getByText('Export Tasks')).toBeInTheDocument();
      expect(screen.getByText('Open Settings')).toBeInTheDocument();
    });
  });

  describe('Basic Keyboard Navigation', () => {
    it('should close on Escape key', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const commandPalette = screen.getByRole('dialog').querySelector('.command-palette');
      fireEvent.keyDown(commandPalette!, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle arrow navigation', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const firstItem = screen.getAllByRole('option')[0];
      expect(firstItem).toHaveAttribute('aria-selected', 'true');

      const commandPalette = screen.getByRole('dialog').querySelector('.command-palette');
      fireEvent.keyDown(commandPalette!, { key: 'ArrowDown' });
      
      // Should navigate to second item
      const secondItem = screen.getAllByRole('option')[1];
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Empty States', () => {
    it('should show no commands message when no commands exist', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue([]);
      
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      expect(screen.getByText('No commands available')).toBeInTheDocument();
    });
  });

  describe('Command Loading and Initialization', () => {
    it('should load commands when opening the palette', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Should call getFilteredCommands with empty query when opening
      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', mockContext);
    });

    it('should call getAllCommands for debugging when opening', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Should call getAllCommands for debug logging
      expect(mockCommandRegistry.getAllCommands).toHaveBeenCalled();
    });

    it('should clear commands when closing', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Commands should be visible when open
      expect(screen.getByText('Export Tasks')).toBeInTheDocument();

      // Close the palette
      rerender(
        <CommandPalette
          isOpen={false}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Commands should not be visible when closed
      expect(screen.queryByText('Export Tasks')).not.toBeInTheDocument();
    });

    it('should reload commands when context changes', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Clear previous calls for accurate counting
      vi.clearAllMocks();

      // Change context
      const updatedContext = {
        ...mockContext,
        startupView: 'schedules' as const,
      };

      rerender(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={updatedContext}
        />
      );

      // Should be called with updated context
      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', updatedContext);
    });

    it('should handle empty command registry gracefully', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue([]);
      mockCommandRegistry.getAllCommands.mockReturnValue([]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      expect(screen.getByText('No commands available')).toBeInTheDocument();
    });

    it('should reset search query when opening', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={false}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Open the palette
      rerender(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Command Palette');
    });
  });
});