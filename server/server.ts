import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { serverConfigManager } from './src/config/ServerConfigManager';
import { ServerConfig } from './src/types/config';
import { ObservabilityManager, initializeObservability, getObservability } from './src/observability/ObservabilityManager';

// Initialize configuration (will be properly set up after config loading)
let config: ServerConfig;
let app: express.Application;
let server: any;
let io: SocketIOServer;
let db: sqlite3.Database;
let scheduleExecutor: ScheduleExecutor;
let observabilityManager: ObservabilityManager;

// Function to initialize server with configuration
async function initializeServer() {
  // Initialize configuration system
  await serverConfigManager.initialize();
  config = serverConfigManager.getConfig();
  
  console.log('⚙️ Server configuration loaded:');
  console.log(`  Port: ${config.server.port}`);
  console.log(`  Host: ${config.server.host}`);
  console.log(`  CORS Origins: ${config.security.cors_origins.join(', ')}`);
  console.log(`  Database: ${config.database.location}`);
  console.log(`  Schedule Interval: ${config.schedules.check_interval}s`);
  
  // Initialize observability systems (before database and app initialization)
  observabilityManager = initializeObservability(
    {
      logging: config.logging,
      observability: config.observability
    }
    // Database connection will be set later via updateDatabaseConnection
  );
  
  app = express();
  server = createServer(app);
  // CORS設定: ワイルドカードまたは具体的なオリジンをサポート
  const corsOrigin = config.security.cors_origins.includes('*') 
    ? true  // '*' の場合はすべてのオリジンを許可
    : config.security.cors_origins.length === 1 && config.security.cors_origins[0] === '*'
    ? true  // ['*'] の場合もすべてのオリジンを許可
    : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // 開発環境用: localhost:1400-1500 の範囲を自動的に許可
        if (origin && /^http:\/\/localhost:(1[4-5]\d{2})$/.test(origin)) {
          callback(null, true);
        } else if (!origin || config.security.cors_origins.includes(origin)) {
          // オリジンなし（同一オリジン）または設定されたオリジンリストに含まれる場合
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      };
  
  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      methods: config.security.cors_methods,
      credentials: true
    }
  });
  
  return { app, server, io };
}

// app.use moved to startServer function

// OS別のデータディレクトリを取得（サーバー専用）
function getDataDir(): string {
  const home = homedir();
  
  switch (process.platform) {
    case 'win32':
      // Windows: %APPDATA%/YuToDo Server/Data
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'YuToDo Server', 'Data');
    case 'darwin':
      // macOS: ~/Library/Application Support/YuToDo Server/Data
      return path.join(home, 'Library', 'Application Support', 'YuToDo Server', 'Data');
    default: // Linux, etc.
      // Linux: ~/.local/share/yutodo-server
      return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'yutodo-server');
  }
}

// データベースパスを取得（設定に基づく + テスト環境対応）
function getDatabasePath(): string {
  // 🧪 TEST ENVIRONMENT: Use in-memory database for testing
  const isTest = process.env.NODE_ENV === 'test' || process.env.YUTODO_TEST === 'true';
  
  if (isTest) {
    console.log('🧪 TEST MODE: Using in-memory database for complete isolation');
    return ':memory:';
  }
  
  // Production/development: Use configuration-based path
  const dbLocation = config.database.location;
  
  if (dbLocation === 'auto') {
    const dataDir = getDataDir();
    return path.join(dataDir, 'todos.db');
  } else {
    return path.resolve(dbLocation);
  }
}

// データディレクトリを初期化
function initializeDataDirectory(): string {
  const dbPath = getDatabasePath();
  const dataDir = path.dirname(dbPath);
  
  // ディレクトリが存在しない場合は作成
  if (!existsSync(dataDir)) {
    console.log(`📁 Creating data directory: ${dataDir}`);
    try {
      mkdirSync(dataDir, { recursive: true });
      console.log(`✅ Data directory created successfully: ${dataDir}`);
    } catch (error) {
      console.error(`❌ Failed to create data directory: ${dataDir}`, error);
      throw new Error(`Failed to create data directory: ${(error as Error).message}`);
    }
  } else {
    console.log(`📁 Data directory already exists: ${dataDir}`);
  }
  
  console.log(`💾 Database location: ${dbPath}`);
  return dbPath;
}

// 旧データベースからのマイグレーション処理
function migrateFromOldDatabase(newDbPath: string): void {
  // 複数の旧パスをチェック
  const oldPaths = [
    path.join(__dirname, 'todos.db'), // リポジトリ内
    // 旧クライアント/サーバー共有パス
    process.platform === 'win32' 
      ? path.join(homedir(), 'AppData', 'Roaming', 'YuToDo', 'todos.db')
      : process.platform === 'darwin'
      ? path.join(homedir(), 'Library', 'Application Support', 'YuToDo', 'todos.db')
      : path.join(homedir(), '.local', 'share', 'YuToDo', 'todos.db')
  ];
  
  // 存在する旧DBを探す
  let oldDbPath: string | null = null;
  for (const path of oldPaths) {
    if (existsSync(path)) {
      oldDbPath = path;
      break;
    }
  }
  
  if (oldDbPath && existsSync(oldDbPath) && !existsSync(newDbPath)) {
    console.log(`🔄 Migrating data from old database: ${oldDbPath}`);
    
    try {
      // 旧DBからデータを読み込み
      const oldDb = new sqlite3.Database(oldDbPath);
      const newDb = new sqlite3.Database(newDbPath);
      
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
        
        newDb.run(`
          CREATE TABLE IF NOT EXISTS schedules (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            priority INTEGER DEFAULT 0,
            type TEXT NOT NULL,
            startDate TEXT NOT NULL,
            endDate TEXT,
            time TEXT,
            weeklyConfig TEXT,
            monthlyConfig TEXT,
            customConfig TEXT,
            excludeWeekends BOOLEAN DEFAULT FALSE,
            excludeDates TEXT,
            isActive BOOLEAN DEFAULT TRUE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            lastExecuted DATETIME,
            nextExecution DATETIME
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
// Migration moved to initializeDatabaseWithConfig function

// SQLite database setup
// Database will be initialized in startServer function
// const db = new sqlite3.Database(dbPath); // Moved to initializeDatabaseWithConfig

// Database table initialization moved to migrateFromOldDatabase function
// All database setup is now handled in initializeDatabaseWithConfig
/*
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT FALSE,
      priority INTEGER DEFAULT 0,
      scheduledFor DATETIME,
      startDate DATE,
      endDate DATE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      order_index INTEGER DEFAULT 0
    )
  `);
  
  // Add startDate and endDate columns if they don't exist (migration)
  db.run(`ALTER TABLE todos ADD COLUMN startDate DATE`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding startDate column:', err);
    }
  });
  
  db.run(`ALTER TABLE todos ADD COLUMN endDate DATE`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding endDate column:', err);
    }
  });
  
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      time TEXT,
      weeklyConfig TEXT,
      monthlyConfig TEXT,
      customConfig TEXT,
      excludeWeekends BOOLEAN DEFAULT FALSE,
      excludeDates TEXT,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastExecuted DATETIME,
      nextExecution DATETIME
    )
  `);
});
*/

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

interface MonthlyConfig {
  type: 'date' | 'weekday' | 'lastDay';
  date?: number;
  weekNumber?: number;
  dayOfWeek?: number;
  daysFromEnd?: number;
  time?: string;
}

interface Schedule {
  id: string;
  title: string;
  description?: string;
  priority: number;
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate?: string;
  time?: string;
  weeklyConfig?: {
    daysOfWeek: number[];
    time?: string;
  };
  monthlyConfig?: MonthlyConfig;
  customConfig?: {
    interval: number;
    unit: 'days' | 'weeks' | 'months';
    time?: string;
    startDate?: string;
    endDate?: string;
    maxOccurrences?: number;
  };
  excludeWeekends?: boolean;
  excludeDates?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string;
  nextExecution?: string;
}

// Socket.IOハンドラーを設定する関数
function setupSocketHandlers() {
  io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Monitor socket connection
  if (observabilityManager) {
    observabilityManager.monitorSocketConnection('connect', {
      socketId: socket.id,
      userAgent: socket.handshake.headers['user-agent']
    });
  }

  // Send all todos to newly connected client
  socket.on('get-todos', () => {
    const startTime = Date.now();
    console.log('📤 Client requested todos');
    
    // Monitor socket event
    if (observabilityManager) {
      observabilityManager.monitorSocketEvent('get-todos', 'inbound', null, {
        socketId: socket.id
      });
    }
    const dbStartTime = Date.now();
    db.all('SELECT * FROM todos ORDER BY order_index ASC, createdAt DESC', (err, rows) => {
      const duration = Date.now() - startTime;
      const dbDuration = Date.now() - dbStartTime;
      
      if (err) {
        console.error('❌ Database error:', err);
        socket.emit('error', err.message);
        
        // Monitor database error
        if (observabilityManager) {
          observabilityManager.monitorError(err, {
            socketId: socket.id,
            operation: 'get-todos',
            component: 'database'
          });
        }
        return;
      }
      
      // Monitor database query
      if (observabilityManager) {
        observabilityManager.monitorDatabaseQuery(
          'SELECT * FROM todos ORDER BY order_index ASC, createdAt DESC',
          'todos',
          'SELECT',
          dbDuration,
          { socketId: socket.id, recordCount: rows.length }
        );
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
      
      // Monitor outbound socket event
      if (observabilityManager) {
        observabilityManager.monitorSocketEvent('todos', 'outbound', { count: todos.length }, {
          socketId: socket.id,
          duration: duration
        });
      }
    });
  });

  // Add new todo
  socket.on('add-todo', (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const startTime = Date.now();
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Monitor socket event
    if (observabilityManager) {
      observabilityManager.monitorSocketEvent('add-todo', 'inbound', todoData, {
        socketId: socket.id,
        todoId: id
      });
    }
    
    const dbStartTime = Date.now();
    db.run(
      'INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, todoData.title, todoData.description, todoData.completed, todoData.priority, todoData.scheduledFor, now, now],
      function(err) {
        const dbDuration = Date.now() - dbStartTime;
        const totalDuration = Date.now() - startTime;
        
        if (err) {
          socket.emit('error', err.message);
          
          // Monitor database error
          if (observabilityManager) {
            observabilityManager.monitorError(err, {
              socketId: socket.id,
              operation: 'add-todo',
              component: 'database',
              todoId: id
            });
          }
          return;
        }
        
        // Monitor database operation
        if (observabilityManager) {
          observabilityManager.monitorDatabaseQuery(
            'INSERT INTO todos',
            'todos',
            'INSERT',
            dbDuration,
            { socketId: socket.id, todoId: id }
          );
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
        
        // Monitor todo creation
        if (observabilityManager) {
          observabilityManager.monitorTodoEvent('created', String(todoData.priority), {
            socketId: socket.id,
            todoId: id,
            duration: totalDuration
          });
        }
        
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

  // Delete all completed todos
  socket.on('delete-completed-todos', () => {
    const startTime = Date.now();
    
    // Monitor socket event
    if (observabilityManager) {
      observabilityManager.monitorSocketEvent('delete-completed-todos', 'inbound', null, {
        socketId: socket.id
      });
    }

    // First get all completed todo IDs to broadcast their deletion
    const dbStartTime = Date.now();
    db.all('SELECT id FROM todos WHERE completed = 1', (err, rows: any[]) => {
      const dbDuration = Date.now() - dbStartTime;
      
      if (err) {
        console.error('❌ Database error:', err);
        socket.emit('error', err.message);
        
        // Monitor database error
        if (observabilityManager) {
          observabilityManager.monitorError(err, {
            socketId: socket.id,
            operation: 'delete-completed-todos-select',
            component: 'database'
          });
        }
        return;
      }

      const completedTodoIds = rows.map(row => row.id);

      // Monitor database query
      if (observabilityManager) {
        observabilityManager.monitorDatabaseQuery(
          'SELECT id FROM todos WHERE completed = 1',
          'todos',
          'SELECT',
          dbDuration,
          { socketId: socket.id, recordCount: completedTodoIds.length }
        );
      }

      if (completedTodoIds.length === 0) {
        // No completed todos to delete
        socket.emit('completed-todos-deleted', { count: 0 });
        return;
      }

      // Delete all completed todos
      const deleteStartTime = Date.now();
      db.run('DELETE FROM todos WHERE completed = 1', function(err) {
        const deleteDuration = Date.now() - deleteStartTime;
        const totalDuration = Date.now() - startTime;
        
        if (err) {
          console.error('❌ Database error deleting completed todos:', err);
          socket.emit('error', err.message);
          
          // Monitor database error
          if (observabilityManager) {
            observabilityManager.monitorError(err, {
              socketId: socket.id,
              operation: 'delete-completed-todos-delete',
              component: 'database'
            });
          }
          return;
        }

        // Monitor database operation
        if (observabilityManager) {
          observabilityManager.monitorDatabaseQuery(
            'DELETE FROM todos WHERE completed = 1',
            'todos',
            'DELETE',
            deleteDuration,
            { socketId: socket.id, affectedRows: this.changes }
          );
        }

        // Broadcast each deleted todo ID to all clients for state synchronization
        completedTodoIds.forEach(todoId => {
          io.emit('todo-deleted', todoId);
        });

        // Send completion notification with count
        socket.emit('completed-todos-deleted', { count: this.changes });

        // Monitor outbound socket event
        if (observabilityManager) {
          observabilityManager.monitorSocketEvent('completed-todos-deleted', 'outbound', { count: this.changes }, {
            socketId: socket.id,
            duration: totalDuration
          });
        }
      });
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

  // Schedule operations
  socket.on('get-schedules', () => {
    console.log('📤 Client requested schedules');
    db.all('SELECT * FROM schedules ORDER BY createdAt DESC', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        socket.emit('error', err.message);
        return;
      }
      
      console.log(`📋 Found ${rows.length} schedules in database`);
      
      const schedules = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        type: row.type,
        startDate: row.startDate,
        endDate: row.endDate,
        time: row.time,
        weeklyConfig: row.weeklyConfig ? JSON.parse(row.weeklyConfig) : undefined,
        monthlyConfig: row.monthlyConfig ? JSON.parse(row.monthlyConfig) : undefined,
        customConfig: row.customConfig ? JSON.parse(row.customConfig) : undefined,
        excludeWeekends: Boolean(row.excludeWeekends),
        excludeDates: row.excludeDates ? JSON.parse(row.excludeDates) : undefined,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastExecuted: row.lastExecuted,
        nextExecution: row.nextExecution
      }));
      
      console.log('📤 Sending schedules to client:', schedules);
      socket.emit('schedules', schedules);
    });
  });

  // Add new schedule
  socket.on('add-schedule', (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Calculate initial next execution time
    const nextExecution = scheduleExecutor.calculateInitialNextExecution({
      ...scheduleData,
      id,
      createdAt: now,
      updatedAt: now
    } as Schedule);
    
    db.run(
      `INSERT INTO schedules (
        id, title, description, priority, type, startDate, endDate, time,
        weeklyConfig, monthlyConfig, customConfig, excludeWeekends, excludeDates,
        isActive, createdAt, updatedAt, lastExecuted, nextExecution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, scheduleData.title, scheduleData.description, scheduleData.priority,
        scheduleData.type, scheduleData.startDate, scheduleData.endDate, scheduleData.time,
        scheduleData.weeklyConfig ? JSON.stringify(scheduleData.weeklyConfig) : null,
        scheduleData.monthlyConfig ? JSON.stringify(scheduleData.monthlyConfig) : null,
        scheduleData.customConfig ? JSON.stringify(scheduleData.customConfig) : null,
        scheduleData.excludeWeekends, 
        scheduleData.excludeDates ? JSON.stringify(scheduleData.excludeDates) : null,
        scheduleData.isActive, now, now, null, nextExecution
      ],
      function(err) {
        if (err) {
          socket.emit('error', err.message);
          return;
        }
        
        const newSchedule: Schedule = {
          id,
          title: scheduleData.title,
          description: scheduleData.description,
          priority: scheduleData.priority,
          type: scheduleData.type,
          startDate: scheduleData.startDate,
          endDate: scheduleData.endDate,
          time: scheduleData.time,
          weeklyConfig: scheduleData.weeklyConfig,
          monthlyConfig: scheduleData.monthlyConfig,
          customConfig: scheduleData.customConfig,
          excludeWeekends: scheduleData.excludeWeekends,
          excludeDates: scheduleData.excludeDates,
          isActive: scheduleData.isActive,
          createdAt: now,
          updatedAt: now,
          lastExecuted: undefined,
          nextExecution: nextExecution || undefined
        };
        
        // Broadcast to all clients
        io.emit('schedule-added', newSchedule);
      }
    );
  });

  // Update schedule
  socket.on('update-schedule', (scheduleData: Schedule) => {
    const now = new Date().toISOString();
    
    // Recalculate next execution time for updated schedule
    const nextExecution = scheduleExecutor.calculateInitialNextExecution(scheduleData);
    
    db.run(
      `UPDATE schedules SET 
        title=?, description=?, priority=?, type=?, startDate=?, endDate=?, time=?,
        weeklyConfig=?, monthlyConfig=?, customConfig=?, excludeWeekends=?, excludeDates=?,
        isActive=?, updatedAt=?, nextExecution=?
      WHERE id=?`,
      [
        scheduleData.title, scheduleData.description, scheduleData.priority,
        scheduleData.type, scheduleData.startDate, scheduleData.endDate, scheduleData.time,
        scheduleData.weeklyConfig ? JSON.stringify(scheduleData.weeklyConfig) : null,
        scheduleData.monthlyConfig ? JSON.stringify(scheduleData.monthlyConfig) : null,
        scheduleData.customConfig ? JSON.stringify(scheduleData.customConfig) : null,
        scheduleData.excludeWeekends,
        scheduleData.excludeDates ? JSON.stringify(scheduleData.excludeDates) : null,
        scheduleData.isActive, now, nextExecution,
        scheduleData.id
      ],
      function(err) {
        if (err) {
          socket.emit('error', err.message);
          return;
        }
        
        const updatedSchedule = { 
          ...scheduleData, 
          updatedAt: now,
          nextExecution: nextExecution || undefined
        };
        io.emit('schedule-updated', updatedSchedule);
      }
    );
  });

  // Delete schedule
  socket.on('delete-schedule', (scheduleId: string) => {
    db.run('DELETE FROM schedules WHERE id=?', [scheduleId], function(err) {
      if (err) {
        socket.emit('error', err.message);
        return;
      }
      
      io.emit('schedule-deleted', scheduleId);
    });
  });

  // Toggle schedule active status
  socket.on('toggle-schedule', (scheduleId: string) => {
    const now = new Date().toISOString();
    
    db.get('SELECT * FROM schedules WHERE id=?', [scheduleId], (err, row: any) => {
      if (err) {
        socket.emit('error', err.message);
        return;
      }
      
      if (row) {
        const newIsActive = !Boolean(row.isActive);
        db.run(
          'UPDATE schedules SET isActive=?, updatedAt=? WHERE id=?',
          [newIsActive, now, scheduleId],
          function(err) {
            if (err) {
              socket.emit('error', err.message);
              return;
            }
            
            const updatedSchedule = {
              id: row.id,
              title: row.title,
              description: row.description,
              priority: row.priority,
              type: row.type,
              startDate: row.startDate,
              endDate: row.endDate,
              time: row.time,
              weeklyConfig: row.weeklyConfig ? JSON.parse(row.weeklyConfig) : undefined,
              monthlyConfig: row.monthlyConfig ? JSON.parse(row.monthlyConfig) : undefined,
              customConfig: row.customConfig ? JSON.parse(row.customConfig) : undefined,
              excludeWeekends: Boolean(row.excludeWeekends),
              excludeDates: row.excludeDates ? JSON.parse(row.excludeDates) : undefined,
              isActive: newIsActive,
              createdAt: row.createdAt,
              updatedAt: now,
              lastExecuted: row.lastExecuted,
              nextExecution: row.nextExecution
            };
            io.emit('schedule-updated', updatedSchedule);
          }
        );
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Monitor socket disconnection
    if (observabilityManager) {
      observabilityManager.monitorSocketConnection('disconnect', {
        socketId: socket.id
      });
    }
  });
});
}

class ScheduleExecutor {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL: number;
  
  constructor() {
    // スケジュール間隔を設定から取得（ミリ秒に変換）
    this.CHECK_INTERVAL = config.schedules.check_interval * 1000;
  }

  start() {
    if (this.intervalId) {
      console.log('⚠️  Schedule executor already running');
      return;
    }

    console.log('🚀 Starting schedule execution engine...');
    this.intervalId = setInterval(() => {
      this.checkSchedules();
    }, this.CHECK_INTERVAL);

    // Also check immediately on startup
    this.checkSchedules();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  Schedule execution engine stopped');
    }
  }

  private checkSchedules() {
    const now = new Date();
    console.log(`🔍 Checking schedules at ${now.toISOString()}`);

    db.all(
      'SELECT * FROM schedules WHERE isActive = 1',
      (err, rows: any[]) => {
        if (err) {
          console.error('❌ Error fetching schedules:', err);
          return;
        }

        console.log(`📋 Found ${rows.length} active schedules`);

        rows.forEach(row => {
          const schedule = this.parseScheduleRow(row);
          this.processSchedule(schedule, now);
        });
      }
    );
  }

  private parseScheduleRow(row: any): Schedule {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      type: row.type,
      startDate: row.startDate,
      endDate: row.endDate,
      time: row.time,
      weeklyConfig: row.weeklyConfig ? JSON.parse(row.weeklyConfig) : undefined,
      monthlyConfig: row.monthlyConfig ? JSON.parse(row.monthlyConfig) : undefined,
      customConfig: row.customConfig ? JSON.parse(row.customConfig) : undefined,
      excludeWeekends: Boolean(row.excludeWeekends),
      excludeDates: row.excludeDates ? JSON.parse(row.excludeDates) : undefined,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastExecuted: row.lastExecuted,
      nextExecution: row.nextExecution
    };
  }

  private processSchedule(schedule: Schedule, now: Date) {
    const shouldExecute = this.shouldExecuteSchedule(schedule, now);
    
    if (shouldExecute) {
      console.log(`⚡ Executing schedule: ${schedule.title}`);
      this.executeSchedule(schedule, now);
    }
  }

  private shouldExecuteSchedule(schedule: Schedule, now: Date): boolean {
    // Check if schedule has a nextExecution time
    if (!schedule.nextExecution) {
      return false;
    }

    // Check if schedule has already been executed recently (within the last minute)
    if (schedule.lastExecuted) {
      const lastExec = new Date(schedule.lastExecuted);
      const timeDiff = now.getTime() - lastExec.getTime();
      if (timeDiff < 60000) { // Less than 1 minute ago
        return false;
      }
    }

    // Parse nextExecution time properly (local datetime format)
    const nextExecTime = new Date(schedule.nextExecution);
    if (isNaN(nextExecTime.getTime())) {
      console.error(`Invalid nextExecution time for schedule ${schedule.id}: ${schedule.nextExecution}`);
      return false;
    }

    // Check if current time has passed the next execution time
    return now >= nextExecTime;
  }

  private isScheduleTimeMatch(schedule: Schedule, now: Date): boolean {
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM in local time
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if we're before the start date
    if (currentDate < schedule.startDate) {
      return false;
    }

    // Check if we're after the end date
    if (schedule.endDate && currentDate > schedule.endDate) {
      return false;
    }

    // Check exclude dates
    if (schedule.excludeDates && schedule.excludeDates.includes(currentDate)) {
      return false;
    }

    switch (schedule.type) {
      case 'once':
        return currentDate === schedule.startDate && 
               currentTime === (schedule.time || '09:00');

      case 'daily':
        // Check if weekends should be excluded
        if (schedule.excludeWeekends && (currentDayOfWeek === 0 || currentDayOfWeek === 6)) {
          return false;
        }
        return currentTime === (schedule.time || '09:00');

      case 'weekly':
        if (!schedule.weeklyConfig?.daysOfWeek) return false;
        return schedule.weeklyConfig.daysOfWeek.includes(currentDayOfWeek) &&
               currentTime === (schedule.weeklyConfig.time || schedule.time || '09:00');

      case 'monthly':
        return this.isMonthlyScheduleMatch(schedule, now);

      case 'custom':
        return this.isCustomScheduleMatch(schedule, now);

      default:
        return false;
    }
  }

  private isMonthlyScheduleMatch(schedule: Schedule, now: Date): boolean {
    if (!schedule.monthlyConfig) return false;

    const currentTime = now.toTimeString().slice(0, 5);
    const scheduleTime = schedule.monthlyConfig.time || schedule.time || '09:00';
    
    if (currentTime !== scheduleTime) return false;

    const { monthlyConfig } = schedule;
    const currentDate = now.getDate();
    const currentDayOfWeek = now.getDay();

    switch (monthlyConfig.type) {
      case 'date':
        return currentDate === (monthlyConfig.date || 1);

      case 'weekday':
        if (!monthlyConfig.weekNumber || monthlyConfig.dayOfWeek === undefined) return false;
        return this.isNthWeekdayOfMonth(now, monthlyConfig.weekNumber, monthlyConfig.dayOfWeek);

      case 'lastDay':
        const daysFromEnd = monthlyConfig.daysFromEnd || 1;
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return currentDate === (lastDayOfMonth - daysFromEnd + 1);

      default:
        return false;
    }
  }

  private isNthWeekdayOfMonth(date: Date, weekNumber: number, dayOfWeek: number): boolean {
    const currentDayOfWeek = date.getDay();
    if (currentDayOfWeek !== dayOfWeek) return false;

    if (weekNumber === -1) {
      // Last occurrence of the weekday in the month
      const nextWeek = new Date(date);
      nextWeek.setDate(date.getDate() + 7);
      return nextWeek.getMonth() !== date.getMonth();
    } else {
      // Nth occurrence (1st, 2nd, 3rd, 4th)
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstOccurrence = new Date(firstDayOfMonth);
      
      // Find the first occurrence of this weekday in the month
      const daysToAdd = (dayOfWeek - firstDayOfMonth.getDay() + 7) % 7;
      firstOccurrence.setDate(1 + daysToAdd);
      
      // Calculate the Nth occurrence
      const nthOccurrence = new Date(firstOccurrence);
      nthOccurrence.setDate(firstOccurrence.getDate() + (weekNumber - 1) * 7);
      
      return date.getDate() === nthOccurrence.getDate() && 
             date.getMonth() === nthOccurrence.getMonth();
    }
  }

  private isCustomScheduleMatch(schedule: Schedule, now: Date): boolean {
    if (!schedule.customConfig) return false;

    const { customConfig } = schedule;
    const currentTime = now.toTimeString().slice(0, 5);
    const scheduleTime = customConfig.time || schedule.time || '09:00';
    
    if (currentTime !== scheduleTime) return false;

    // Calculate if current date matches the custom interval
    const startDate = new Date(customConfig.startDate || schedule.startDate);
    const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (customConfig.unit) {
      case 'days':
        return daysDiff >= 0 && daysDiff % customConfig.interval === 0;

      case 'weeks':
        const weeksDiff = Math.floor(daysDiff / 7);
        return weeksDiff >= 0 && weeksDiff % customConfig.interval === 0 && now.getDay() === startDate.getDay();

      case 'months':
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
        return monthsDiff >= 0 && monthsDiff % customConfig.interval === 0 && 
               now.getDate() === startDate.getDate();

      default:
        return false;
    }
  }

  private executeSchedule(schedule: Schedule, executionTime: Date) {
    // Create a new todo based on the schedule
    const todoId = uuidv4();
    const now = executionTime.toISOString();

    // Generate local date string without timezone conversion
    const getLocalDateString = (date: Date): string => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const todoData = {
      id: todoId,
      title: schedule.title,
      description: undefined, // Don't copy schedule description to avoid "Generated from schedule" message
      completed: false,
      priority: schedule.priority,
      scheduledFor: undefined, // Don't set due date for schedule-generated tasks
      createdAt: now,
      updatedAt: now
    };

    // Insert the new todo
    db.run(
      'INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [todoId, todoData.title, todoData.description, todoData.completed, todoData.priority, todoData.scheduledFor, todoData.createdAt, todoData.updatedAt],
      (err) => {
        if (err) {
          console.error('❌ Error creating todo from schedule:', err);
          return;
        }

        console.log(`✅ Created todo "${todoData.title}" from schedule`);

        // Broadcast the new todo to all connected clients
        io.emit('todo-added', todoData);

        // Update the schedule's lastExecuted time and calculate nextExecution
        this.updateScheduleExecution(schedule, executionTime);
      }
    );
  }

  private updateScheduleExecution(schedule: Schedule, executionTime: Date) {
    // Store lastExecuted in local timezone format for consistency
    const lastExecutedDateStr = executionTime.getFullYear() + '-' + 
                               String(executionTime.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(executionTime.getDate()).padStart(2, '0');
    const lastExecutedTimeStr = String(executionTime.getHours()).padStart(2, '0') + ':' + 
                               String(executionTime.getMinutes()).padStart(2, '0') + ':' + 
                               String(executionTime.getSeconds()).padStart(2, '0');
    const lastExecuted = `${lastExecutedDateStr}T${lastExecutedTimeStr}`;
    const nextExecution = this.calculateNextExecution(schedule, executionTime);

    db.run(
      'UPDATE schedules SET lastExecuted = ?, nextExecution = ?, updatedAt = ? WHERE id = ?',
      [lastExecuted, nextExecution, lastExecuted, schedule.id],
      (err) => {
        if (err) {
          console.error('❌ Error updating schedule execution times:', err);
          return;
        }

        console.log(`📅 Updated schedule "${schedule.title}" - Next execution: ${nextExecution || 'N/A'}`);

        // Broadcast updated schedule to all connected clients
        const updatedSchedule = {
          ...schedule,
          lastExecuted,
          nextExecution,
          updatedAt: lastExecuted
        };
        io.emit('schedule-updated', updatedSchedule);
      }
    );
  }

  public calculateInitialNextExecution(schedule: Schedule): string | null {
    // For 'once' type schedules, the next execution is the start date + time
    if (schedule.type === 'once') {
      // Create date string in local timezone format to avoid UTC conversion
      const timeStr = schedule.time || '09:00';
      const localDateTimeStr = `${schedule.startDate}T${timeStr}:00`;
      
      // Validate the date
      const startDateTime = new Date(localDateTimeStr);
      if (isNaN(startDateTime.getTime())) {
        console.error(`Invalid date/time for schedule ${schedule.id}: ${localDateTimeStr}`);
        return null;
      }
      
      // Return the local datetime string to preserve timezone
      return localDateTimeStr;
    }
    
    // For recurring schedules, calculate the next execution time from now
    const now = new Date();
    const startDate = new Date(schedule.startDate + 'T00:00:00');
    
    // If start date is in the future, use start date; otherwise use current time
    const calculationBase = startDate > now ? startDate : now;
    
    return this.calculateNextExecutionFromDate(schedule, calculationBase);
  }

  private calculateNextExecutionFromDate(schedule: Schedule, fromDate: Date): string | null {
    // This method calculates the next execution time for recurring schedules
    if (schedule.type === 'once') {
      return null; // Once schedules don't have recurring executions
    }

    const next = new Date(fromDate);

    switch (schedule.type) {
      case 'daily':
        // For daily schedules, find the next occurrence
        const targetTime = schedule.time || '09:00';
        const [hours, minutes] = targetTime.split(':').map(Number);
        
        next.setHours(hours, minutes, 0, 0);
        
        // If today's time has already passed, move to tomorrow
        if (next <= fromDate) {
          next.setDate(next.getDate() + 1);
        }
        
        // Skip weekends if configured
        if (schedule.excludeWeekends) {
          while (next.getDay() === 0 || next.getDay() === 6) {
            next.setDate(next.getDate() + 1);
          }
        }
        break;

      case 'weekly':
        // For weekly schedules, find the next scheduled day
        if (schedule.weeklyConfig?.daysOfWeek) {
          const currentDayOfWeek = next.getDay();
          const sortedDays = [...schedule.weeklyConfig.daysOfWeek].sort();
          const targetTime = schedule.weeklyConfig.time || schedule.time || '09:00';
          const [hours, minutes] = targetTime.split(':').map(Number);
          
          // Find next scheduled day
          let nextDay = sortedDays.find(day => {
            if (day > currentDayOfWeek) return true;
            if (day === currentDayOfWeek) {
              // Same day - check if time hasn't passed
              const testDate = new Date(next);
              testDate.setHours(hours, minutes, 0, 0);
              return testDate > fromDate;
            }
            return false;
          });
          
          if (!nextDay) {
            // Go to next week, first scheduled day
            nextDay = sortedDays[0];
            const daysToAdd = 7 - currentDayOfWeek + nextDay;
            next.setDate(next.getDate() + daysToAdd);
          } else {
            next.setDate(next.getDate() + (nextDay - currentDayOfWeek));
          }
          
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'monthly':
        if (schedule.monthlyConfig) {
          const targetTime = schedule.monthlyConfig.time || schedule.time || '09:00';
          const [hours, minutes] = targetTime.split(':').map(Number);
          
          // Calculate this month's target date
          this.adjustToMonthlySchedule(next, schedule.monthlyConfig);
          next.setHours(hours, minutes, 0, 0);
          
          // If this month's date has passed, move to next month
          if (next <= fromDate) {
            next.setMonth(next.getMonth() + 1);
            this.adjustToMonthlySchedule(next, schedule.monthlyConfig);
            next.setHours(hours, minutes, 0, 0);
          }
        }
        break;

      case 'custom':
        if (schedule.customConfig) {
          const targetTime = schedule.customConfig.time || schedule.time || '09:00';
          const [hours, minutes] = targetTime.split(':').map(Number);
          const startDate = new Date(schedule.startDate + 'T00:00:00');
          
          // Calculate next occurrence based on interval
          let intervalCount = 0;
          const testDate = new Date(startDate);
          
          while (testDate <= fromDate) {
            intervalCount++;
            testDate.setTime(startDate.getTime());
            
            switch (schedule.customConfig.unit) {
              case 'days':
                testDate.setDate(startDate.getDate() + (intervalCount * schedule.customConfig.interval));
                break;
              case 'weeks':
                testDate.setDate(startDate.getDate() + (intervalCount * schedule.customConfig.interval * 7));
                break;
              case 'months':
                testDate.setMonth(startDate.getMonth() + (intervalCount * schedule.customConfig.interval));
                break;
            }
            
            testDate.setHours(hours, minutes, 0, 0);
          }
          
          next.setTime(testDate.getTime());
        }
        break;

      default:
        return null;
    }

    // Check if we've exceeded the end date
    const nextDateStr = next.getFullYear() + '-' + 
                       String(next.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(next.getDate()).padStart(2, '0');
    if (schedule.endDate && nextDateStr > schedule.endDate) {
      return null;
    }

    // Return local datetime string to preserve timezone
    const nextTimeStr = String(next.getHours()).padStart(2, '0') + ':' + 
                       String(next.getMinutes()).padStart(2, '0');
    return `${nextDateStr}T${nextTimeStr}:00`;
  }

  private calculateNextExecution(schedule: Schedule, lastExecution: Date): string | null {
    // For 'once' type schedules, there's no next execution after completion
    if (schedule.type === 'once') {
      return null;
    }

    // Use the new method to calculate next execution from the last execution time
    return this.calculateNextExecutionFromDate(schedule, lastExecution);
  }

  private adjustToMonthlySchedule(date: Date, monthlyConfig: MonthlyConfig) {
    switch (monthlyConfig.type) {
      case 'date':
        const targetDate = monthlyConfig.date || 1;
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(targetDate, lastDayOfMonth));
        break;

      case 'weekday':
        if (monthlyConfig.weekNumber && monthlyConfig.dayOfWeek !== undefined) {
          const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          const firstOccurrence = new Date(firstDayOfMonth);
          const daysToAdd = (monthlyConfig.dayOfWeek - firstDayOfMonth.getDay() + 7) % 7;
          firstOccurrence.setDate(1 + daysToAdd);
          
          if (monthlyConfig.weekNumber === -1) {
            // Last occurrence
            const lastOccurrence = new Date(firstOccurrence);
            while (lastOccurrence.getMonth() === date.getMonth()) {
              lastOccurrence.setDate(lastOccurrence.getDate() + 7);
            }
            lastOccurrence.setDate(lastOccurrence.getDate() - 7);
            date.setDate(lastOccurrence.getDate());
          } else {
            // Nth occurrence
            const nthOccurrence = new Date(firstOccurrence);
            nthOccurrence.setDate(firstOccurrence.getDate() + (monthlyConfig.weekNumber - 1) * 7);
            if (nthOccurrence.getMonth() === date.getMonth()) {
              date.setDate(nthOccurrence.getDate());
            }
          }
        }
        break;

      case 'lastDay':
        const daysFromEnd = monthlyConfig.daysFromEnd || 1;
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(lastDay - daysFromEnd + 1);
        break;
    }
  }
}

// ScheduleExecutorはメイン初期化関数内で作成される
// (設定が読み込まれた後に作成する必要がある)

// メイン初期化関数
async function startServer() {
  try {
    // 設定システムを初期化
    await initializeServer();
    
    // データベースパスを初期化
    const dbPath = initializeDataDirectory();
    
    // データベースを設定で初期化
    initializeDatabaseWithConfig(dbPath);
    
    // スケジュール実行エンジンを作成
    scheduleExecutor = new ScheduleExecutor();
    
    // ミドルウェアを設定
    app.use(express.json({ limit: config.security.max_request_size }));
    
    // Basic root health check endpoint
    app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        service: 'yutodo-server',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString()
      });
    });
    
    // 既存のAPIエンドポイントを設定（ここに既存のio.onハンドラーを移動）
    setupSocketHandlers();
    
    // 🧪 TEST ENVIRONMENT: Add data clearing endpoint for E2E tests
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.YUTODO_TEST === 'true';
    
    if (isTestEnv) {
      console.log('🧪 ADDING TEST ENDPOINTS for database isolation');
      
      // Clear all test data endpoint
      app.post('/test/clear-data', (req, res) => {
        console.log('🧼 CLEARING ALL TEST DATA');
        
        db.serialize(() => {
          // Clear all tables
          db.run('DELETE FROM todos', function(err) {
            if (err) {
              console.error('❌ Failed to clear todos:', err.message);
              res.status(500).json({ error: 'Failed to clear todos' });
              return;
            }
            console.log('✅ Todos table cleared');
          });
          
          db.run('DELETE FROM schedules', function(err) {
            if (err) {
              console.error('❌ Failed to clear schedules:', err.message);
              res.status(500).json({ error: 'Failed to clear schedules' });
              return;
            }
            console.log('✅ Schedules table cleared');
          });
          
          // Reset SQLite sequence counters
          db.run('DELETE FROM sqlite_sequence WHERE name IN ("todos", "schedules")', function(err) {
            if (err) {
              console.log('⚠️ Note: Could not reset sequence counters (this is normal for in-memory DB)');
            }
            console.log('🎯 TEST DATA CLEARING COMPLETED');
            res.json({ success: true, message: 'All test data cleared' });
          });
        });
      });
      
      // Get test data stats endpoint
      app.get('/test/data-stats', (req, res) => {
        db.get('SELECT COUNT(*) as todoCount FROM todos', (err, todoRow: any) => {
          if (err) {
            res.status(500).json({ error: 'Failed to get todo count' });
            return;
          }
          
          db.get('SELECT COUNT(*) as scheduleCount FROM schedules', (err, scheduleRow: any) => {
            if (err) {
              res.status(500).json({ error: 'Failed to get schedule count' });
              return;
            }
            
            res.json({
              todos: todoRow.todoCount,
              schedules: scheduleRow.scheduleCount,
              dbPath: getDatabasePath(),
              isTestMode: true
            });
          });
        });
      });
    }
    
    // サーバーを開始
    const PORT = config.server.port;
    const HOST = config.server.host;
    
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`🔧 Configuration file: ${serverConfigManager.getConfigFilePath()}`);
      
      // スケジュール実行エンジンを開始
      scheduleExecutor.start();
    });
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// データベースを設定で初期化
function initializeDatabaseWithConfig(dbPath: string): void {
  // 既存のマイグレーション処理を実行
  migrateFromOldDatabase(dbPath);
  
  // グローバルデータベース接続を設定に基づいて初期化
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
      process.exit(1);
    }
    
    console.log('💾 Applying database configuration...');
    
    // SQLiteプラグマを設定に基づいて適用
    const pragmas = [
      `PRAGMA cache_size = ${config.database.cache_size}`,
      `PRAGMA journal_mode = ${config.database.journal_mode}`,
      `PRAGMA synchronous = ${config.database.synchronous}`,
      `PRAGMA temp_store = ${config.database.temp_store}`
    ];
    
    db.serialize(() => {
      // プラグマを適用
      pragmas.forEach(pragma => {
        db.run(pragma, (err) => {
          if (err) {
            console.warn(`⚠️ Failed to apply pragma: ${pragma}`, err);
          } else {
            console.log(`✅ Applied: ${pragma}`);
          }
        });
      });
      
      // テーブルを作成（存在しない場合）
      console.log('🔧 Ensuring database tables exist...');
      
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
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create todos table:', err);
        } else {
          console.log('✅ Todos table ready');
        }
      });
      
      db.run(`
        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          priority INTEGER DEFAULT 0,
          type TEXT NOT NULL,
          startDate TEXT NOT NULL,
          endDate TEXT,
          time TEXT,
          weeklyConfig TEXT,
          monthlyConfig TEXT,
          customConfig TEXT,
          excludeWeekends BOOLEAN DEFAULT FALSE,
          excludeDates TEXT,
          isActive BOOLEAN DEFAULT TRUE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          lastExecuted DATETIME,
          nextExecution DATETIME
        )
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create schedules table:', err);
        } else {
          console.log('✅ Schedules table ready');
          
          // Initialize observability systems now that database is ready
          initializeObservabilitySystemsAsync();
        }
      });
    });
  });
}

// 非同期で可観測性システムを初期化
async function initializeObservabilitySystemsAsync(): Promise<void> {
  try {
    // Update observability manager with database connection
    observabilityManager = initializeObservability(
      {
        logging: config.logging,
        observability: config.observability
      },
      db // Pass database connection for health checks
    );
    
    // Initialize all observability systems
    await observabilityManager.initialize();
    
    // Log successful initialization
    const logger = observabilityManager.getLogger();
    if (logger) {
      logger.info('YuToDo server fully initialized with observability', {
        component: 'server',
        operation: 'startup_complete',
        port: config.server.port,
        environment: process.env.NODE_ENV || 'development'
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize observability systems:', error);
    // Continue startup even if observability fails
  }
}

// サーバーを開始
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  try {
    // Stop observability systems first
    if (observabilityManager) {
      await observabilityManager.shutdown();
    }
    
    // Stop other services
    if (scheduleExecutor) {
      scheduleExecutor.stop();
    }
    
    if (db) {
      db.close();
    }
    
    if (server) {
      server.close();
    }
    
    console.log('✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  try {
    if (observabilityManager) {
      await observabilityManager.shutdown();
    }
    
    if (scheduleExecutor) {
      scheduleExecutor.stop();
    }
    
    if (db) {
      db.close();
    }
    
    if (server) {
      server.close();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});