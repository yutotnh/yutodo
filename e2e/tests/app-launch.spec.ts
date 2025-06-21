import { test, expect } from '@playwright/test';
import { launchTauriApp, closeTauriApp, waitForAppReady } from '../helpers/tauri-helpers';
import { ElectronApplication, _electron as electron } from 'playwright';

let app: ElectronApplication;

test.describe('Tauri App Launch', () => {
  test.beforeAll(async () => {
    // Launch Tauri app before tests
    await launchTauriApp();
  });

  test.afterAll(async () => {
    // Close Tauri app after tests
    await closeTauriApp();
  });

  test('should launch the application', async ({ page }) => {
    // Navigate to Tauri app
    await page.goto('http://localhost:1420'); // Vite dev server URL
    
    // Wait for app to be ready
    await waitForAppReady(page);
    
    // Check if the app header is visible
    const header = await page.locator('.app-header');
    await expect(header).toBeVisible();
    
    // Check if the app title is correct
    const title = await page.title();
    expect(title).toBe('YuToDo');
  });

  test('should show the Add Todo form', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await waitForAppReady(page);
    
    // Check if Add Todo form is visible
    const addTodoForm = await page.locator('.add-todo-form');
    await expect(addTodoForm).toBeVisible();
    
    // Check if input field is present
    const input = await page.locator('input[placeholder*="タスクを追加"], input[placeholder*="Add a task"]');
    await expect(input).toBeVisible();
  });

  test('should connect to the backend server', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await waitForAppReady(page);
    
    // Check connection status
    const connectionStatus = await page.locator('.connection-status');
    await expect(connectionStatus).toBeVisible();
    
    // Wait for successful connection
    await expect(connectionStatus).toContainText(/Connected|接続済み/);
  });

  test('should display menu bar', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await waitForAppReady(page);
    
    // Check if menu bar is visible
    const menuBar = await page.locator('.menu-bar');
    await expect(menuBar).toBeVisible();
    
    // Check if File menu exists
    const fileMenu = await page.locator('.menu-item:has-text("File"), .menu-item:has-text("ファイル")');
    await expect(fileMenu).toBeVisible();
  });

  test('should have dark mode toggle functionality', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await waitForAppReady(page);
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    
    // Open Settings
    await page.keyboard.press('Control+,');
    
    // Wait for settings modal
    const settingsModal = await page.locator('.settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Find theme selector
    const themeSelector = await page.locator('select[id*="darkMode"]');
    await expect(themeSelector).toBeVisible();
    
    // Change theme
    await themeSelector.selectOption(initialTheme === 'dark' ? 'light' : 'dark');
    
    // Close settings
    await page.keyboard.press('Escape');
    
    // Check if theme changed
    const newTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    
    expect(newTheme).not.toBe(initialTheme);
  });
});