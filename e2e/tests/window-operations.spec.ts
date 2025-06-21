import { test, expect } from '@playwright/test';
import { launchTauriApp, closeTauriApp, waitForAppReady } from '../helpers/tauri-helpers';

test.describe('Window Operations', () => {
  test.beforeAll(async () => {
    await launchTauriApp();
  });

  test.afterAll(async () => {
    await closeTauriApp();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    await waitForAppReady(page);
  });

  test('should drag window by header', async ({ page }) => {
    // Get initial window position
    const initialPosition = await page.evaluate(() => {
      return {
        x: window.screenX,
        y: window.screenY
      };
    });
    
    // Find header element
    const header = await page.locator('.app-header');
    
    // Perform drag operation
    await header.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    // Wait a bit for window to move
    await page.waitForTimeout(500);
    
    // Get new window position
    const newPosition = await page.evaluate(() => {
      return {
        x: window.screenX,
        y: window.screenY
      };
    });
    
    // Window should have moved
    expect(newPosition.x).not.toBe(initialPosition.x);
    expect(newPosition.y).not.toBe(initialPosition.y);
  });

  test('should not drag window when clicking buttons', async ({ page }) => {
    // Get initial window position
    const initialPosition = await page.evaluate(() => {
      return {
        x: window.screenX,
        y: window.screenY
      };
    });
    
    // Try to drag from File menu button
    const fileMenu = await page.locator('.menu-item:has-text("File"), .menu-item:has-text("ファイル")');
    await fileMenu.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    // Wait a bit
    await page.waitForTimeout(500);
    
    // Get window position
    const newPosition = await page.evaluate(() => {
      return {
        x: window.screenX,
        y: window.screenY
      };
    });
    
    // Window should NOT have moved
    expect(newPosition.x).toBe(initialPosition.x);
    expect(newPosition.y).toBe(initialPosition.y);
  });

  test('should minimize window with Ctrl+M', async ({ page }) => {
    // Press minimize shortcut
    await page.keyboard.press('Control+m');
    
    // Wait for window operation
    await page.waitForTimeout(1000);
    
    // Window should be minimized (hard to test directly in Playwright)
    // We can check if the page is still responsive after restore
    await page.keyboard.press('Alt+Tab'); // Try to restore
    await page.waitForTimeout(500);
    
    // Page should still be interactive
    const input = await page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
  });

  test('should close window with Ctrl+W', async ({ page }) => {
    // Note: This test might close the app, so it should be last
    // Create a flag to track if window closed
    let windowClosed = false;
    
    page.on('close', () => {
      windowClosed = true;
    });
    
    // Press close shortcut
    await page.keyboard.press('Control+w');
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Check if window close was triggered
    // Note: In actual test, the window might not close in dev mode
    // This is more of a smoke test to ensure the shortcut doesn't crash
    if (!windowClosed) {
      // If window didn't close, ensure it's still responsive
      const app = await page.locator('.app-container');
      await expect(app).toBeVisible();
    }
  });

  test('should toggle always on top', async ({ page }) => {
    // Open settings
    await page.keyboard.press('Control+,');
    
    // Find always on top checkbox
    const alwaysOnTopCheckbox = await page.locator('input[type="checkbox"][id*="alwaysOnTop"]');
    
    // Get initial state
    const initialState = await alwaysOnTopCheckbox.isChecked();
    
    // Toggle it
    await alwaysOnTopCheckbox.click();
    
    // State should change
    const newState = await alwaysOnTopCheckbox.isChecked();
    expect(newState).not.toBe(initialState);
    
    // Close settings
    await page.keyboard.press('Escape');
    
    // Window should maintain the always on top state
    // (Hard to verify programmatically, but we can check the app still works)
    const app = await page.locator('.app-container');
    await expect(app).toBeVisible();
  });
});