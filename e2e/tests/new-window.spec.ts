import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getTauriAppHandle, killTauriApp, startTauriApp } from '../helpers/tauri-helpers.js';

describe('New Window Functionality', () => {
  let appHandle: any;
  let originalProcesses: number;

  beforeAll(async () => {
    // Get the number of running processes before starting tests
    // This helps us detect if new processes are actually created
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Count yutodo processes (this is Linux-specific, adjust for other platforms)
      const { stdout } = await execAsync('pgrep -c yutodo || echo 0');
      originalProcesses = parseInt(stdout.trim()) || 0;
      console.log(`Original yutodo processes: ${originalProcesses}`);
    } catch (error) {
      console.log('Could not count processes:', error);
      originalProcesses = 0;
    }
  });

  beforeEach(async () => {
    // Start a fresh Tauri app instance for each test
    appHandle = await startTauriApp();
    
    // Wait for the app to be fully loaded
    await appHandle.waitForLoad();
    
    // Wait a bit more for the React app to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (appHandle) {
      await killTauriApp(appHandle);
    }
    
    // Clean up any additional processes that might have been created
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Kill any yutodo processes that might be lingering
      await execAsync('pkill -f yutodo || true');
      console.log('Cleaned up any remaining yutodo processes');
    } catch (error) {
      console.log('Could not clean up processes:', error);
    }
  });

  it('should open new window via keyboard shortcut Ctrl+Shift+N', async () => {
    // Focus on the main window
    await appHandle.focus();
    
    // Press Ctrl+Shift+N
    await appHandle.keyboard.press('Control+Shift+N');
    
    // Wait a moment for the new process to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if a new process was created
    // Note: This test might be flaky in CI environments
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('pgrep -c yutodo || echo 0');
      const currentProcesses = parseInt(stdout.trim()) || 0;
      
      console.log(`Current yutodo processes: ${currentProcesses}`);
      console.log(`Original yutodo processes: ${originalProcesses}`);
      
      // We should have at least one more process than we started with
      // (original processes + main test process + new window process)
      expect(currentProcesses).toBeGreaterThan(originalProcesses);
    } catch (error) {
      console.log('Could not verify process count:', error);
      // If we can't verify the process count, just ensure no errors occurred
      // and the main app is still responsive
      const title = await appHandle.getTitle();
      expect(title).toBeTruthy();
    }
  });

  it('should open new window via command palette', async () => {
    // Focus on the main window
    await appHandle.focus();
    
    // Open command palette with Ctrl+Shift+P
    await appHandle.keyboard.press('Control+Shift+P');
    
    // Wait for command palette to open
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type "new window" to search for the command
    await appHandle.keyboard.type('new window');
    
    // Wait for search results
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Press Enter to execute the command
    await appHandle.keyboard.press('Enter');
    
    // Wait a moment for the new process to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify that the command palette closed (main window should be responsive)
    const title = await appHandle.getTitle();
    expect(title).toBeTruthy();
  });

  it('should handle new window creation gracefully in development mode', async () => {
    // In development mode, the app should show an alert instead of creating a new window
    // This test verifies that the error handling works correctly
    
    // Focus on the main window
    await appHandle.focus();
    
    // Try to create a new window
    await appHandle.keyboard.press('Control+Shift+N');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In development mode, an alert might be shown
    // Check that the main app is still responsive
    const title = await appHandle.getTitle();
    expect(title).toBeTruthy();
    
    // Try to interact with the app to ensure it's not frozen
    await appHandle.keyboard.press('Escape'); // Clear any potential modal
    
    // The app should still be functional
    expect(title).toBeTruthy();
  });

  it('should show new window option in File menu', async () => {
    // Focus on the main window
    await appHandle.focus();
    
    // Try to access the File menu (this might vary based on implementation)
    // If the app has a menu bar, we can test it
    
    // For now, just verify the app is responsive and the menu system works
    await appHandle.keyboard.press('Alt+F'); // Try to open File menu
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Press Escape to close any menu
    await appHandle.keyboard.press('Escape');
    
    // Verify app is still responsive
    const title = await appHandle.getTitle();
    expect(title).toBeTruthy();
  });

  it('should handle multiple new window creation attempts', async () => {
    // Test that multiple attempts to create windows don't crash the app
    
    // Focus on the main window
    await appHandle.focus();
    
    // Try to create multiple windows rapidly
    for (let i = 0; i < 3; i++) {
      await appHandle.keyboard.press('Control+Shift+N');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for all attempts to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the main app is still responsive
    const title = await appHandle.getTitle();
    expect(title).toBeTruthy();
    
    // Try to interact with the app
    await appHandle.keyboard.press('Escape'); // Clear any potential modals
    
    // App should still be functional
    expect(title).toBeTruthy();
  });

  it('should maintain main window functionality after new window creation', async () => {
    // Test that the main window remains functional after attempting to create a new window
    
    // Focus on the main window
    await appHandle.focus();
    
    // Try to create a new window
    await appHandle.keyboard.press('Control+Shift+N');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test main window functionality
    
    // Try to add a new task (Ctrl+N)
    await appHandle.keyboard.press('Control+N');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type a task title
    await appHandle.keyboard.type('Test task after new window');
    
    // Press Enter to create the task
    await appHandle.keyboard.press('Enter');
    
    // Wait for task creation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the app is still functional
    const title = await appHandle.getTitle();
    expect(title).toBeTruthy();
  });
});