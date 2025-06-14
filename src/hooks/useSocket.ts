import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Todo } from '../types/todo';

export const useSocket = (serverUrl: string) => {
  const [todos, setTodos] = useState<Todo[]>([]);
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
      console.log('🔌 Socket connected to server');
      setConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      console.log('📤 Requesting todos from server');
      socket.emit('get-todos');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setConnected(false);
      setConnectionStatus('error');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
      setConnectionStatus('connecting');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setReconnectAttempts(0);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to server');
      setConnectionStatus('error');
    });

    socket.on('todos', (todoList: Todo[]) => {
      console.log('📥 Received todos from server:', todoList);
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

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
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

  return {
    todos,
    connected,
    connectionStatus,
    reconnectAttempts,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    bulkImport,
    reorderTodos
  };
};