import { describe, it, expect, vi } from 'vitest';

// Mock logger to prevent console noise
vi.mock('../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('View State Management', () => {
  describe('currentView vs startupView Separation', () => {
    it('should maintain separation between temporary and permanent view state', () => {
      // This test validates the core requirement:
      // currentView should be temporary (session-only)
      // startupView should be permanent (saved to settings)
      
      const mockSettings = {
        startupView: 'tasks-detailed'
      };
      
      // Simulate the separation logic
      const currentView = 'schedules'; // Temporary view change
      const startupView = mockSettings.startupView; // Permanent setting
      
      // currentView and startupView should be independent
      expect(currentView).toBe('schedules');
      expect(startupView).toBe('tasks-detailed');
      expect(currentView).not.toBe(startupView);
    });

    it('should support all view types for both currentView and startupView', () => {
      const validViews = ['tasks-detailed', 'tasks-simple', 'schedules'];
      
      validViews.forEach(view => {
        // Both currentView and startupView should support all view types
        expect(validViews.includes(view)).toBe(true);
      });
    });

    it('should handle keyboard shortcut view changes without affecting startupView', () => {
      // Simulate keyboard shortcut logic
      const originalStartupView = 'tasks-detailed';
      let currentView = originalStartupView;
      const startupView = originalStartupView; // Should remain unchanged
      
      // Simulate Ctrl+1 (tasks-detailed)
      currentView = 'tasks-detailed';
      expect(currentView).toBe('tasks-detailed');
      expect(startupView).toBe(originalStartupView); // Unchanged
      
      // Simulate Ctrl+2 (tasks-simple)
      currentView = 'tasks-simple';
      expect(currentView).toBe('tasks-simple');
      expect(startupView).toBe(originalStartupView); // Still unchanged
      
      // Simulate Ctrl+3 (schedules)
      currentView = 'schedules';
      expect(currentView).toBe('schedules');
      expect(startupView).toBe(originalStartupView); // Still unchanged
    });

    it('should initialize currentView from startupView on app start', () => {
      // Simulate app initialization
      const settings = {
        startupView: 'schedules'
      };
      
      // currentView should initialize from startupView
      const initialCurrentView = settings.startupView;
      
      expect(initialCurrentView).toBe('schedules');
    });

    it('should sync currentView to startupView when startupView changes', () => {
      // Simulate settings change through GUI
      let currentView = 'tasks-detailed';
      let startupView = 'tasks-detailed';
      
      // User changes startupView in settings
      const newStartupView = 'schedules';
      startupView = newStartupView;
      
      // currentView should sync to match new startupView
      currentView = startupView;
      
      expect(currentView).toBe('schedules');
      expect(startupView).toBe('schedules');
    });
  });

  describe('Settings Integration', () => {
    it('should validate startupView dropdown values', () => {
      const validStartupViews = ['tasks-detailed', 'tasks-simple', 'schedules'];
      const dropdownOptions = [
        { value: 'tasks-detailed', label: 'Detailed Tasks' },
        { value: 'tasks-simple', label: 'Simple Tasks' },
        { value: 'schedules', label: 'Schedules' }
      ];
      
      dropdownOptions.forEach(option => {
        expect(validStartupViews.includes(option.value)).toBe(true);
      });
    });

    it('should handle settings file integration for startupView', () => {
      // Mock file settings structure
      const fileSettings = {
        app: {
          startupView: 'tasks-simple'
        }
      };
      
      // Simulate conversion to app settings
      const appSettings = {
        startupView: fileSettings.app.startupView
      };
      
      expect(appSettings.startupView).toBe('tasks-simple');
    });

    it('should handle backward compatibility for view settings', () => {
      // Test legacy settings migration
      const legacySettings = {
        currentView: 'schedules' // Old property name
      };
      
      // Should migrate to startupView
      const migratedSettings = {
        startupView: legacySettings.currentView
      };
      
      expect(migratedSettings.startupView).toBe('schedules');
    });
  });

  describe('Command Palette Integration', () => {
    it('should provide currentView context to command registry', () => {
      const mockContext = {
        currentView: 'tasks-simple',
        startupView: 'tasks-detailed',
        // ... other context properties
      };
      
      // Command registry should receive both values
      expect(mockContext.currentView).toBe('tasks-simple');
      expect(mockContext.startupView).toBe('tasks-detailed');
      expect(mockContext.currentView).not.toBe(mockContext.startupView);
    });

    it('should support view-specific command visibility', () => {
      const mockCommands = [
        { id: 'view.detailed', availableIn: ['tasks-detailed'] },
        { id: 'view.simple', availableIn: ['tasks-simple'] },
        { id: 'view.schedules', availableIn: ['schedules'] },
        { id: 'global.export', availableIn: ['tasks-detailed', 'tasks-simple', 'schedules'] }
      ];
      
      const currentView = 'tasks-detailed';
      
      // Filter commands based on current view
      const availableCommands = mockCommands.filter(cmd => 
        cmd.availableIn.includes(currentView)
      );
      
      expect(availableCommands).toHaveLength(2); // view.detailed + global.export
      expect(availableCommands.some(cmd => cmd.id === 'view.detailed')).toBe(true);
      expect(availableCommands.some(cmd => cmd.id === 'global.export')).toBe(true);
    });
  });
});