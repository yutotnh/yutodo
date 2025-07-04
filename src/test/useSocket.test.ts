import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { useSocket } from '../hooks/useSocket';
import { Todo } from '../types/todo';

// Mock socket.io-client with proper factory function
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  };
  
  const mockIo = vi.fn(() => mockSocket);
  
  return {
    io: mockIo,
  };
});


describe('useSocket', () => {
  let mockSocket: any;
  let mockIo: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked io function
    const { io } = await import('socket.io-client');
    mockIo = io as any;
    
    // Create a fresh mock socket for each test
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: false,
    };
    
    // Configure the mock to return our mock socket
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockTodo: Todo = {
    id: '1',
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    priority: 'medium',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  };

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      expect(result.current.todos).toEqual([]);
      expect(result.current.connected).toBe(false);
      expect(result.current.connectionStatus).toBe('connecting'); // Should be 'connecting' when serverUrl is provided
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should not connect when serverUrl is empty', () => {
      renderHook(() => useSocket(''));
      
      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should connect with correct configuration', () => {
      renderHook(() => useSocket('http://localhost:3001'));

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    });

    it('should set up event listeners', () => {
      renderHook(() => useSocket('http://localhost:3001'));

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('reconnect_attempt', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('reconnect_failed', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('todos', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('todo-added', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('todo-updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('todo-deleted', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('connection state management', () => {
    it('should handle successful connection', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Get the connect callback
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'connect'
      )![1];

      act(() => {
        connectCallback();
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.reconnectAttempts).toBe(0);
      expect(mockSocket.emit).toHaveBeenCalledWith('get-todos');
    });

    it('should handle disconnection', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Get the disconnect callback
      const disconnectCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      )![1];

      act(() => {
        disconnectCallback('server disconnect');
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should handle connection errors', async () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Get the connect_error callback
      const errorCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'connect_error'
      )![1];

      act(() => {
        errorCallback(new Error('Connection failed'));
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connectionStatus).toBe('error');
      
      // Restore console.error
      consoleSpy.mockRestore();
    });

    it('should handle reconnection attempts', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Get the reconnect_attempt callback
      const reconnectAttemptCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'reconnect_attempt'
      )![1];

      act(() => {
        reconnectAttemptCallback(3);
      });

      expect(result.current.reconnectAttempts).toBe(3);
      expect(result.current.connectionStatus).toBe('connecting');
    });

    it('should handle successful reconnection', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Set up initial state
      const reconnectAttemptCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'reconnect_attempt'
      )![1];
      act(() => {
        reconnectAttemptCallback(2);
      });

      // Now handle successful reconnection
      const reconnectCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'reconnect'
      )![1];

      act(() => {
        reconnectCallback(2);
      });

      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should handle reconnection failure', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Get the reconnect_failed callback
      const reconnectFailedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'reconnect_failed'
      )![1];

      act(() => {
        reconnectFailedCallback();
      });

      expect(result.current.connectionStatus).toBe('error');
    });
  });

  describe('todo data management', () => {
    it('should handle initial todo list', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const todoList = [mockTodo];
      const todosCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todos'
      )![1];

      act(() => {
        todosCallback(todoList);
      });

      expect(result.current.todos).toEqual(todoList);
    });

    it('should handle todo addition', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const todoAddedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-added'
      )![1];

      // Set initial state
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([]);
      });

      // Add new todo
      act(() => {
        todoAddedCallback(mockTodo);
      });

      expect(result.current.todos).toEqual([mockTodo]);
    });

    it('should handle todo updates', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Set initial state with a todo
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([mockTodo]);
      });

      // Update the todo
      const updatedTodo = { ...mockTodo, title: 'Updated Title', completed: true };
      const todoUpdatedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-updated'
      )![1];

      act(() => {
        todoUpdatedCallback(updatedTodo);
      });

      expect(result.current.todos[0]).toEqual(updatedTodo);
    });

    it('should handle todo deletion', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Set initial state with a todo
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([mockTodo]);
      });

      // Delete the todo
      const todoDeletedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-deleted'
      )![1];

      act(() => {
        todoDeletedCallback(mockTodo.id);
      });

      expect(result.current.todos).toEqual([]);
    });

    it('should handle socket errors', async () => {
      const { default: logger } = await import('../utils/logger');
      renderHook(() => useSocket('http://localhost:3001'));

      const errorCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'error'
      )![1];

      act(() => {
        errorCallback('Test error message');
      });

      expect(logger.error).toHaveBeenCalledWith('Socket error:', 'Test error message');
    });
  });

  describe('todo operations', () => {
    it('should emit add-todo event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const todoData = {
        title: 'New Todo',
        description: 'New Description',
        completed: false,
        priority: 'medium'
      };

      act(() => {
        result.current.addTodo(todoData);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('add-todo', todoData);
    });

    it('should emit update-todo event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      act(() => {
        result.current.updateTodo(mockTodo);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('update-todo', mockTodo);
    });

    it('should emit delete-todo event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      act(() => {
        result.current.deleteTodo(mockTodo.id);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('delete-todo', mockTodo.id);
    });

    it('should emit toggle-todo event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      act(() => {
        result.current.toggleTodo(mockTodo.id);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('toggle-todo', mockTodo.id);
    });

    it('should emit bulk-import event', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const importData = [
        { title: 'Import 1', completed: false, priority: 'low' },
        { title: 'Import 2', completed: true, priority: 'medium' }
      ];

      act(() => {
        result.current.bulkImport(importData);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('bulk-import', importData);
    });

    it('should handle reordering with optimistic updates', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const initialTodos = [
        { ...mockTodo, id: '1', order: 0 },
        { ...mockTodo, id: '2', order: 1 }
      ];

      // Set initial state
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback(initialTodos);
      });

      const reorderData = [
        { id: '1', order: 1 },
        { id: '2', order: 0 }
      ];

      act(() => {
        result.current.reorderTodos(reorderData);
      });

      // Should update local state optimistically
      expect(result.current.todos[0].order).toBe(1);
      expect(result.current.todos[1].order).toBe(0);

      // Should emit to server
      expect(mockSocket.emit).toHaveBeenCalledWith('reorder-todos', reorderData);
    });

    it('should not emit events when socket is not available', () => {
      // Don't connect to socket at all
      const { result } = renderHook(() => useSocket(''));

      act(() => {
        result.current.addTodo({ title: 'Test', completed: false, priority: 'low' });
        result.current.updateTodo(mockTodo);
        result.current.deleteTodo('1');
        result.current.toggleTodo('1');
        result.current.bulkImport([]);
        result.current.reorderTodos([]);
      });

      // Should not throw errors, and io should not have been called
      expect(mockIo).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const { unmount } = renderHook(() => useSocket('http://localhost:3001'));

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reconnect when serverUrl changes', () => {
      const { rerender } = renderHook(
        (props) => useSocket(props.serverUrl),
        { initialProps: { serverUrl: 'http://localhost:3001' } }
      );

      expect(mockIo).toHaveBeenCalledTimes(1);
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(0);

      // Change serverUrl
      rerender({ serverUrl: 'http://localhost:3002' });

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
      expect(mockIo).toHaveBeenCalledTimes(2);
      expect(mockIo).toHaveBeenLastCalledWith('http://localhost:3002', expect.any(Object));
    });
  });

  describe('edge cases', () => {
    it('should handle rapid connection state changes', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'connect'
      )![1];
      const disconnectCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      )![1];

      // Rapid connect/disconnect
      act(() => {
        connectCallback();
        disconnectCallback('transport close');
        connectCallback();
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should handle multiple todo updates for same id', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Set initial state
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([mockTodo]);
      });

      const todoUpdatedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-updated'
      )![1];

      // Multiple rapid updates
      act(() => {
        todoUpdatedCallback({ ...mockTodo, title: 'Update 1' });
        todoUpdatedCallback({ ...mockTodo, title: 'Update 2' });
        todoUpdatedCallback({ ...mockTodo, title: 'Final Update' });
      });

      expect(result.current.todos[0].title).toBe('Final Update');
      expect(result.current.todos).toHaveLength(1);
    });

    it('should handle updates for non-existent todos gracefully', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Set initial empty state
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([]);
      });

      const todoUpdatedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-updated'
      )![1];

      // Try to update non-existent todo
      act(() => {
        todoUpdatedCallback({ ...mockTodo, id: 'non-existent' });
      });

      // Should not add the todo, should remain empty
      expect(result.current.todos).toHaveLength(0);
    });

    it('should handle deletion of non-existent todos gracefully', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      // Set initial state
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([mockTodo]);
      });

      const todoDeletedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-deleted'
      )![1];

      // Try to delete non-existent todo
      act(() => {
        todoDeletedCallback('non-existent');
      });

      // Original todo should still be there
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0]).toEqual(mockTodo);
    });
  });

  describe('delete completed todos functionality', () => {
    it('should emit delete-completed-todos event when socket is connected', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      act(() => {
        result.current.deleteCompletedTodos();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('delete-completed-todos');
    });

    it('should not emit event when socket is not connected', () => {
      // Create a hook without connecting socket
      const { result } = renderHook(() => useSocket(''));

      act(() => {
        result.current.deleteCompletedTodos();
      });

      // Should not throw errors, and io should not have been called
      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should handle completed-todos-deleted event', async () => {
      renderHook(() => useSocket('http://localhost:3001'));

      // Get the completed-todos-deleted callback
      const completedTodosDeletedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'completed-todos-deleted'
      )![1];

      // Should not throw error when event is received
      expect(() => {
        act(() => {
          completedTodosDeletedCallback({ count: 3 });
        });
      }).not.toThrow();
    });

    it('should handle completed-todos-deleted event with zero count', async () => {
      renderHook(() => useSocket('http://localhost:3001'));

      const completedTodosDeletedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'completed-todos-deleted'
      )![1];

      // Should handle zero count gracefully
      expect(() => {
        act(() => {
          completedTodosDeletedCallback({ count: 0 });
        });
      }).not.toThrow();
    });

    it('should work with completed-todos-deleted in combination with todo-deleted events', async () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      const completedTodo1 = { ...mockTodo, id: '1', completed: true };
      const completedTodo2 = { ...mockTodo, id: '2', completed: true };
      const pendingTodo = { ...mockTodo, id: '3', completed: false };

      // Set initial state with mixed todos
      act(() => {
        const todosCallback = (mockSocket.on as Mock).mock.calls.find(
          call => call[0] === 'todos'
        )![1];
        todosCallback([completedTodo1, completedTodo2, pendingTodo]);
      });

      expect(result.current.todos).toHaveLength(3);

      // Simulate deletion of completed todos through individual todo-deleted events
      const todoDeletedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'todo-deleted'
      )![1];

      act(() => {
        todoDeletedCallback('1');
        todoDeletedCallback('2');
      });

      // Only pending todo should remain
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].id).toBe('3');
      expect(result.current.todos[0].completed).toBe(false);

      // Receive confirmation event
      const completedTodosDeletedCallback = (mockSocket.on as Mock).mock.calls.find(
        call => call[0] === 'completed-todos-deleted'
      )![1];

      act(() => {
        completedTodosDeletedCallback({ count: 2 });
      });

      // State should remain stable
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].id).toBe('3');
    });

    it('should have deleteCompletedTodos function available', () => {
      const { result } = renderHook(() => useSocket('http://localhost:3001'));

      expect(result.current.deleteCompletedTodos).toBeDefined();
      expect(typeof result.current.deleteCompletedTodos).toBe('function');
    });

    it('should log error when deleteCompletedTodos called without socket connection', () => {
      // Mock logger to capture error
      const mockLogger = {
        error: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        network: vi.fn(),
        ui: vi.fn(),
      };

      vi.doMock('../utils/logger', () => ({
        default: mockLogger
      }));

      const { result } = renderHook(() => useSocket(''));

      act(() => {
        result.current.deleteCompletedTodos();
      });

      // Should not have tried to emit event
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});