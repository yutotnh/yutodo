import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Todo, Schedule } from '../types/todo';
import logger from '../utils/logger';

export const useSocket = (serverUrl: string) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!serverUrl) return;

    setConnectionStatus('connecting');
    const socket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      logger.network('Socket connected to server');
      setConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      logger.network('Requesting todos and schedules from server');
      socket.emit('get-todos');
      socket.emit('get-schedules');
    });

    socket.on('disconnect', (reason) => {
      logger.network('Socket disconnected:', reason);
      setConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      logger.error('Socket connection error:', error);
      setConnected(false);
      setConnectionStatus('error');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      logger.network(`Reconnection attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
      setConnectionStatus('connecting');
    });

    socket.on('reconnect', (attemptNumber) => {
      logger.info(`Reconnected after ${attemptNumber} attempts`);
      setReconnectAttempts(0);
    });

    socket.on('reconnect_failed', () => {
      logger.error('Failed to reconnect to server');
      setConnectionStatus('error');
    });

    socket.on('todos', (todoList: Todo[]) => {
      logger.network('Received todos from server:', todoList.length, 'items');
      setTodos(todoList);
    });

    socket.on('todo-added', (todo: Todo) => {
      setTodos(prev => [todo, ...prev]);
    });

    socket.on('todo-updated', (updatedTodo: Todo) => {
      setTodos(prev => prev.map(todo => 
        todo.id === updatedTodo.id ? updatedTodo : todo
      ));
    });

    socket.on('todo-deleted', (todoId: string) => {
      setTodos(prev => prev.filter(todo => todo.id !== todoId));
    });

    socket.on('completed-todos-deleted', () => {
      // The individual todo-deleted events will handle the state updates
      // This event is just for confirmation/notification purposes
    });

    socket.on('error', (error: string) => {
      logger.error('Socket error:', error);
    });

    // Schedule event listeners
    socket.on('schedules', (scheduleList: Schedule[]) => {
      logger.network('Received schedules from server:', scheduleList.length, 'items');
      setSchedules(scheduleList);
    });

    socket.on('schedule-added', (schedule: Schedule) => {
      setSchedules(prev => [schedule, ...prev]);
    });

    socket.on('schedule-updated', (updatedSchedule: Schedule) => {
      setSchedules(prev => prev.map(schedule => 
        schedule.id === updatedSchedule.id ? updatedSchedule : schedule
      ));
    });

    socket.on('schedule-deleted', (scheduleId: string) => {
      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  const addTodo = (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (socketRef.current) {
      socketRef.current.emit('add-todo', todoData);
    }
  };

  const updateTodo = (todo: Todo) => {
    if (socketRef.current) {
      socketRef.current.emit('update-todo', todo);
    }
  };

  const deleteTodo = (todoId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('delete-todo', todoId);
    }
  };

  const deleteCompletedTodos = () => {
    if (socketRef.current) {
      socketRef.current.emit('delete-completed-todos');
    } else {
      logger.error('Cannot emit delete-completed-todos: socket not connected');
    }
  };

  const toggleTodo = (todoId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('toggle-todo', todoId);
    }
  };

  const bulkImport = (importTodos: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    if (socketRef.current) {
      socketRef.current.emit('bulk-import', importTodos);
    }
  };

  const reorderTodos = (reorderedTodos: { id: string, order: number }[]) => {
    // 楽観的更新：即座にローカル状態を更新
    const updatedTodos = todos.map(todo => {
      const newOrderData = reorderedTodos.find(r => r.id === todo.id);
      return newOrderData ? { ...todo, order: newOrderData.order } : todo;
    });
    setTodos(updatedTodos);

    // サーバーに送信
    if (socketRef.current) {
      socketRef.current.emit('reorder-todos', reorderedTodos);
    }
  };

  // Schedule functions
  const addSchedule = (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (socketRef.current) {
      socketRef.current.emit('add-schedule', scheduleData);
    }
  };

  const updateSchedule = (schedule: Schedule) => {
    if (socketRef.current) {
      socketRef.current.emit('update-schedule', schedule);
    }
  };

  const deleteSchedule = (scheduleId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('delete-schedule', scheduleId);
    }
  };

  const toggleSchedule = (scheduleId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('toggle-schedule', scheduleId);
    }
  };

  const retryConnection = () => {
    if (socketRef.current) {
      logger.network('Manual retry connection requested');
      setConnectionStatus('connecting');
      setReconnectAttempts(0);
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  };

  return {
    todos,
    schedules,
    connected,
    connectionStatus,
    reconnectAttempts,
    addTodo,
    updateTodo,
    deleteTodo,
    deleteCompletedTodos,
    toggleTodo,
    bulkImport,
    reorderTodos,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
    retryConnection
  };
};