import { test, expect } from '@playwright/test';
import { launchTauriApp, closeTauriApp, waitForAppReady } from '../helpers/tauri-helpers';

test.describe('Keyboard Shortcuts', () => {
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

  test('should open command palette with Ctrl+Shift+P', async ({ page }) => {
    // Press command palette shortcut
    await page.keyboard.press('Control+Shift+P');
    
    // Command palette should be visible
    const commandPalette = await page.locator('.command-palette');
    await expect(commandPalette).toBeVisible();
    
    // Input should be focused
    const commandInput = await page.locator('.command-palette input');
    await expect(commandInput).toBeFocused();
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(commandPalette).not.toBeVisible();
  });

  test('should open settings with Ctrl+,', async ({ page }) => {
    // Press settings shortcut
    await page.keyboard.press('Control+,');
    
    // Settings modal should be visible
    const settingsModal = await page.locator('.settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(settingsModal).not.toBeVisible();
  });

  test('should show keyboard shortcuts help with Ctrl+K, Ctrl+S', async ({ page }) => {
    // Press shortcut sequence
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500); // Wait for key sequence
    await page.keyboard.press('Control+s');
    
    // Shortcuts help should be visible
    const shortcutsHelp = await page.locator('.shortcut-help-modal');
    await expect(shortcutsHelp).toBeVisible();
    
    // Should contain shortcut list
    const shortcutsList = await page.locator('.shortcuts-grid');
    await expect(shortcutsList).toBeVisible();
  });

  test('should toggle todo with Ctrl+D', async ({ page }) => {
    // Add a todo
    const input = await page.locator('input[type="text"]').first();
    await input.fill('Test Todo');
    await input.press('Enter');
    
    // Select the todo
    const todoItem = await page.locator('.todo-item:has-text("Test Todo")');
    await todoItem.click();
    
    // Press Ctrl+D to toggle
    await page.keyboard.press('Control+d');
    
    // Todo should be completed
    await expect(todoItem).toHaveClass(/completed/);
    
    // Press again to uncomplete
    await page.keyboard.press('Control+d');
    
    // Todo should not be completed
    await expect(todoItem).not.toHaveClass(/completed/);
  });

  test('should navigate todos with arrow keys', async ({ page }) => {
    // Add multiple todos
    const input = await page.locator('input[type="text"]').first();
    
    await input.fill('First Todo');
    await input.press('Enter');
    await input.fill('Second Todo');
    await input.press('Enter');
    await input.fill('Third Todo');
    await input.press('Enter');
    
    // Click on first todo
    const firstTodo = await page.locator('.todo-item:has-text("First Todo")');
    await firstTodo.click();
    
    // Press arrow down
    await page.keyboard.press('ArrowDown');
    
    // Second todo should be selected
    const secondTodo = await page.locator('.todo-item:has-text("Second Todo")');
    await expect(secondTodo).toHaveClass(/selected/);
    
    // Press arrow down again
    await page.keyboard.press('ArrowDown');
    
    // Third todo should be selected
    const thirdTodo = await page.locator('.todo-item:has-text("Third Todo")');
    await expect(thirdTodo).toHaveClass(/selected/);
    
    // Press arrow up
    await page.keyboard.press('ArrowUp');
    
    // Second todo should be selected again
    await expect(secondTodo).toHaveClass(/selected/);
  });

  test('should select all todos with Ctrl+A', async ({ page }) => {
    // Add multiple todos
    const input = await page.locator('input[type="text"]').first();
    
    await input.fill('Todo 1');
    await input.press('Enter');
    await input.fill('Todo 2');
    await input.press('Enter');
    await input.fill('Todo 3');
    await input.press('Enter');
    
    // Press Ctrl+A
    await page.keyboard.press('Control+a');
    
    // All todos should be selected
    const selectedTodos = await page.locator('.todo-item.selected');
    await expect(selectedTodos).toHaveCount(3);
    
    // Selection counter should show
    const selectionCounter = await page.locator('.selection-counter');
    await expect(selectionCounter).toContainText('3');
  });

  test('should focus input with Ctrl+N', async ({ page }) => {
    // Click somewhere else to remove focus
    await page.locator('body').click();
    
    // Press Ctrl+N
    await page.keyboard.press('Control+n');
    
    // Input should be focused
    const input = await page.locator('input[type="text"]').first();
    await expect(input).toBeFocused();
  });
});