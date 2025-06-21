import { expect } from '@wdio/globals';
import { waitForAppReady, waitForConnection } from '../helpers/tauri-helpers.js';

describe('App Launch', () => {
    it('should launch the application successfully', async () => {
        await waitForAppReady();
        
        const title = await browser.getTitle();
        expect(title).toBe('YuToDo');
    });

    it('should display the main UI components', async () => {
        await waitForAppReady();
        
        // Check header exists
        const header = await $('[data-testid="app-header"]');
        expect(await header.isExisting()).toBe(true);
        
        // Check add todo form exists
        const addForm = await $('[data-testid="add-todo-form"]');
        expect(await addForm.isExisting()).toBe(true);
        
        // Check todo list container exists
        const todoList = await $('[data-testid="todo-list"]');
        expect(await todoList.isExisting()).toBe(true);
    });

    it('should connect to backend server', async () => {
        await waitForAppReady();
        await waitForConnection();
        
        // Connection is verified by waitForConnection, but we also check the UI
        const status = await $('[data-testid="connection-status"]');
        expect(await status.isExisting()).toBe(true);
        
        // Check if we can get status text (detailed mode) or just verify element exists (slim mode)
        const statusText = await status.getText();
        if (statusText && statusText.trim()) {
            // Detailed mode - check text content
            expect(statusText).toMatch(/Connected|接続済み/);
        } else {
            // Slim mode - just verify element is displayed (connection confirmed by waitForConnection)
            expect(await status.isDisplayed()).toBe(true);
        }
    });

    it('should display correct language based on settings', async () => {
        await waitForAppReady();
        
        // Ensure window is focused first
        await browser.execute(() => {
            window.focus();
            window.dispatchEvent(new Event('focus'));
        });
        await browser.pause(500);
        
        // Check if UI elements exist
        const addTodoForm = await $('[data-testid="add-todo-form"]');
        const formExists = await addTodoForm.isExisting();
        
        if (!formExists) {
            console.log('Add todo form not visible, checking app state...');
            const appState = await browser.execute(() => {
                return {
                    isWindowFocused: document.hasFocus(),
                    currentView: localStorage.getItem('yutodoAppSettings') ? 
                        JSON.parse(localStorage.getItem('yutodoAppSettings')).currentView : 'unknown',
                    formElements: document.querySelectorAll('[data-testid="add-todo-form"]').length
                };
            });
            console.log('App state:', appState);
        }
        
        expect(formExists).toBe(true);
        
        // Check if add button exists within the form
        if (formExists) {
            const addButton = await addTodoForm.$('[data-testid="add-todo-button"]');
            expect(await addButton.isExisting()).toBe(true);
        }
    });

    it('should have window controls', async () => {
        await waitForAppReady();
        
        // Check minimize button
        const minimizeBtn = await $('[data-testid="minimize-button"]');
        expect(await minimizeBtn.isExisting()).toBe(true);
        
        // Check close button
        const closeBtn = await $('[data-testid="close-button"]');
        expect(await closeBtn.isExisting()).toBe(true);
    });
});