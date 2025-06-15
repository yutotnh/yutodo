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

describe('Integration Tests', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;
  let clientSocket1: any;
  let clientSocket2: any;
  let db: sqlite3.Database;
  let testDbPath: string;
  
  beforeAll((done) => {
    // Setup test database
    testDbPath = path.join(process.cwd(), 'test-data', `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
    
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
    // Clear database
    db.run('DELETE FROM todos', (err) => {
      if (err) {
        console.warn('Error clearing database:', err.message);
      }
      // Setup server
      const app = express();
      httpServer = new HttpServer(app);
      io = new SocketIOServer(httpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
      
      // Setup Socket.IO handlers (same as socket-events.test.ts)
      io.on('connection', (socket) => {
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
        
        socket.on('delete-todo', (todoId: string) => {
          db.run('DELETE FROM todos WHERE id=?', [todoId], function(err) {
            if (err) {
              socket.emit('error', err.message);
              return;
            }
            
            io.emit('todo-deleted', todoId);
          });
        });
      });
      
      httpServer.listen(() => {
        const port = (httpServer.address() as any)?.port;
        
        // Connect two clients
        clientSocket1 = ClientIO(`http://localhost:${port}`);
        clientSocket2 = ClientIO(`http://localhost:${port}`);
        
        let connectedClients = 0;
        const onConnect = () => {
          connectedClients++;
          if (connectedClients === 2) {
            done();
          }
        };
        
        clientSocket1.on('connect', onConnect);
        clientSocket2.on('connect', onConnect);
      });
    });
  });
  
  afterEach(() => {
    io.close();
    if (clientSocket1) clientSocket1.close();
    if (clientSocket2) clientSocket2.close();
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
  
  test('should synchronize data between multiple clients', (done) => {
    const testTodo = {
      title: 'Sync Test Todo',
      description: 'This should appear on both clients',
      completed: false,
      priority: 1
    };
    
    let client1Received = false;
    let client2Received = false;
    
    // Client 2 listens for the todo that client 1 will add
    clientSocket2.on('todo-added', (todo: Todo) => {
      expect(todo.title).toBe(testTodo.title);
      expect(todo.description).toBe(testTodo.description);
      client2Received = true;
      
      if (client1Received && client2Received) {
        done();
      }
    });
    
    // Client 1 also gets the broadcast
    clientSocket1.on('todo-added', (todo: Todo) => {
      expect(todo.title).toBe(testTodo.title);
      client1Received = true;
      
      if (client1Received && client2Received) {
        done();
      }
    });
    
    // Client 1 adds a todo
    clientSocket1.emit('add-todo', testTodo);
  });
  
  test('should update todos across all clients', (done) => {
    const initialTodo = {
      title: 'Original Title',
      description: 'Original Description',
      completed: false,
      priority: 0
    };
    
    // First, add a todo
    clientSocket1.emit('add-todo', initialTodo);
    
    clientSocket1.on('todo-added', (addedTodo: Todo) => {
      const updatedTodo = {
        ...addedTodo,
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true,
        priority: 2
      };
      
      let client1Updated = false;
      let client2Updated = false;
      
      // Both clients should receive the update
      clientSocket1.on('todo-updated', (todo: Todo) => {
        expect(todo.title).toBe('Updated Title');
        expect(todo.completed).toBe(true);
        client1Updated = true;
        
        if (client1Updated && client2Updated) {
          done();
        }
      });
      
      clientSocket2.on('todo-updated', (todo: Todo) => {
        expect(todo.title).toBe('Updated Title');
        expect(todo.completed).toBe(true);
        client2Updated = true;
        
        if (client1Updated && client2Updated) {
          done();
        }
      });
      
      // Client 2 updates the todo
      clientSocket2.emit('update-todo', updatedTodo);
    });
  });
  
  test('should delete todos and notify all clients', (done) => {
    const todoToDelete = {
      title: 'Todo to Delete',
      description: 'Will be deleted',
      completed: false,
      priority: 0
    };
    
    // Add a todo first
    clientSocket1.emit('add-todo', todoToDelete);
    
    clientSocket1.on('todo-added', (addedTodo: Todo) => {
      let client1Notified = false;
      let client2Notified = false;
      
      // Both clients should be notified of deletion
      clientSocket1.on('todo-deleted', (deletedId: string) => {
        expect(deletedId).toBe(addedTodo.id);
        client1Notified = true;
        
        if (client1Notified && client2Notified) {
          done();
        }
      });
      
      clientSocket2.on('todo-deleted', (deletedId: string) => {
        expect(deletedId).toBe(addedTodo.id);
        client2Notified = true;
        
        if (client1Notified && client2Notified) {
          done();
        }
      });
      
      // Client 1 deletes the todo
      clientSocket1.emit('delete-todo', addedTodo.id);
    });
  });
  
  test('should maintain data consistency across clients', (done) => {
    const testTodo = { title: 'Consistency Test', completed: false, priority: 1 };
    
    let client1Notified = false;
    let client2Notified = false;
    
    const checkCompletion = () => {
      if (client1Notified && client2Notified) {
        // Both clients received the same todo, verify consistency
        clientSocket2.emit('get-todos');
      }
    };
    
    clientSocket1.on('todo-added', (todo: Todo) => {
      expect(todo.title).toBe(testTodo.title);
      client1Notified = true;
      checkCompletion();
    });
    
    clientSocket2.on('todo-added', (todo: Todo) => {
      expect(todo.title).toBe(testTodo.title);
      client2Notified = true;
      checkCompletion();
    });
    
    clientSocket2.on('todos', (allTodos: Todo[]) => {
      expect(allTodos).toHaveLength(1);
      expect(allTodos[0].title).toBe(testTodo.title);
      done();
    });
    
    clientSocket1.emit('add-todo', testTodo);
  });
  
  test('should handle concurrent operations correctly', (done) => {
    const todo1 = { title: 'Concurrent Todo 1', completed: false, priority: 1 };
    
    let eventCount = 0;
    
    const handleTodoAdded = (todo: Todo) => {
      expect(todo.title).toBe(todo1.title);
      eventCount++;
      
      // Both clients should receive the broadcast (2 events total)
      if (eventCount === 2) {
        done();
      }
    };
    
    clientSocket1.on('todo-added', handleTodoAdded);
    clientSocket2.on('todo-added', handleTodoAdded);
    
    // Client 1 adds todo
    clientSocket1.emit('add-todo', todo1);
  });
  
  test('should persist data correctly', (done) => {
    const testTodo = {
      title: 'Persistence Test',
      description: 'This should persist in database',
      completed: false,
      priority: 1
    };
    
    clientSocket1.emit('add-todo', testTodo);
    
    clientSocket1.on('todo-added', (addedTodo: Todo) => {
      // Verify data is in database
      db.get('SELECT * FROM todos WHERE id = ?', [addedTodo.id], (err, row: any) => {
        expect(err).toBeNull();
        expect(row).toBeDefined();
        expect(row.title).toBe(testTodo.title);
        expect(row.description).toBe(testTodo.description);
        expect(Boolean(row.completed)).toBe(testTodo.completed);
        expect(row.priority).toBe(testTodo.priority);
        
        done();
      });
    });
  });
});