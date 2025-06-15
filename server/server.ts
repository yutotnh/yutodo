import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// OS別のデータディレクトリを取得
function getDataDir(): string {
  const home = homedir();
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'YuToDo');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'YuToDo');
    default: // Linux, etc.
      return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'YuToDo');
  }
}

// データディレクトリとDBパスを設定
const dataDir = getDataDir();
const dbPath = path.join(dataDir, 'todos.db');

// ディレクトリが存在しない場合は作成
if (!existsSync(dataDir)) {
  console.log(`📁 Creating data directory: ${dataDir}`);
  mkdirSync(dataDir, { recursive: true });
}

console.log(`💾 Database location: ${dbPath}`);

// 旧データベースからのマイグレーション処理
function migrateFromOldDatabase(): void {
  const oldDbPath = path.join(__dirname, 'todos.db');
  
  if (existsSync(oldDbPath) && !existsSync(dbPath)) {
    console.log(`🔄 Migrating data from old database: ${oldDbPath}`);
    
    try {
      // 旧DBからデータを読み込み
      const oldDb = new sqlite3.Database(oldDbPath);
      const newDb = new sqlite3.Database(dbPath);
      
      // 新DBのテーブルを作成
      newDb.serialize(() => {
        newDb.run(`
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
        `);
        
        // データをコピー
        oldDb.all("SELECT * FROM todos", (err, rows) => {
          if (err) {
            console.error('❌ Migration failed:', err);
            return;
          }
          
          if (rows && rows.length > 0) {
            console.log(`📤 Migrating ${rows.length} todos...`);
            
            const stmt = newDb.prepare(`
              INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            rows.forEach((row: any) => {
              stmt.run([
                row.id,
                row.title,
                row.description,
                row.completed,
                row.priority,
                row.scheduledFor,
                row.createdAt,
                row.updatedAt,
                row.order_index || 0
              ]);
            });
            
            stmt.finalize();
            console.log('✅ Migration completed successfully');
            console.log(`ℹ️  Old database still exists at: ${oldDbPath}`);
            console.log('💡 You can safely delete it after confirming data migration');
          } else {
            console.log('📭 No data to migrate from old database');
          }
          
          oldDb.close();
        });
      });
      
      newDb.close();
    } catch (error) {
      console.error('❌ Migration error:', error);
    }
  }
}

// マイグレーション実行
migrateFromOldDatabase();

// SQLite database setup
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
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
  `);
});

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send all todos to newly connected client
  socket.on('get-todos', () => {
    console.log('📤 Client requested todos');
    db.all('SELECT * FROM todos ORDER BY order_index ASC, createdAt DESC', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        socket.emit('error', err.message);
        return;
      }
      
      console.log(`📋 Found ${rows.length} todos in database`);
      
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
      
      console.log('📤 Sending todos to client:', todos);
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
        
        // Broadcast to all clients
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
    
    db.get('SELECT * FROM todos WHERE id=?', [todoId], (err, row: Todo) => {
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

  // Bulk import todos
  socket.on('bulk-import', (todos: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    let completed = 0;
    let failed = 0;

    todos.forEach((todoData) => {
      const id = uuidv4();
      
      db.run(
        'INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, todoData.title, todoData.description, todoData.completed, todoData.priority, todoData.scheduledFor, now, now],
        function(err) {
          if (err) {
            failed++;
            console.error('Error importing todo:', err);
          } else {
            completed++;
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
            
            // Broadcast to all clients
            io.emit('todo-added', newTodo);
          }
          
          // Send summary when all are processed
          if (completed + failed === todos.length) {
            socket.emit('bulk-import-complete', { completed, failed });
          }
        }
      );
    });
  });

  // Reorder todos
  socket.on('reorder-todos', (reorderedTodos: { id: string, order: number }[]) => {
    console.log('Reordering todos:', reorderedTodos);
    
    // Update each todo's order in the database
    const stmt = db.prepare('UPDATE todos SET order_index = ?, updatedAt = ? WHERE id = ?');
    const now = new Date().toISOString();
    
    reorderedTodos.forEach(({ id, order }) => {
      stmt.run([order, now, id], (err: any) => {
        if (err) {
          console.error('Error updating todo order:', err);
        }
      });
    });
    
    stmt.finalize(() => {
      // Get all todos with updated order and broadcast
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
        
        // Broadcast updated todos to all clients
        io.emit('todos', todos);
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  server.close();
  process.exit(0);
});