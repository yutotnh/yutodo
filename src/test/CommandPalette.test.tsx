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
      onNewWindow: vi.fn(),
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
      onDeleteInactiveSchedules: vi.fn(),
      onCreateSchedule: vi.fn(),
      onDeleteCompletedTasks: vi.fn(),
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
        id: 'file.new.window',
        title: 'New Window',
        description: 'Open a new application window',
        category: 'file',
        keywords: ['window', 'new', 'open'],
        keybinding: 'Ctrl+Shift+N',
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
      expect(screen.getByText('New Window')).toBeInTheDocument();
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

  describe('Command Execution', () => {
    it('should execute new window command when clicked', async () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const newWindowCommand = screen.getByText('New Window');
      fireEvent.click(newWindowCommand);

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith('file.new.window', mockContext);
    });

    it('should execute new window command when selected and Enter is pressed', async () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const commandPalette = screen.getByRole('dialog').querySelector('.command-palette');
      
      // Navigate to the New Window command (it should be the second item)
      fireEvent.keyDown(commandPalette!, { key: 'ArrowDown' });
      
      // Press Enter to execute
      fireEvent.keyDown(commandPalette!, { key: 'Enter' });

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith('file.new.window', mockContext);
    });

    it('should filter new window command when searching', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'window' } });

      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('window', mockContext);
    });

    it('should show new window command in search results for "new" keyword', () => {
      // Mock filtered results to only show new window command
      const filteredCommands = [
        {
          id: 'file.new.window',
          title: 'New Window',
          description: 'Open a new application window',
          category: 'file',
          keywords: ['window', 'new', 'open'],
          keybinding: 'Ctrl+Shift+N',
          execute: vi.fn(),
        },
      ];
      
      mockCommandRegistry.getFilteredCommands.mockReturnValue(filteredCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'new' } });

      expect(screen.getByText('New Window')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Shift+N')).toBeInTheDocument();
    });
  });

  describe('Schedule Commands Integration', () => {
    let scheduleContext: CommandContext;
    let scheduleCommands: CommandAction[];

    beforeEach(() => {
      scheduleContext = {
        ...mockContext,
        currentView: 'schedules',
        startupView: 'schedules',
      };

      scheduleCommands = [
        {
          id: 'schedule.deleteInactive',
          title: 'Delete Inactive Schedules',
          description: 'Delete all inactive and completed schedules',
          category: 'schedule',
          keywords: ['delete', 'remove', 'inactive', 'schedules', 'cleanup'],
          icon: 'trash',
          execute: vi.fn(),
          isVisible: (context?: CommandContext) => context?.currentView === 'schedules',
        },
        {
          id: 'schedule.create',
          title: 'Create Schedule',
          description: 'Create a new schedule',
          category: 'schedule',
          keywords: ['new', 'create', 'add', 'schedule'],
          icon: 'plus',
          execute: vi.fn(),
          isVisible: (context?: CommandContext) => context?.currentView === 'schedules',
        },
      ];
    });

    it('should display schedule commands in schedules view', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue(scheduleCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      expect(screen.getByText('Delete Inactive Schedules')).toBeInTheDocument();
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
      expect(screen.getByText('Delete all inactive and completed schedules')).toBeInTheDocument();
      expect(screen.getByText('Create a new schedule')).toBeInTheDocument();
    });

    it('should not display schedule commands in tasks view', () => {
      const tasksContext = {
        ...mockContext,
        currentView: 'tasks-detailed' as const,
      };

      // Mock filtered commands to return empty array for tasks view
      mockCommandRegistry.getFilteredCommands.mockReturnValue([]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      expect(screen.queryByText('Delete Inactive Schedules')).not.toBeInTheDocument();
      expect(screen.queryByText('Create Schedule')).not.toBeInTheDocument();
    });

    it('should execute delete inactive schedules command', async () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue(scheduleCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      const deleteCommand = screen.getByText('Delete Inactive Schedules');
      fireEvent.click(deleteCommand);

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(
        'schedule.deleteInactive',
        scheduleContext
      );
    });

    it('should execute create schedule command', async () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue(scheduleCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      const createCommand = screen.getByText('Create Schedule');
      fireEvent.click(createCommand);

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(
        'schedule.create',
        scheduleContext
      );
    });

    it('should filter schedule commands by search query', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue(scheduleCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'delete' } });

      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('delete', scheduleContext);
    });

    it('should show filtered schedule commands for "inactive" keyword', () => {
      const filteredCommands = [scheduleCommands[0]]; // Only delete inactive command
      mockCommandRegistry.getFilteredCommands.mockReturnValue(filteredCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'inactive' } });

      expect(screen.getByText('Delete Inactive Schedules')).toBeInTheDocument();
      expect(screen.queryByText('Create Schedule')).not.toBeInTheDocument();
    });

    it('should navigate schedule commands with keyboard', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue(scheduleCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      const commandPalette = screen.getByRole('dialog').querySelector('.command-palette');
      
      // First command should be selected by default
      const firstItem = screen.getAllByRole('option')[0];
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
      
      // Navigate to second command
      fireEvent.keyDown(commandPalette!, { key: 'ArrowDown' });
      
      const secondItem = screen.getAllByRole('option')[1];
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should execute schedule command with Enter key', async () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue(scheduleCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      const commandPalette = screen.getByRole('dialog').querySelector('.command-palette');
      
      // First command is selected by default, press Enter to execute
      fireEvent.keyDown(commandPalette!, { key: 'Enter' });

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(
        'schedule.deleteInactive',
        scheduleContext
      );
    });

    it('should reload schedule commands when switching to schedules view', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext} // Initially in tasks view
        />
      );

      // Clear previous calls
      vi.clearAllMocks();

      // Switch to schedules view
      rerender(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', scheduleContext);
    });

    it('should handle mixed command categories in schedules view', () => {
      const mixedCommands = [
        ...scheduleCommands,
        {
          id: 'settings.open',
          title: 'Open Settings',
          description: 'Open application settings',
          category: 'settings',
          keywords: ['settings', 'preferences'],
          execute: vi.fn(),
        },
      ];

      mockCommandRegistry.getFilteredCommands.mockReturnValue(mixedCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      // All commands should be displayed
      expect(screen.getByText('Delete Inactive Schedules')).toBeInTheDocument();
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
      expect(screen.getByText('Open Settings')).toBeInTheDocument();
    });

    it('should pass correct context with schedule handlers', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      // Verify the context passed includes schedule handlers
      const passedContext = mockCommandRegistry.getFilteredCommands.mock.calls[0][1];
      expect(passedContext.onDeleteInactiveSchedules).toBeDefined();
      expect(passedContext.onCreateSchedule).toBeDefined();
      expect(passedContext.currentView).toBe('schedules');
    });
  });

  describe('Delete Completed Tasks Command Integration', () => {
    let tasksContext: CommandContext;
    let deleteCompletedTasksCommand: CommandAction;

    beforeEach(() => {
      tasksContext = {
        ...mockContext,
        currentView: 'tasks-detailed',
        startupView: 'tasks-detailed',
      };

      deleteCompletedTasksCommand = {
        id: 'task.deleteCompleted',
        title: 'Delete Completed Tasks',
        description: 'Delete all completed tasks',
        category: 'task',
        keywords: ['delete', 'remove', 'completed', 'finished', 'done', 'clear'],
        icon: 'trash',
        execute: vi.fn(),
        isVisible: (context?: CommandContext) => 
          context?.startupView === 'tasks-detailed' || context?.startupView === 'tasks-simple',
      };
    });

    it('should display delete completed tasks command in tasks view', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue([deleteCompletedTasksCommand]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      expect(screen.getByText('Delete Completed Tasks')).toBeInTheDocument();
      expect(screen.getByText('Delete all completed tasks')).toBeInTheDocument();
    });

    it('should not display delete completed tasks command in schedules view', () => {
      const scheduleContext = {
        ...mockContext,
        currentView: 'schedules' as const,
        startupView: 'schedules' as const,
      };

      // Mock filtered commands to return empty array for schedules view
      mockCommandRegistry.getFilteredCommands.mockReturnValue([]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={scheduleContext}
        />
      );

      expect(screen.queryByText('Delete Completed Tasks')).not.toBeInTheDocument();
    });

    it('should execute delete completed tasks command when clicked', async () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue([deleteCompletedTasksCommand]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      const deleteCommand = screen.getByText('Delete Completed Tasks');
      fireEvent.click(deleteCommand);

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(
        'task.deleteCompleted',
        tasksContext
      );
    });

    it('should execute delete completed tasks command with Enter key', async () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue([deleteCompletedTasksCommand]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      const commandPalette = screen.getByRole('dialog').querySelector('.command-palette');
      
      // Command should be selected by default, press Enter to execute
      fireEvent.keyDown(commandPalette!, { key: 'Enter' });

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(
        'task.deleteCompleted',
        tasksContext
      );
    });

    it('should filter delete completed tasks command by search keywords', () => {
      mockCommandRegistry.getFilteredCommands.mockReturnValue([deleteCompletedTasksCommand]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'completed' } });

      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('completed', tasksContext);
    });

    it('should show delete completed tasks command for "clear" keyword search', () => {
      const filteredCommands = [deleteCompletedTasksCommand];
      mockCommandRegistry.getFilteredCommands.mockReturnValue(filteredCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search commands...');
      fireEvent.change(searchInput, { target: { value: 'clear' } });

      expect(screen.getByText('Delete Completed Tasks')).toBeInTheDocument();
    });

    it('should work in both tasks-detailed and tasks-simple views', () => {
      const viewsToTest = ['tasks-detailed', 'tasks-simple'] as const;
      
      viewsToTest.forEach(view => {
        vi.clearAllMocks();
        
        const contextWithView = {
          ...mockContext,
          currentView: view,
          startupView: view,
        };

        mockCommandRegistry.getFilteredCommands.mockReturnValue([deleteCompletedTasksCommand]);

        const { unmount } = render(
          <CommandPalette
            isOpen={true}
            onClose={mockOnClose}
            context={contextWithView}
          />
        );

        expect(screen.getByText('Delete Completed Tasks')).toBeInTheDocument();
        
        // Clean up before next iteration
        unmount();
      });
    });

    it('should pass correct context with delete completed tasks handler', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      // Verify the context passed includes delete completed tasks handler
      const passedContext = mockCommandRegistry.getFilteredCommands.mock.calls[0][1];
      expect(passedContext.onDeleteCompletedTasks).toBeDefined();
      expect(passedContext.currentView).toBe('tasks-detailed');
      expect(passedContext.startupView).toBe('tasks-detailed');
    });

    it('should handle mixed task and other commands', () => {
      const mixedCommands = [
        deleteCompletedTasksCommand,
        {
          id: 'task.selectAll',
          title: 'Select All Tasks',
          description: 'Select all visible tasks',
          category: 'task',
          keywords: ['select', 'all'],
          execute: vi.fn(),
        },
        {
          id: 'settings.open',
          title: 'Open Settings',
          description: 'Open application settings',
          category: 'settings',
          keywords: ['settings'],
          execute: vi.fn(),
        },
      ];

      mockCommandRegistry.getFilteredCommands.mockReturnValue(mixedCommands);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      // All commands should be displayed
      expect(screen.getByText('Delete Completed Tasks')).toBeInTheDocument();
      expect(screen.getByText('Select All Tasks')).toBeInTheDocument();
      expect(screen.getByText('Open Settings')).toBeInTheDocument();
    });

    it('should handle delete completed tasks command with no completed tasks', async () => {
      // This would typically be handled by the command execution logic
      // but the command palette should not prevent execution
      mockCommandRegistry.getFilteredCommands.mockReturnValue([deleteCompletedTasksCommand]);

      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksContext}
        />
      );

      const deleteCommand = screen.getByText('Delete Completed Tasks');
      
      // Should not throw error even if no completed tasks exist
      expect(() => {
        fireEvent.click(deleteCommand);
      }).not.toThrow();

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(
        'task.deleteCompleted',
        tasksContext
      );
    });

    it('should reload delete completed tasks command when switching to tasks view', () => {
      const { rerender } = render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={mockContext} // Initially in default tasks view
        />
      );

      // Clear previous calls
      vi.clearAllMocks();

      // Switch to tasks-simple view
      const tasksSimpleContext = {
        ...mockContext,
        currentView: 'tasks-simple' as const,
        startupView: 'tasks-simple' as const,
      };

      rerender(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          context={tasksSimpleContext}
        />
      );

      expect(mockCommandRegistry.getFilteredCommands).toHaveBeenCalledWith('', tasksSimpleContext);
    });
  });
});