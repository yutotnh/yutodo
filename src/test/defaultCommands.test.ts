import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createScheduleCommands,
  createTaskCommands,
  registerDefaultCommands 
} from '../commands/defaultCommands';
import { CommandContext } from '../types/commands';
import { commandRegistry } from '../utils/commandRegistry';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../utils/commandRegistry', () => ({
  commandRegistry: {
    register: vi.fn(),
    unregister: vi.fn(),
    getCommand: vi.fn(),
    getAllCommands: vi.fn(),
    getFilteredCommands: vi.fn(),
    executeCommand: vi.fn(),
    commands: new Map()
  }
}));

vi.mock('../utils/keyboardShortcuts', () => ({
  getShortcutKey: vi.fn(() => 'Ctrl+T')
}));

// Mock translation function
const mockT = vi.fn((key: string, defaultValue?: string) => {
  const translations: Record<string, string> = {
    'commandPalette.commands.schedule.deleteInactiveSchedules.title': 'Delete Inactive Schedules',
    'commandPalette.commands.schedule.deleteInactiveSchedules.description': 'Delete all inactive and completed schedules',
    'commandPalette.commands.schedule.createSchedule.title': 'Create Schedule',
    'commandPalette.commands.schedule.createSchedule.description': 'Create a new schedule',
    'commandPalette.commands.task.deleteCompleted.title': 'Delete Completed Tasks',
    'commandPalette.commands.task.deleteCompleted.description': 'Delete all completed tasks'
  };
  return translations[key] || defaultValue || key;
}) as any; // Type assertion to avoid TFunction branding issues

describe('defaultCommands', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContext = {
      startupView: 'schedules',
      currentView: 'schedules',
      selectedTasks: new Set(),
      searchQuery: '',
      settings: {},
      onNewTask: vi.fn(),
      onNewWindow: vi.fn(),
      onToggleSettings: vi.fn(),
      onFocusSearch: vi.fn(),
      onToggleSearch: vi.fn(),
      onToggleFilter: vi.fn(),
      onToggleCaseSensitive: vi.fn(),
      onToggleRegex: vi.fn(),
      onToggleWholeWord: vi.fn(),
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
      onDeleteInactiveSchedules: vi.fn(),
      onCreateSchedule: vi.fn(),
      onDeleteCompletedTasks: vi.fn()
    };
  });

  describe('createScheduleCommands', () => {
    it('should create schedule commands with correct structure', () => {
      const commands = createScheduleCommands(mockT);
      
      expect(commands).toHaveLength(2);
      
      // Test delete inactive schedules command
      const deleteCommand = commands.find(cmd => cmd.id === 'schedule.deleteInactive');
      expect(deleteCommand).toBeDefined();
      expect(deleteCommand!.title).toBe('Delete Inactive Schedules');
      expect(deleteCommand!.description).toBe('Delete all inactive and completed schedules');
      expect(deleteCommand!.category).toBe('schedule');
      expect(deleteCommand!.keywords).toContain('delete');
      expect(deleteCommand!.keywords).toContain('inactive');
      expect(deleteCommand!.keywords).toContain('schedules');
      expect(deleteCommand!.icon).toBe('trash');
      
      // Test create schedule command
      const createCommand = commands.find(cmd => cmd.id === 'schedule.create');
      expect(createCommand).toBeDefined();
      expect(createCommand!.title).toBe('Create Schedule');
      expect(createCommand!.description).toBe('Create a new schedule');
      expect(createCommand!.category).toBe('schedule');
      expect(createCommand!.keywords).toContain('new');
      expect(createCommand!.keywords).toContain('create');
      expect(createCommand!.keywords).toContain('schedule');
      expect(createCommand!.icon).toBe('plus');
    });

    it('should call translation function with correct keys', () => {
      createScheduleCommands(mockT);
      
      expect(mockT).toHaveBeenCalledWith(
        'commandPalette.commands.schedule.deleteInactiveSchedules.title', 
        'Delete Inactive Schedules'
      );
      expect(mockT).toHaveBeenCalledWith(
        'commandPalette.commands.schedule.deleteInactiveSchedules.description', 
        'Delete all inactive and completed schedules'
      );
      expect(mockT).toHaveBeenCalledWith(
        'commandPalette.commands.schedule.createSchedule.title', 
        'Create Schedule'
      );
      expect(mockT).toHaveBeenCalledWith(
        'commandPalette.commands.schedule.createSchedule.description', 
        'Create a new schedule'
      );
    });

    describe('command visibility', () => {
      it('should show schedule commands only in schedules view', () => {
        const commands = createScheduleCommands(mockT);
        
        // Should be visible in schedules view
        const scheduleContext = { ...mockContext, currentView: 'schedules' as const };
        commands.forEach(command => {
          expect(command.isVisible?.(scheduleContext)).toBe(true);
        });
        
        // Should be hidden in tasks views
        const tasksDetailedContext = { ...mockContext, currentView: 'tasks-detailed' as const };
        commands.forEach(command => {
          expect(command.isVisible?.(tasksDetailedContext)).toBe(false);
        });
        
        const tasksSimpleContext = { ...mockContext, currentView: 'tasks-simple' as const };
        commands.forEach(command => {
          expect(command.isVisible?.(tasksSimpleContext)).toBe(false);
        });
      });

      it('should handle undefined context gracefully', () => {
        const commands = createScheduleCommands(mockT);
        
        commands.forEach(command => {
          expect(() => command.isVisible?.(undefined)).not.toThrow();
          expect(command.isVisible?.(undefined)).toBe(false);
        });
      });
    });

    describe('command execution', () => {
      it('should execute delete inactive schedules command', () => {
        const commands = createScheduleCommands(mockT);
        const deleteCommand = commands.find(cmd => cmd.id === 'schedule.deleteInactive')!;
        
        deleteCommand.execute(mockContext);
        
        expect(mockContext.onDeleteInactiveSchedules).toHaveBeenCalledOnce();
      });

      it('should execute create schedule command', () => {
        const commands = createScheduleCommands(mockT);
        const createCommand = commands.find(cmd => cmd.id === 'schedule.create')!;
        
        createCommand.execute(mockContext);
        
        expect(mockContext.onCreateSchedule).toHaveBeenCalledOnce();
      });

      it('should handle missing context handlers gracefully', () => {
        const commands = createScheduleCommands(mockT);
        const contextWithoutHandlers = {
          ...mockContext,
          onDeleteInactiveSchedules: undefined,
          onCreateSchedule: undefined
        };
        
        expect(() => {
          commands[0].execute(contextWithoutHandlers);
          commands[1].execute(contextWithoutHandlers);
        }).not.toThrow();
      });
    });
  });

  describe('registerDefaultCommands', () => {
    it('should register all command types including schedule commands', () => {
      const mockRegister = vi.mocked(commandRegistry.register);
      
      registerDefaultCommands(mockT);
      
      // Verify that register was called multiple times
      expect(mockRegister).toHaveBeenCalled();
      
      // Get all registered commands
      const allCalls = mockRegister.mock.calls;
      const registeredCommands = allCalls.map(call => call[0]);
      
      // Check that schedule commands are included
      const scheduleCommands = registeredCommands.filter(cmd => cmd.category === 'schedule');
      expect(scheduleCommands).toHaveLength(2);
      
      // Verify specific schedule commands are registered
      const commandIds = registeredCommands.map(cmd => cmd.id);
      expect(commandIds).toContain('schedule.deleteInactive');
      expect(commandIds).toContain('schedule.create');
      
      // Verify other command categories are also included
      expect(commandIds).toContain('task.deleteCompleted');
      expect(registeredCommands.some(cmd => cmd.category === 'file')).toBe(true);
      expect(registeredCommands.some(cmd => cmd.category === 'view')).toBe(true);
      expect(registeredCommands.some(cmd => cmd.category === 'task')).toBe(true);
      expect(registeredCommands.some(cmd => cmd.category === 'search')).toBe(true);
      expect(registeredCommands.some(cmd => cmd.category === 'settings')).toBe(true);
    });
  });

  describe('delete completed tasks command', () => {
    let deleteCompletedCommand: any;

    beforeEach(() => {
      const taskCommands = createTaskCommands(mockT);
      deleteCompletedCommand = taskCommands.find(cmd => cmd.id === 'task.deleteCompleted');
    });

    it('should create delete completed tasks command with correct structure', () => {
      expect(deleteCompletedCommand).toBeDefined();
      expect(deleteCompletedCommand.id).toBe('task.deleteCompleted');
      expect(deleteCompletedCommand.title).toBe('Delete Completed Tasks');
      expect(deleteCompletedCommand.description).toBe('Delete all completed tasks');
      expect(deleteCompletedCommand.category).toBe('task');
      expect(deleteCompletedCommand.keywords).toContain('delete');
      expect(deleteCompletedCommand.keywords).toContain('completed');
      expect(deleteCompletedCommand.keywords).toContain('clear');
      expect(deleteCompletedCommand.icon).toBe('trash');
    });

    it('should call correct translation keys', () => {
      createTaskCommands(mockT);
      
      expect(mockT).toHaveBeenCalledWith(
        'commandPalette.commands.task.deleteCompleted.title', 
        'Delete Completed Tasks'
      );
      expect(mockT).toHaveBeenCalledWith(
        'commandPalette.commands.task.deleteCompleted.description', 
        'Delete all completed tasks'
      );
    });

    describe('command execution', () => {
      it('should execute delete completed tasks command successfully', () => {
        deleteCompletedCommand.execute(mockContext);
        expect(mockContext.onDeleteCompletedTasks).toHaveBeenCalledOnce();
      });

      it('should handle missing onDeleteCompletedTasks handler gracefully', () => {
        const contextWithoutHandler = {
          ...mockContext,
          onDeleteCompletedTasks: undefined
        };
        
        expect(() => {
          deleteCompletedCommand.execute(contextWithoutHandler);
        }).not.toThrow();
      });

      it('should work with optional chaining for handler', () => {
        const contextWithNullHandler = {
          ...mockContext,
          onDeleteCompletedTasks: null
        };
        
        expect(() => {
          deleteCompletedCommand.execute(contextWithNullHandler);
        }).not.toThrow();
      });
    });

    describe('command visibility', () => {
      it('should be visible in tasks-detailed view', () => {
        const tasksDetailedContext = { ...mockContext, startupView: 'tasks-detailed' as const };
        expect(deleteCompletedCommand.isVisible?.(tasksDetailedContext)).toBe(true);
      });

      it('should be visible in tasks-simple view', () => {
        const tasksSimpleContext = { ...mockContext, startupView: 'tasks-simple' as const };
        expect(deleteCompletedCommand.isVisible?.(tasksSimpleContext)).toBe(true);
      });

      it('should be hidden in schedules view', () => {
        const scheduleContext = { ...mockContext, startupView: 'schedules' as const };
        expect(deleteCompletedCommand.isVisible?.(scheduleContext)).toBe(false);
      });

      it('should handle undefined context gracefully', () => {
        expect(() => deleteCompletedCommand.isVisible?.(undefined)).not.toThrow();
        expect(deleteCompletedCommand.isVisible?.(undefined)).toBe(false);
      });

      it('should handle context without startupView gracefully', () => {
        const incompleteContext = { ...mockContext };
        delete (incompleteContext as any).startupView;
        
        expect(() => deleteCompletedCommand.isVisible?.(incompleteContext)).not.toThrow();
        expect(deleteCompletedCommand.isVisible?.(incompleteContext)).toBe(false);
      });
    });

    describe('command properties validation', () => {
      it('should have all required properties', () => {
        expect(deleteCompletedCommand.id).toBeTruthy();
        expect(deleteCompletedCommand.title).toBeTruthy();
        expect(deleteCompletedCommand.description).toBeTruthy();
        expect(deleteCompletedCommand.category).toBeTruthy();
        expect(deleteCompletedCommand.execute).toBeInstanceOf(Function);
        expect(deleteCompletedCommand.isVisible).toBeInstanceOf(Function);
      });

      it('should have relevant keywords for search', () => {
        const keywords = deleteCompletedCommand.keywords;
        expect(keywords).toContain('delete');
        expect(keywords).toContain('remove');
        expect(keywords).toContain('completed');
        expect(keywords).toContain('finished');
        expect(keywords).toContain('done');
        expect(keywords).toContain('clear');
      });

      it('should use trash icon for deletion action', () => {
        expect(deleteCompletedCommand.icon).toBe('trash');
      });
    });

    describe('integration with other task commands', () => {
      it('should be included in task commands list', () => {
        const taskCommands = createTaskCommands(mockT);
        const commandIds = taskCommands.map(cmd => cmd.id);
        expect(commandIds).toContain('task.deleteCompleted');
      });

      it('should be registered with all other commands', () => {
        const mockRegister = vi.mocked(commandRegistry.register);
        
        registerDefaultCommands(mockT);
        
        const allCalls = mockRegister.mock.calls;
        const registeredCommands = allCalls.map(call => call[0]);
        const deleteCompletedRegistered = registeredCommands.find(cmd => cmd.id === 'task.deleteCompleted');
        
        expect(deleteCompletedRegistered).toBeDefined();
        expect(deleteCompletedRegistered!.category).toBe('task');
      });
    });

    describe('error handling', () => {
      it('should handle execution with malformed context', () => {
        const malformedContext = {} as any;
        
        expect(() => {
          deleteCompletedCommand.execute(malformedContext);
        }).not.toThrow();
      });

      it('should handle visibility check with malformed context', () => {
        const malformedContext = { someOtherProperty: 'value' } as any;
        
        expect(() => {
          deleteCompletedCommand.isVisible?.(malformedContext);
        }).not.toThrow();
        expect(deleteCompletedCommand.isVisible?.(malformedContext)).toBe(false);
      });
    });
  });
});