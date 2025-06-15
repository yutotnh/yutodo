// Jest setup file for server tests
const fs = require('fs');
const path = require('path');

// Increase timeout for SQLite operations in test environment
jest.setTimeout(20000);

// Ensure test data directory exists
const testDataDir = path.join(process.cwd(), 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Mock console methods to reduce test output noise (except when debugging)
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  // Suppress console output during tests unless in debug mode
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterEach(() => {
  // Restore console methods
  if (!process.env.DEBUG_TESTS) {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up test files after all tests
afterAll(() => {
  try {
    // Clean up test data directory
    const testDataDir = path.join(process.cwd(), 'test-data');
    if (fs.existsSync(testDataDir)) {
      const files = fs.readdirSync(testDataDir);
      files.forEach(file => {
        try {
          const filePath = path.join(testDataDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      
      // Try to remove directory if empty
      try {
        fs.rmdirSync(testDataDir);
      } catch (e) {
        // Directory might not be empty, that's ok
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
});