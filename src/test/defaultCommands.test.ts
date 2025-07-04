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

  describe('task commands integration', () => {
    it('should verify delete completed tasks command still works', () => {
      const taskCommands = createTaskCommands(mockT);
      const deleteCompletedCommand = taskCommands.find(cmd => cmd.id === 'task.deleteCompleted');
      
      expect(deleteCompletedCommand).toBeDefined();
      expect(deleteCompletedCommand!.title).toBe('Delete Completed Tasks');
      expect(deleteCompletedCommand!.category).toBe('task');
      
      // Test execution
      deleteCompletedCommand!.execute(mockContext);
      expect(mockContext.onDeleteCompletedTasks).toHaveBeenCalledOnce();
      
      // Test visibility - should be visible in task views
      const tasksContext = { ...mockContext, startupView: 'tasks-detailed' as const };
      expect(deleteCompletedCommand!.isVisible?.(tasksContext)).toBe(true);
      
      const scheduleContext = { ...mockContext, startupView: 'schedules' as const };
      expect(deleteCompletedCommand!.isVisible?.(scheduleContext)).toBe(false);
    });
  });
});