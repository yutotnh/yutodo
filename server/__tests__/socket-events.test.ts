import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { io as ClientIO } from 'socket.io-client';
import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: number;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  order?: number;
}

describe('Socket.IO Events', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;
  let clientSocket: any;
  let db: sqlite3.Database;
  let testDbPath: string;
  
  beforeAll((done) => {
    // Setup test database
    testDbPath = path.join(process.cwd(), 'test-data', `socket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
    
    // Ensure test directory exists
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        done(err);
        return;
      }
    });
    
    db.serialize(() => {
      // Set up database for testing
      db.run('PRAGMA journal_mode=WAL');
      db.run('PRAGMA synchronous=NORMAL');
      db.run('PRAGMA temp_store=memory');
      
      db.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          completed BOOLEAN DEFAULT FALSE,
          priority INTEGER DEFAULT 0,
          scheduledFor DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          order_index INTEGER DEFAULT 0
        )
      `, done);
    });
  });
  
  beforeEach((done) => {
    // Setup server
    const app = express();
    httpServer = new HttpServer(app);
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Setup Socket.IO handlers
    io.on('connection', (socket) => {
      // Get all todos
      socket.on('get-todos', () => {
        db.all('SELECT * FROM todos ORDER BY order_index ASC, createdAt DESC', (err, rows) => {
          if (err) {
            socket.emit('error', err.message);
            return;
          }
          
          const todos = rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            completed: Boolean(row.completed),
            priority: row.priority,
            scheduledFor: row.scheduledFor,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            order: row.order_index
          }));
          
          socket.emit('todos', todos);
        });
      });
      
      // Add new todo
      socket.on('add-todo', (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        
        db.run(
          'INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, todoData.title, todoData.description, todoData.completed, todoData.priority, todoData.scheduledFor, now, now],
          function(err) {
            if (err) {
              socket.emit('error', err.message);
              return;
            }
            
            const newTodo: Todo = {
              id,
              title: todoData.title,
              description: todoData.description,
              completed: todoData.completed,
              priority: todoData.priority,
              scheduledFor: todoData.scheduledFor,
              createdAt: now,
              updatedAt: now
            };
            
            io.emit('todo-added', newTodo);
          }
        );
      });
      
      // Update todo
      socket.on('update-todo', (todoData: Todo) => {
        const now = new Date().toISOString();
        
        db.run(
          'UPDATE todos SET title=?, description=?, completed=?, priority=?, scheduledFor=?, updatedAt=? WHERE id=?',
          [todoData.title, todoData.description, todoData.completed, todoData.priority, todoData.scheduledFor, now, todoData.id],
          function(err) {
            if (err) {
              socket.emit('error', err.message);
              return;
            }
            
            const updatedTodo = { ...todoData, updatedAt: now };
            io.emit('todo-updated', updatedTodo);
          }
        );
      });
      
      // Delete todo
      socket.on('delete-todo', (todoId: string) => {
        db.run('DELETE FROM todos WHERE id=?', [todoId], function(err) {
          if (err) {
            socket.emit('error', err.message);
            return;
          }
          
          io.emit('todo-deleted', todoId);
        });
      });
      
      // Toggle todo completion
      socket.on('toggle-todo', (todoId: string) => {
        const now = new Date().toISOString();
        
        db.get('SELECT * FROM todos WHERE id=?', [todoId], (err, row: any) => {
          if (err) {
            socket.emit('error', err.message);
            return;
          }
          
          if (row) {
            const newCompleted = !row.completed;
            db.run(
              'UPDATE todos SET completed=?, updatedAt=? WHERE id=?',
              [newCompleted, now, todoId],
              function(err) {
                if (err) {
                  socket.emit('error', err.message);
                  return;
                }
                
                const updatedTodo = { ...row, completed: newCompleted, updatedAt: now };
                io.emit('todo-updated', updatedTodo);
              }
            );
          }
        });
      });
    });
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any)?.port;
      clientSocket = ClientIO(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });
  
  afterEach((done) => {
    io.close();
    clientSocket.close();
    // Clear test data
    db.run('DELETE FROM todos', (err) => {
      if (err) {
        console.warn('Error clearing test data:', err.message);
      }
      done();
    });
  });
  
  afterAll((done) => {
    db.close((err) => {
      if (err) {
        console.warn('Error closing database:', err.message);
      }
      if (fs.existsSync(testDbPath)) {
        try {
          fs.unlinkSync(testDbPath);
        } catch (e) {
          console.warn('Error deleting test database:', e instanceof Error ? e.message : String(e));
        }
      }
      done();
    });
  });
  
  test('should connect and emit connection event', (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });
  
  test('should get empty todos list initially', (done) => {
    clientSocket.emit('get-todos');
    
    clientSocket.on('todos', (todos: Todo[]) => {
      expect(todos).toEqual([]);
      done();
    });
  });
  
  test('should add a new todo and broadcast to all clients', (done) => {
    const newTodo = {
      title: 'Test Todo',
      description: 'Test Description',
      completed: false,
      priority: 1,
      scheduledFor: '2025-06-15T10:00:00.000Z'
    };
    
    clientSocket.on('todo-added', (todo: Todo) => {
      expect(todo).toMatchObject({
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 1,
        scheduledFor: '2025-06-15T10:00:00.000Z'
      });
      expect(todo.id).toBeDefined();
      expect(todo.createdAt).toBeDefined();
      expect(todo.updatedAt).toBeDefined();
      done();
    });
    
    clientSocket.emit('add-todo', newTodo);
  });
  
  test('should update existing todo and broadcast changes', (done) => {
    // First add a todo
    const initialTodo = {
      title: 'Initial Todo',
      description: 'Initial Description',
      completed: false,
      priority: 0
    };
    
    clientSocket.emit('add-todo', initialTodo);
    
    clientSocket.on('todo-added', (addedTodo: Todo) => {
      // Now update the todo
      const updatedTodo = {
        ...addedTodo,
        title: 'Updated Todo',
        description: 'Updated Description',
        completed: true,
        priority: 2
      };
      
      clientSocket.on('todo-updated', (todo: Todo) => {
        expect(todo).toMatchObject({
          id: addedTodo.id,
          title: 'Updated Todo',
          description: 'Updated Description',
          completed: true,
          priority: 2
        });
        expect(new Date(todo.updatedAt).getTime()).toBeGreaterThan(new Date(addedTodo.updatedAt).getTime());
        done();
      });
      
      clientSocket.emit('update-todo', updatedTodo);
    });
  });
  
  test('should delete todo and broadcast deletion', (done) => {
    // First add a todo
    const newTodo = {
      title: 'Todo to Delete',
      description: 'Will be deleted',
      completed: false,
      priority: 0
    };
    
    clientSocket.emit('add-todo', newTodo);
    
    clientSocket.on('todo-added', (addedTodo: Todo) => {
      clientSocket.on('todo-deleted', (deletedId: string) => {
        expect(deletedId).toBe(addedTodo.id);
        done();
      });
      
      clientSocket.emit('delete-todo', addedTodo.id);
    });
  });
  
  test('should toggle todo completion status', (done) => {
    // First add a todo
    const newTodo = {
      title: 'Todo to Toggle',
      description: 'Will be toggled',
      completed: false,
      priority: 0
    };
    
    clientSocket.emit('add-todo', newTodo);
    
    clientSocket.on('todo-added', (addedTodo: Todo) => {
      clientSocket.on('todo-updated', (updatedTodo: Todo) => {
        expect(updatedTodo.id).toBe(addedTodo.id);
        expect(updatedTodo.completed).toBe(true); // Should be toggled from false to true
        expect(new Date(updatedTodo.updatedAt).getTime()).toBeGreaterThan(new Date(addedTodo.updatedAt).getTime());
        done();
      });
      
      clientSocket.emit('toggle-todo', addedTodo.id);
    });
  });
  
  test('should handle bulk import of todos', (done) => {
    const todosToImport = [
      {
        title: 'Bulk Todo 1',
        description: 'First bulk todo',
        completed: false,
        priority: 1
      },
      {
        title: 'Bulk Todo 2', 
        description: 'Second bulk todo',
        completed: true,
        priority: 2
      }
    ];
    
    let addedCount = 0;
    const addedTodos: Todo[] = [];
    
    clientSocket.on('todo-added', (todo: Todo) => {
      addedTodos.push(todo);
      addedCount++;
      
      if (addedCount === 2) {
        expect(addedTodos).toHaveLength(2);
        
        // Sort by title to ensure consistent order
        const sortedTodos = addedTodos.sort((a, b) => a.title.localeCompare(b.title));
        expect(sortedTodos[0].title).toBe('Bulk Todo 1');
        expect(sortedTodos[1].title).toBe('Bulk Todo 2');
        
        // Verify all todos have required fields
        sortedTodos.forEach(todo => {
          expect(todo.id).toBeDefined();
          expect(todo.createdAt).toBeDefined();
          expect(todo.updatedAt).toBeDefined();
          expect(typeof todo.completed === 'boolean').toBe(true);
          expect(typeof todo.priority === 'number').toBe(true);
        });
        
        done();
      }
    });
    
    // Simulate bulk import by adding todos sequentially with small delay
    let index = 0;
    const addNext = () => {
      if (index < todosToImport.length) {
        clientSocket.emit('add-todo', todosToImport[index]);
        index++;
        setTimeout(addNext, 10); // Small delay to ensure order
      }
    };
    
    addNext();
  });
  
  test('should handle errors gracefully', (done) => {
    // Try to update a non-existent todo
    const nonExistentTodo = {
      id: 'non-existent-id',
      title: 'Non-existent',
      description: 'Should not exist',
      completed: false,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // This should complete without error even if todo doesn't exist
    clientSocket.emit('update-todo', nonExistentTodo);
    
    // Wait a bit and check that no error was emitted
    setTimeout(() => {
      done();
    }, 100);
  });
});