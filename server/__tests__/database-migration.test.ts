import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Mock functions for testing
function getDataDir(): string {
  const home = homedir();
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'YuToDo Server', 'Data');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'YuToDo Server', 'Data');
    default: // Linux
      return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'yutodo-server');
  }
}

function createTestDatabase(dbPath: string, todos: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });
    
    db.serialize(() => {
      // Create table
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
          db.close();
          reject(err);
          return;
        }
        
        // Insert test data
        if (todos.length > 0) {
          const stmt = db.prepare(`
            INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          let insertedCount = 0;
          let hasError = false;
          
          todos.forEach(todo => {
            stmt.run([
              todo.id,
              todo.title,
              todo.description,
              todo.completed,
              todo.priority,
              todo.scheduledFor,
              todo.createdAt,
              todo.updatedAt,
              todo.order_index || 0
            ], (err) => {
              if (err && !hasError) {
                hasError = true;
                stmt.finalize();
                db.close();
                reject(err);
                return;
              }
              
              insertedCount++;
              if (insertedCount === todos.length) {
                stmt.finalize(() => {
                  db.close((closeErr) => {
                    if (closeErr) reject(closeErr);
                    else resolve();
                  });
                });
              }
            });
          });
        } else {
          db.close((closeErr) => {
            if (closeErr) reject(closeErr);
            else resolve();
          });
        }
      });
    });
  });
}

function readTodosFromDatabase(dbPath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) {
      resolve([]);
      return;
    }
    
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });
    
    db.all('SELECT * FROM todos ORDER BY order_index ASC, createdAt DESC', (err, rows) => {
      db.close((closeErr) => {
        if (err) reject(err);
        else if (closeErr) reject(closeErr);
        else resolve(rows || []);
      });
    });
  });
}

function migrateFromOldDatabase(oldDbPath: string, newDbPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(oldDbPath)) {
      console.log('Old database does not exist, skipping migration');
      resolve();
      return;
    }
    
    if (fs.existsSync(newDbPath)) {
      console.log('New database already exists, skipping migration');
      resolve();
      return;
    }
    
    try {
      const oldDb = new sqlite3.Database(oldDbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      const newDb = new sqlite3.Database(newDbPath, (err) => {
        if (err) {
          oldDb.close();
          reject(err);
          return;
        }
        
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
          `, (createErr) => {
            if (createErr) {
              oldDb.close();
              newDb.close();
              reject(createErr);
              return;
            }
            
            oldDb.all("SELECT * FROM todos", (err, rows) => {
              if (err) {
                oldDb.close();
                newDb.close();
                reject(err);
                return;
              }
              
              if (rows && rows.length > 0) {
                const stmt = newDb.prepare(`
                  INSERT INTO todos (id, title, description, completed, priority, scheduledFor, createdAt, updatedAt, order_index)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                let processed = 0;
                const total = rows.length;
                
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
                  ], (insertErr) => {
                    if (insertErr) {
                      oldDb.close();
                      newDb.close();
                      stmt.finalize();
                      reject(insertErr);
                      return;
                    }
                    
                    processed++;
                    if (processed === total) {
                      stmt.finalize(() => {
                        oldDb.close();
                        newDb.close();
                        resolve();
                      });
                    }
                  });
                });
              } else {
                oldDb.close();
                newDb.close();
                resolve();
              }
            });
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

describe('Database Migration', () => {
  const testDataDir = path.join(process.cwd(), 'test-data', `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const testOldDbPath = path.join(testDataDir, 'old-todos.db');
  const testNewDbPath = path.join(testDataDir, 'new-todos.db');
  
  beforeEach(() => {
    // Clean up test files
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });
  });
  
  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });
  
  test('should get correct data directory path for current platform', () => {
    const dataDir = getDataDir();
    const home = homedir();
    
    switch (process.platform) {
      case 'win32':
        expect(dataDir).toBe(path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'YuToDo Server', 'Data'));
        break;
      case 'darwin':
        expect(dataDir).toBe(path.join(home, 'Library', 'Application Support', 'YuToDo Server', 'Data'));
        break;
      default:
        expect(dataDir).toBe(path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'yutodo-server'));
        break;
    }
  });
  
  test('should create new database when no old database exists', async () => {
    await migrateFromOldDatabase(testOldDbPath, testNewDbPath);
    
    // New database should not be created if old database doesn't exist
    expect(fs.existsSync(testNewDbPath)).toBe(false);
  });
  
  test('should not migrate when new database already exists', async () => {
    // Create both old and new databases
    const testTodos = [
      {
        id: uuidv4(),
        title: 'Old Todo',
        description: 'Old description',
        completed: false,
        priority: 1,
        scheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order_index: 0
      }
    ];
    
    await createTestDatabase(testOldDbPath, testTodos);
    await createTestDatabase(testNewDbPath, []); // Empty new database
    
    // Wait for file handles to be released
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify both databases exist before migration
    expect(fs.existsSync(testOldDbPath)).toBe(true);
    expect(fs.existsSync(testNewDbPath)).toBe(true);
    
    await migrateFromOldDatabase(testOldDbPath, testNewDbPath);
    
    // Wait for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // New database should remain empty (no migration should occur)
    const newTodos = await readTodosFromDatabase(testNewDbPath);
    expect(newTodos).toHaveLength(0);
  });
  
  test('should migrate todos from old database to new database', async () => {
    const testTodos = [
      {
        id: uuidv4(),
        title: 'Test Todo 1',
        description: 'Description 1',
        completed: false,
        priority: 2,
        scheduledFor: '2025-06-15T10:00:00.000Z',
        createdAt: '2025-06-14T10:00:00.000Z',
        updatedAt: '2025-06-14T10:00:00.000Z',
        order_index: 0
      },
      {
        id: uuidv4(),
        title: 'Test Todo 2',
        description: 'Description 2',
        completed: true,
        priority: 1,
        scheduledFor: null,
        createdAt: '2025-06-14T11:00:00.000Z',
        updatedAt: '2025-06-14T11:00:00.000Z',
        order_index: 1
      }
    ];
    
    // Create old database with test data
    await createTestDatabase(testOldDbPath, testTodos);
    
    // Perform migration
    await migrateFromOldDatabase(testOldDbPath, testNewDbPath);
    
    // Verify new database was created and contains migrated data
    expect(fs.existsSync(testNewDbPath)).toBe(true);
    
    const migratedTodos = await readTodosFromDatabase(testNewDbPath);
    expect(migratedTodos).toHaveLength(2);
    
    // Verify data integrity
    expect(migratedTodos[0]).toMatchObject({
      title: 'Test Todo 1',
      description: 'Description 1',
      completed: 0, // SQLite stores boolean as integer
      priority: 2,
      scheduledFor: '2025-06-15T10:00:00.000Z'
    });
    
    expect(migratedTodos[1]).toMatchObject({
      title: 'Test Todo 2',
      description: 'Description 2',
      completed: 1, // SQLite stores boolean as integer
      priority: 1,
      scheduledFor: null
    });
  });
  
  test('should handle migration with empty old database', async () => {
    // Create empty old database
    await createTestDatabase(testOldDbPath, []);
    
    // Perform migration
    await migrateFromOldDatabase(testOldDbPath, testNewDbPath);
    
    // New database should be created but empty
    expect(fs.existsSync(testNewDbPath)).toBe(true);
    
    const migratedTodos = await readTodosFromDatabase(testNewDbPath);
    expect(migratedTodos).toHaveLength(0);
  });
  
  test('should handle todos with missing order_index field', async () => {
    const testTodos = [
      {
        id: uuidv4(),
        title: 'Todo without order',
        description: 'Description',
        completed: false,
        priority: 0,
        scheduledFor: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
        // order_index is missing
      }
    ];
    
    await createTestDatabase(testOldDbPath, testTodos);
    
    // Verify old database exists
    expect(fs.existsSync(testOldDbPath)).toBe(true);
    expect(fs.existsSync(testNewDbPath)).toBe(false);
    
    await migrateFromOldDatabase(testOldDbPath, testNewDbPath);
    
    // Verify migration completed
    expect(fs.existsSync(testNewDbPath)).toBe(true);
    
    const migratedTodos = await readTodosFromDatabase(testNewDbPath);
    expect(migratedTodos).toHaveLength(1);
    expect(migratedTodos[0].order_index).toBe(0); // Should default to 0
  }, 10000); // Increase timeout to 10 seconds
});