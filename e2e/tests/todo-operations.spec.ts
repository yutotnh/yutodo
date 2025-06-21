import { test, expect } from '@playwright/test';
import { launchTauriApp, closeTauriApp, waitForAppReady } from '../helpers/tauri-helpers';

test.describe('Todo Operations', () => {
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

  test('should add a new todo', async ({ page }) => {
    // Type in the input field
    const input = await page.locator('input[type="text"]').first();
    await input.fill('Test Todo Item');
    
    // Press Enter to add
    await input.press('Enter');
    
    // Wait for the todo to appear
    const todoItem = await page.locator('.todo-item:has-text("Test Todo Item")');
    await expect(todoItem).toBeVisible();
  });

  test('should toggle todo completion', async ({ page }) => {
    // Add a todo first
    const input = await page.locator('input[type="text"]').first();
    await input.fill('Todo to Complete');
    await input.press('Enter');
    
    // Find the todo item
    const todoItem = await page.locator('.todo-item:has-text("Todo to Complete")');
    await expect(todoItem).toBeVisible();
    
    // Click the checkbox
    const checkbox = todoItem.locator('input[type="checkbox"]');
    await checkbox.click();
    
    // Check if todo is marked as completed
    await expect(todoItem).toHaveClass(/completed/);
  });

  test('should edit todo by double-clicking', async ({ page }) => {
    // Add a todo
    const input = await page.locator('input[type="text"]').first();
    await input.fill('Todo to Edit');
    await input.press('Enter');
    
    // Double click on the todo text
    const todoTitle = await page.locator('.todo-item:has-text("Todo to Edit") .todo-title');
    await todoTitle.dblclick();
    
    // Edit input should appear
    const editInput = await page.locator('.todo-item input[type="text"]');
    await expect(editInput).toBeVisible();
    
    // Change the text
    await editInput.fill('Edited Todo');
    await editInput.press('Enter');
    
    // Check if todo text changed
    const updatedTodo = await page.locator('.todo-item:has-text("Edited Todo")');
    await expect(updatedTodo).toBeVisible();
  });

  test('should delete todo', async ({ page }) => {
    // Add a todo
    const input = await page.locator('input[type="text"]').first();
    await input.fill('Todo to Delete');
    await input.press('Enter');
    
    // Find the todo item
    const todoItem = await page.locator('.todo-item:has-text("Todo to Delete")');
    await expect(todoItem).toBeVisible();
    
    // Click delete button
    const deleteButton = todoItem.locator('button[aria-label*="Delete"], button:has-text("Delete")');
    await deleteButton.click();
    
    // Handle confirmation dialog if it appears
    const confirmDialog = await page.locator('.delete-confirm-dialog');
    if (await confirmDialog.isVisible()) {
      const confirmButton = confirmDialog.locator('button:has-text("Delete"), button:has-text("削除")');
      await confirmButton.click();
    }
    
    // Todo should be removed
    await expect(todoItem).not.toBeVisible();
  });

  test('should filter todos', async ({ page }) => {
    // Add multiple todos
    const input = await page.locator('input[type="text"]').first();
    
    await input.fill('Active Todo');
    await input.press('Enter');
    
    await input.fill('Completed Todo');
    await input.press('Enter');
    
    // Complete one todo
    const completedTodoCheckbox = await page.locator('.todo-item:has-text("Completed Todo") input[type="checkbox"]');
    await completedTodoCheckbox.click();
    
    // Click on "Active" filter
    const activeFilter = await page.locator('.todo-filter button:has-text("Active"), .todo-filter button:has-text("未完了")');
    await activeFilter.click();
    
    // Only active todo should be visible
    await expect(page.locator('.todo-item:has-text("Active Todo")')).toBeVisible();
    await expect(page.locator('.todo-item:has-text("Completed Todo")')).not.toBeVisible();
    
    // Click on "Completed" filter
    const completedFilter = await page.locator('.todo-filter button:has-text("Completed"), .todo-filter button:has-text("完了")');
    await completedFilter.click();
    
    // Only completed todo should be visible
    await expect(page.locator('.todo-item:has-text("Active Todo")')).not.toBeVisible();
    await expect(page.locator('.todo-item:has-text("Completed Todo")')).toBeVisible();
  });

  test('should search todos', async ({ page }) => {
    // Add multiple todos
    const input = await page.locator('input[type="text"]').first();
    
    await input.fill('First Todo Item');
    await input.press('Enter');
    
    await input.fill('Second Task Item');
    await input.press('Enter');
    
    await input.fill('Third Todo Item');
    await input.press('Enter');
    
    // Open search with keyboard shortcut
    await page.keyboard.press('Control+f');
    
    // Type in search
    const searchInput = await page.locator('.search-bar input');
    await searchInput.fill('Todo');
    
    // Only todos with "Todo" should be visible
    await expect(page.locator('.todo-item:has-text("First Todo Item")')).toBeVisible();
    await expect(page.locator('.todo-item:has-text("Second Task Item")')).not.toBeVisible();
    await expect(page.locator('.todo-item:has-text("Third Todo Item")')).toBeVisible();
  });
});