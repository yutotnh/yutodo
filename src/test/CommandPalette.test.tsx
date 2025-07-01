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
      currentView: 'tasks-detailed',
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

  describe('Current View Context Integration', () => {
    it('should pass currentView in context to command registry', () => {
      const contextWithCurrentView = {
        ...mockContext,
        currentView: 'schedules' as const,
        startupView: 'tasks-detailed' as const, // Different from currentView
      };

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={contextWithCurrentView}
        />
      );

      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', contextWithCurrentView);
    });

    it('should handle different currentView values', () => {
      const views = ['tasks-detailed', 'tasks-simple', 'schedules'] as const;
      
      views.forEach(currentView => {
        vi.clearAllMocks();
        
        const contextWithView = {
          ...mockContext,
          currentView,
        };

        render(
          <CommandPalette
            isOpen={true}
            onClose={mockOnClose}
            context={contextWithView}
          />
        );

        expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', contextWithView);
      });
    });

    it('should handle context updates without breaking', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Change currentView while keeping startupView the same
      const updatedContext = {
        ...mockContext,
        currentView: 'schedules' as const,
        startupView: 'tasks-detailed' as const, // Unchanged
      };

      // This should not throw an error
      expect(() => {
        rerender(
          <CommandPalette
            isOpen={true}
            onClose={mockOnClose}
            context={updatedContext}
          />
        );
      }).not.toThrow();

      // Component should continue to function with updated context
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should distinguish between currentView and startupView', () => {
      const contextWithDifferentViews = {
        ...mockContext,
        currentView: 'tasks-simple' as const,
        startupView: 'schedules' as const, // Different from currentView
      };

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={contextWithDifferentViews}
        />
      );

      // Both currentView and startupView should be available in context
      const passedContext = mockCommandRegistry.getFilteredCommands.mock.calls[0][1];
      expect(passedContext.currentView).toBe('tasks-simple');
      expect(passedContext.startupView).toBe('schedules');
    });

    it('should handle onViewChange callback from context', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Verify that onViewChange callback is available in context
      expect(mockContext.onViewChange).toBeDefined();
      expect(mockContext.onViewChange).toBeInstanceOf(Function);
    });

    it('should preserve view context during command filtering', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      
      // Trigger search which should re-filter commands
      fireEvent.change(searchInput, { target: { value: 'export' } });

      // Should maintain the same context including currentView
      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('export', mockContext);
    });

    it('should handle view-specific command visibility', () => {
      // Create view-specific commands
      const viewSpecificCommands = [
        {
          id: 'view.tasks.detailed',
          title: 'Detailed Tasks Command',
          description: 'Only available in detailed view',
          category: 'view',
          keywords: ['detailed'],
          execute: vi.fn(),
        },
        {
          id: 'view.schedules',
          title: 'Schedules Command',
          description: 'Only available in schedules view',
          category: 'view',
          keywords: ['schedules'],
          execute: vi.fn(),
        },
      ];

      mockCommandRegistry.getFilteredCommands.mockReturnValue(viewSpecificCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      // Commands should be filtered based on context including currentView
      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', mockContext);
    });
  });
});