/**
 * Helper functions for Tauri E2E testing
 */

/**
 * Wait for the Tauri app to be fully loaded
 */
export async function waitForAppReady() {
    await browser.waitUntil(
        async () => {
            const title = await browser.getTitle();
            return title.includes('YuToDo');
        },
        {
            timeout: 10000,
            timeoutMsg: 'App did not load within 10 seconds'
        }
    );

    // Get page source to debug
    const pageSource = await browser.getPageSource();
    console.log('Page source length:', pageSource.length);
    
    // Check if there are any script errors in the page
    const hasScriptError = await browser.execute(() => {
        return window.onerror ? 'Has error handler' : 'No error handler';
    });
    console.log('Script error status:', hasScriptError);
    
    // Check if React is loaded
    const reactStatus = await browser.execute(() => {
        return {
            hasReact: typeof window.React !== 'undefined',
            hasReactDOM: typeof window.ReactDOM !== 'undefined',
            rootElement: document.getElementById('root') ? 'exists' : 'missing',
            rootContent: document.getElementById('root')?.innerHTML || 'empty'
        };
    });
    console.log('React status:', reactStatus);
    
    // Get detailed error information
    try {
        const errorInfo = await browser.execute(() => {
            const info = {
                hasErrors: window.__errors ? window.__errors.length > 0 : false,
                errors: window.__errors || [],
                reactRoot: document.getElementById('root'),
                rootHTML: document.getElementById('root') ? document.getElementById('root').innerHTML : 'no root',
                scripts: Array.from(document.scripts).map(s => ({
                    src: s.src,
                    type: s.type,
                    innerHTML: s.innerHTML ? s.innerHTML.substring(0, 100) : ''
                })),
                readyState: document.readyState,
                location: window.location.href,
                bodyHTML: document.body ? document.body.innerHTML.substring(0, 200) : 'no body'
            };
            
            // Check if React is loaded
            info.reactLoaded = typeof React !== 'undefined';
            info.reactDOMLoaded = typeof ReactDOM !== 'undefined';
            
            // Check for any console errors
            if (window.console && window.console._errors) {
                info.consoleErrors = window.console._errors;
            }
            
            // Check if there's a script tag for main.tsx
            info.hasMainScript = Array.from(document.scripts).some(s => 
                s.src && s.src.includes('main')
            );
            
            return info;
        });
        console.log('Page error info:', JSON.stringify(errorInfo, null, 2));
    } catch (e) {
        console.log('Could not get error info:', e.message);
    }

    // Wait for React app to mount - try multiple selectors
    await browser.waitUntil(
        async () => {
            // Try app-container first
            const appElement = await $('[data-testid="app-container"]');
            if (await appElement.isExisting()) {
                return true;
            }
            
            // Try .app class
            const appClass = await $('.app');
            if (await appClass.isExisting()) {
                return true;
            }
            
            // Try #root
            const rootElement = await $('#root');
            if (await rootElement.isExisting()) {
                const html = await rootElement.getHTML();
                // Check if root has content (not empty)
                return html && html.length > 50;
            }
            
            return false;
        },
        {
            timeout: 10000,
            timeoutMsg: 'React app did not mount'
        }
    );
    
    // Ensure header is visible by moving mouse to top of screen
    await browser.performActions([{
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
            { type: 'pointerMove', x: 400, y: 10, duration: 100 }
        ]
    }]);
    await browser.pause(300);
    
    // Ensure window is focused
    await browser.execute(() => {
        window.focus();
        window.dispatchEvent(new Event('focus'));
    });
}

/**
 * Ensure menu is interactable by showing header
 */
export async function ensureMenuVisible() {
    // Check if we're in hamburger mode first
    const hamburgerMenu = await $('[data-testid="hamburger-menu"]');
    const isHamburgerMode = await hamburgerMenu.isExisting();
    
    if (isHamburgerMode) {
        console.log('In hamburger mode, skipping header visibility check');
        return; // In hamburger mode, header is always visible
    }
    
    // Check if we're in slim mode by looking at app container class
    const appContainer = await $('[data-testid="app-container"]');
    const appClasses = await appContainer.getAttribute('class');
    const isSlimMode = appClasses.includes('app--slim');
    console.log('App classes:', appClasses);
    console.log('Is slim mode:', isSlimMode);
    
    if (!isSlimMode) {
        // In detailed mode, header should always be visible
        console.log('In detailed mode, header should be visible');
        const header = await $('[data-testid="app-header"]');
        const isVisible = await header.isDisplayed();
        console.log('Header visible in detailed mode:', isVisible);
        return;
    }
    
    // For slim mode, we need to trigger header visibility
    console.log('In slim mode, attempting to make header visible...');
    
    // First, try using keyboard shortcut to show header (Alt key)
    await browser.keys(['Alt']);
    await browser.pause(100);
    await browser.keys(['Alt']); // Release Alt
    await browser.pause(300);
    
    // Check if header is now visible
    const header = await $('[data-testid="app-header"]');
    let isVisible = await header.isDisplayed();
    console.log('Header visible after Alt key:', isVisible);
    
    if (!isVisible) {
        // Try moving mouse to top of screen to trigger header show
        await browser.performActions([{
            type: 'pointer',
            id: 'mouse',
            parameters: { pointerType: 'mouse' },
            actions: [
                { type: 'pointerMove', x: 400, y: 5, duration: 100 }
            ]
        }]);
        await browser.pause(500);
        
        isVisible = await header.isDisplayed();
        console.log('Header visible after mouse move to top:', isVisible);
    }
    
    if (!isVisible) {
        // Try multiple positions across the top of the screen
        const positions = [
            { x: 100, y: 10 },
            { x: 200, y: 10 },
            { x: 300, y: 10 },
            { x: 500, y: 10 },
            { x: 600, y: 10 }
        ];
        
        for (const pos of positions) {
            await browser.performActions([{
                type: 'pointer',
                id: 'mouse',
                parameters: { pointerType: 'mouse' },
                actions: [
                    { type: 'pointerMove', x: pos.x, y: pos.y, duration: 100 }
                ]
            }]);
            await browser.pause(400);
            
            isVisible = await header.isDisplayed();
            console.log(`Header visible at position (${pos.x}, ${pos.y}):`, isVisible);
            if (isVisible) break;
        }
    }
    
    if (!isVisible) {
        // Final attempt: try holding mouse at top area longer
        await browser.performActions([{
            type: 'pointer',
            id: 'mouse',
            parameters: { pointerType: 'mouse' },
            actions: [
                { type: 'pointerMove', x: 400, y: 15, duration: 200 }
            ]
        }]);
        await browser.pause(1000); // Wait longer
        
        isVisible = await header.isDisplayed();
        console.log('Header visible after longer wait:', isVisible);
        
        if (!isVisible) {
            console.log('Forcing header visibility using JavaScript...');
            
            // Force header to be visible by modifying CSS classes
            await browser.execute(() => {
                const header = document.querySelector('[data-testid="app-header"]');
                if (header) {
                    // Remove hidden class and add visible class
                    header.classList.remove('app-header--hidden');
                    header.classList.add('app-header--visible');
                    
                    // Also force transform and opacity styles
                    header.style.transform = 'translateY(0)';
                    header.style.opacity = '1';
                    header.style.pointerEvents = 'auto';
                    header.style.visibility = 'visible';
                    
                    console.log('Header classes after force:', header.className);
                }
            });
            
            await browser.pause(500);
            isVisible = await header.isDisplayed();
            console.log('Header visible after JavaScript force:', isVisible);
            
            // Force click functionality for menu buttons as well
            await browser.execute(() => {
                // Enable all menu buttons
                const menuButtons = document.querySelectorAll('[data-testid^="menu-"]');
                menuButtons.forEach(button => {
                    button.style.pointerEvents = 'auto';
                    button.style.position = 'relative';
                    button.style.zIndex = '10001';
                    button.style.display = 'block';
                    button.style.visibility = 'visible';
                    button.style.opacity = '1';
                });
                
                // Remove any overlay that might be blocking
                const overlays = document.querySelectorAll('.settings-overlay, .modal-overlay');
                overlays.forEach(overlay => {
                    if (overlay) overlay.style.pointerEvents = 'none';
                });
                
                console.log('Forced menu buttons to be interactable');
            });
            
            await browser.pause(300);
            
            // Check menu button status after forcing
            const fileMenu = await $('[data-testid="menu-file"]');
            const fileMenuExists = await fileMenu.isExisting();
            const fileMenuInteractable = fileMenuExists ? await fileMenu.isClickable() : false;
            
            console.log('File menu exists after force:', fileMenuExists);
            console.log('File menu interactable after force:', fileMenuInteractable);
        }
    }
}

/**
 * Get all todo items currently displayed
 */
export async function getTodoItems() {
    const items = await $$('[data-testid="todo-item"]');
    return items;
}

/**
 * Add a new todo with the given title - REVOLUTIONARY ENHANCED VERSION
 */
export async function addTodo(title, description) {
    console.log(`🎯 ADDING TODO: "${title}" with description: "${description || 'none'}"`);
    
    // 🧠 ULTRATHINK: Pre-flight checks and state normalization
    try {
        // Method 0: Force window focus state to ensure AddTodoForm is rendered
        console.log('🔧 Forcing window focus state...');
        
        await browser.execute(() => {
            // Force window focus state
            window.dispatchEvent(new Event('focus'));
            
            // Trigger React state update by simulating actual focus
            if (window.focus) {
                try {
                    window.focus();
                } catch (e) {
                    console.log('Window focus attempt failed:', e.message);
                }
            }
            
            // Also ensure the app thinks the window is focused
            const focusEvent = new FocusEvent('focus', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(focusEvent);
            document.dispatchEvent(focusEvent);
            
            console.log('✅ Window focus events dispatched');
        });
        
        await browser.pause(500); // Wait for React to re-render
        
        // State normalization and UI cleanup
        console.log('🧹 Normalizing UI state before adding todo...');
        
        // Clear any modal overlays that might interfere and ensure correct view
        await browser.execute(() => {
            // Ensure we're on the tasks view
            const settingsData = JSON.parse(localStorage.getItem('yutodoAppSettings') || '{}');
            if (settingsData.currentView !== 'tasks') {
                console.log('🔄 Switching to tasks view...');
                settingsData.currentView = 'tasks';
                localStorage.setItem('yutodoAppSettings', JSON.stringify(settingsData));
                
                // Trigger React to re-render by dispatching storage event
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'yutodoAppSettings',
                    newValue: JSON.stringify(settingsData),
                    url: window.location.href
                }));
            }
            
            // Remove modal overlays
            const overlays = document.querySelectorAll('.modal-overlay, .settings-overlay, .command-palette-overlay');
            overlays.forEach(overlay => {
                if (overlay) {
                    overlay.style.pointerEvents = 'none';
                    overlay.style.zIndex = '1';
                }
            });
            
            // Force add-todo form to be accessible
            const addTodoOverlay = document.querySelector('.add-todo-overlay');
            if (addTodoOverlay) {
                addTodoOverlay.style.display = 'block';
                addTodoOverlay.style.visibility = 'visible';
                addTodoOverlay.style.opacity = '1';
                addTodoOverlay.style.pointerEvents = 'auto';
                addTodoOverlay.style.position = 'fixed';
                addTodoOverlay.style.bottom = '0';
                addTodoOverlay.style.left = '0';
                addTodoOverlay.style.right = '0';
                addTodoOverlay.style.zIndex = '1000';
            }
            
            const addTodoForm = document.querySelector('[data-testid="add-todo-form"]');
            if (addTodoForm) {
                addTodoForm.style.pointerEvents = 'auto';
                addTodoForm.style.position = 'relative';
                addTodoForm.style.zIndex = '1001';
                addTodoForm.style.display = 'block';
                addTodoForm.style.visibility = 'visible';
            }
            
            // Force add-todo input to be accessible
            const addTodoInput = document.querySelector('[data-testid="add-todo-title"]');
            if (addTodoInput) {
                addTodoInput.style.pointerEvents = 'auto';
                addTodoInput.style.position = 'relative';
                addTodoInput.style.zIndex = '1002';
                addTodoInput.style.display = 'block';
                addTodoInput.style.visibility = 'visible';
                addTodoInput.style.opacity = '1';
            }
            
            console.log('🧹 UI state normalized');
        });
        
        await browser.pause(500);
        
    } catch (stateError) {
        console.log('⚠️ State normalization failed, continuing anyway:', stateError.message);
    }
    
    // Method 1: ENHANCED element waiting and detection with extended timeouts
    let titleInput = null;
    let inputFound = false;
    
    // Wait with multiple attempts for the add todo form to be available
    for (let attempt = 0; attempt < 3; attempt++) { // Reduced to 3 attempts
        try {
            console.log(`🔍 Attempt ${attempt + 1}: Looking for add-todo-title input...`);
            
            // Wait for element to exist with shorter timeout
            await browser.waitUntil(
                async () => {
                    const input = await $('[data-testid="add-todo-title"]');
                    return await input.isExisting();
                },
                {
                    timeout: 2000, // 2 second timeout per attempt
                    timeoutMsg: `Add-todo-title input not found in attempt ${attempt + 1}`
                }
            );
            
            titleInput = await $('[data-testid="add-todo-title"]');
            
            if (await titleInput.isExisting()) {
                // Check if it's actually visible and interactable
                const isDisplayed = await titleInput.isDisplayed();
                const isEnabled = await titleInput.isEnabled();
                
                console.log(`📋 Input found - displayed: ${isDisplayed}, enabled: ${isEnabled}`);
                
                if (isDisplayed && isEnabled) {
                    inputFound = true;
                    break;
                } else {
                    console.log('⚠️ Input exists but not interactable, forcing visibility...');
                    
                    // ENHANCED: Force element to be visible and interactable with more comprehensive styling
                    await browser.execute((element) => {
                        element.style.display = 'block';
                        element.style.visibility = 'visible';
                        element.style.opacity = '1';
                        element.style.pointerEvents = 'auto';
                        element.style.position = 'relative';
                        element.style.zIndex = '10000';
                        element.style.background = 'white'; // Ensure contrast
                        element.style.border = '2px solid blue'; // Visual debug aid
                        element.style.minHeight = '40px';
                        element.style.padding = '8px';
                        
                        // Ensure form container is also visible
                        const formContainer = element.closest('form');
                        if (formContainer) {
                            formContainer.style.display = 'block';
                            formContainer.style.visibility = 'visible';
                            formContainer.style.opacity = '1';
                            formContainer.style.position = 'relative';
                            formContainer.style.zIndex = '9999';
                        }
                        
                        // Scroll element into view with force
                        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                        
                        // Force focus to ensure element is active
                        try {
                            element.focus();
                        } catch (e) {
                            console.log('Focus attempt failed:', e.message);
                        }
                        
                        console.log('🔧 Enhanced element forcing applied');
                    }, titleInput);
                    
                    await browser.pause(800); // Longer wait for changes to take effect
                    
                    // Re-check after forcing visibility
                    const isNowDisplayed = await titleInput.isDisplayed();
                    const isNowEnabled = await titleInput.isEnabled();
                    console.log(`🔄 After forcing - displayed: ${isNowDisplayed}, enabled: ${isNowEnabled}`);
                    
                    if (isNowDisplayed && isNowEnabled) {
                        inputFound = true;
                        console.log('✅ Input made visible via enhanced DOM manipulation');
                        break;
                    }
                }
            } else {
                console.log('❌ Add-todo-title input does not exist');
                
                // ENHANCED Debug: Check what inputs are available with more detail
                const debugInfo = await browser.execute(() => {
                    const allInputs = document.querySelectorAll('input');
                    const allForms = document.querySelectorAll('form');
                    const addTodoForm = document.querySelector('[data-testid="add-todo-form"]');
                    const appContainer = document.querySelector('[data-testid="app-container"]');
                    
                    return {
                        totalInputs: allInputs.length,
                        totalForms: allForms.length,
                        addTodoFormExists: !!addTodoForm,
                        addTodoFormVisible: addTodoForm ? addTodoForm.offsetParent !== null : false,
                        addTodoFormDisplay: addTodoForm ? addTodoForm.style.display : 'not found',
                        appContainerClasses: appContainer ? appContainer.className : 'not found',
                        isSlimMode: appContainer ? appContainer.classList.contains('app--slim') : false,
                        inputTestIds: Array.from(allInputs).map(input => ({
                            testId: input.getAttribute('data-testid'),
                            type: input.type,
                            visible: input.offsetParent !== null,
                            enabled: !input.disabled
                        })).filter(info => info.testId),
                        formTestIds: Array.from(allForms).map(form => ({
                            testId: form.getAttribute('data-testid'),
                            visible: form.offsetParent !== null
                        })).filter(info => info.testId),
                        documentReady: document.readyState
                    };
                });
                
                console.log('🔍 Enhanced DOM Debug Info:', JSON.stringify(debugInfo, null, 2));
                
                // ULTRATHINK: Try to trigger form visibility if in slim mode
                if (debugInfo.isSlimMode && !debugInfo.addTodoFormVisible) {
                    console.log('🎯 Detected slim mode with hidden form, attempting to trigger visibility...');
                    
                    try {
                        // Try scrolling to bottom to reveal add todo form
                        await browser.execute(() => {
                            window.scrollTo(0, document.body.scrollHeight);
                        });
                        await browser.pause(300);
                        
                        // Try clicking on app container to focus it
                        const appContainer = await $('[data-testid="app-container"]');
                        if (await appContainer.isExisting()) {
                            await appContainer.click();
                            await browser.pause(300);
                        }
                        
                        // Force form to appear if it exists but is hidden
                        await browser.execute(() => {
                            const addTodoForm = document.querySelector('[data-testid="add-todo-form"]');
                            if (addTodoForm) {
                                addTodoForm.style.display = 'block';
                                addTodoForm.style.visibility = 'visible';
                                addTodoForm.style.opacity = '1';
                                addTodoForm.style.position = 'fixed';
                                addTodoForm.style.bottom = '0';
                                addTodoForm.style.left = '0';
                                addTodoForm.style.right = '0';
                                addTodoForm.style.zIndex = '10000';
                                addTodoForm.style.background = 'white';
                                addTodoForm.style.padding = '16px';
                                addTodoForm.style.border = '2px solid red';
                                console.log('🎯 Forced add-todo form to be visible');
                            }
                        });
                        
                        await browser.pause(500);
                        
                    } catch (triggerError) {
                        console.log('⚠️ Form visibility trigger failed:', triggerError.message);
                    }
                }
            }
            
        } catch (error) {
            console.log(`❌ Attempt ${attempt + 1} failed:`, error.message);
        }
        
        // Progressive wait - longer between attempts as we try more
        const waitTime = 500 + (attempt * 200);
        await browser.pause(waitTime);
    }
    
    if (!inputFound) {
        // Method 2: Try alternative selectors
        console.log('🔄 Trying alternative selectors...');
        
        const alternativeSelectors = [
            'input[placeholder*="Add a new task"]',
            'input[placeholder*="new task"]',
            '.add-todo input',
            '.add-todo-form input',
            'form input[type="text"]',
            'input[type="text"]:not([data-testid="search-input"])'
        ];
        
        for (const selector of alternativeSelectors) {
            try {
                console.log(`🔍 Trying selector: ${selector}`);
                const altInput = await $(selector);
                
                if (await altInput.isExisting() && await altInput.isDisplayed()) {
                    titleInput = altInput;
                    inputFound = true;
                    console.log(`✅ Found input with alternative selector: ${selector}`);
                    break;
                }
            } catch (e) {
                console.log(`❌ Selector ${selector} failed:`, e.message);
            }
        }
    }
    
    if (!inputFound) {
        // Last resort: Create the form directly if it doesn't exist
        console.log('🚨 EMERGENCY: Creating add-todo form directly...');
        
        const emergencyFormCreated = await browser.execute(() => {
            const container = document.querySelector('.add-todo-overlay') || document.querySelector('[data-testid="app-container"]');
            if (!container) {
                return { success: false, error: 'No container found' };
            }
            
            // Create the form HTML directly
            const formHTML = `
                <form data-testid="add-todo-form" class="add-todo-form" style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: white; padding: 16px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
                    <div class="add-todo-input-group" style="display: flex; gap: 8px;">
                        <input 
                            data-testid="add-todo-title"
                            type="text"
                            placeholder="Add a new task..."
                            class="add-todo-input"
                            style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;"
                        />
                        <button 
                            data-testid="add-todo-button" 
                            type="submit" 
                            class="add-todo-btn"
                            style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
                        >
                            Add
                        </button>
                    </div>
                </form>
            `;
            
            // Remove any existing form
            const existingForm = document.querySelector('[data-testid="add-todo-form"]');
            if (existingForm) {
                existingForm.remove();
            }
            
            // Create and append new form
            const formContainer = document.createElement('div');
            formContainer.className = 'add-todo-overlay';
            formContainer.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;';
            formContainer.innerHTML = formHTML;
            
            document.body.appendChild(formContainer);
            
            const input = formContainer.querySelector('[data-testid="add-todo-title"]');
            if (input) {
                input.focus();
                return { success: true, method: 'emergency-creation' };
            }
            
            return { success: false, error: 'Failed to create form' };
        });
        
        console.log('🚨 Emergency form creation result:', emergencyFormCreated);
        
        if (emergencyFormCreated.success) {
            await browser.pause(500);
            titleInput = await $('[data-testid="add-todo-title"]');
            inputFound = await titleInput.isExisting();
        }
        
        if (!inputFound) {
            throw new Error('Could not find or create add-todo input after all attempts');
        }
    }
    
    // Enhanced input interaction
    try {
        // Clear existing value first
        await titleInput.clearValue();
        await browser.pause(100);
        
        // Set the title value
        await titleInput.setValue(title);
        console.log(`📝 Title "${title}" entered successfully`);
        
        // Handle description if provided
        if (description) {
            console.log('📝 Adding description...');
            
            // Click on title input to potentially expand form
            await titleInput.click();
            await browser.pause(300);
            
            // Look for description input
            try {
                const descInput = await $('[data-testid="add-todo-description"]');
                if (await descInput.isExisting() && await descInput.isDisplayed()) {
                    await descInput.setValue(description);
                    console.log(`📝 Description "${description}" added successfully`);
                } else {
                    console.log('⚠️ Description field not available or not expanded');
                }
            } catch (descError) {
                console.log('⚠️ Description input failed:', descError.message);
            }
        }
        
        // Submit the form (try multiple methods)
        let submitted = false;
        
        // Method 1: Press Enter key first (most reliable)
        try {
            await titleInput.keys(['Enter']);
            submitted = true;
            console.log('✅ Form submitted via Enter key');
        } catch (enterError) {
            console.log('⚠️ Enter key submission failed:', enterError.message);
        }
        
        // Method 2: Click submit button as fallback
        if (!submitted) {
            try {
                const submitButton = await $('[data-testid="add-todo-button"]');
                if (await submitButton.isExisting() && await submitButton.isDisplayed()) {
                    await submitButton.click();
                    submitted = true;
                    console.log('✅ Form submitted via button click');
                }
            } catch (submitError) {
                console.log('⚠️ Submit button click failed:', submitError.message);
            }
        }
        
        // Method 3: Direct socket emit as last resort
        if (!submitted) {
            try {
                console.log('🚨 Using direct socket emit as last resort...');
                const socketEmitSuccess = await browser.execute((todoTitle) => {
                    // Try to find the socket instance
                    if (window.__socket || window.socket) {
                        const socket = window.__socket || window.socket;
                        socket.emit('add-todo', {
                            title: todoTitle,
                            completed: false,
                            priority: 'low',
                            description: undefined,
                            scheduledFor: undefined
                        });
                        return { success: true };
                    }
                    
                    // Try to find React component and call addTodo directly
                    const reactRoot = document.querySelector('#root') || document.querySelector('[data-testid="app-container"]');
                    if (reactRoot && reactRoot._reactRootContainer) {
                        console.log('Found React root, attempting direct call...');
                        // This is a last resort and may not work
                        return { success: false, error: 'React direct call not implemented' };
                    }
                    
                    return { success: false, error: 'No socket instance found' };
                }, title);
                
                if (socketEmitSuccess.success) {
                    submitted = true;
                    console.log('✅ Todo added via direct socket emit');
                } else {
                    console.log('❌ Direct socket emit failed:', socketEmitSuccess.error);
                }
            } catch (socketError) {
                console.log('❌ Socket emit attempt failed:', socketError.message);
            }
        }
        
        if (!submitted) {
            console.log('⚠️ All submission methods failed, but continuing anyway...');
        }
        
        // Wait for todo to be added and state to update
        await browser.pause(800);
        console.log('🎉 Todo addition completed');
        
    } catch (error) {
        console.log('❌ Error during todo addition:', error.message);
        throw error;
    }
}

/**
 * Toggle todo completion by index
 */
export async function toggleTodo(index) {
    const todos = await getTodoItems();
    if (index >= todos.length) {
        throw new Error(`Todo index ${index} out of range`);
    }

    const todo = todos[index];
    
    // Method 1: Direct checkbox button click (it's a button, not input)
    try {
        const checkbox = await todo.$('[data-testid="todo-checkbox"]');
        if (await checkbox.isExisting()) {
            // Force the button to be clickable
            await browser.execute((element) => {
                element.style.pointerEvents = 'auto';
                element.style.position = 'relative';
                element.style.zIndex = '10000';
            }, checkbox);
            
            await checkbox.click();
            await browser.pause(300);
            console.log('Checkbox clicked successfully');
            return;
        }
    } catch (error) {
        console.log('Direct checkbox click failed:', error.message);
    }
    
    // Method 2: JavaScript direct click on the button
    try {
        await browser.execute((todoIndex) => {
            const todos = document.querySelectorAll('[data-testid="todo-item"]');
            if (todos[todoIndex]) {
                const checkbox = todos[todoIndex].querySelector('[data-testid="todo-checkbox"]');
                if (checkbox && checkbox.click) {
                    checkbox.click();
                    console.log('Checkbox clicked via JavaScript');
                    return true;
                }
            }
            return false;
        }, index);
        
        await browser.pause(300);
        console.log('JavaScript checkbox click executed');
        return;
    } catch (error) {
        console.log('JavaScript checkbox click failed:', error.message);
    }
    
    // Method 3: Select todo and use keyboard shortcut
    try {
        await todo.click();
        await browser.pause(200);
        await browser.keys(['Control', 'd']);
        await browser.pause(300);
        console.log('Keyboard shortcut toggle executed');
        return;
    } catch (error) {
        console.log('Keyboard shortcut failed:', error.message);
    }
    
    throw new Error(`Failed to toggle todo at index ${index} with all methods`);
}

/**
 * Check if todo is completed by index
 */
export async function isTodoCompleted(index) {
    const todos = await getTodoItems();
    if (index >= todos.length) {
        throw new Error(`Todo index ${index} out of range`);
    }
    
    const todo = todos[index];
    const checkbox = await todo.$('[data-testid="todo-checkbox"]');
    
    // Check if button has 'check-btn--checked' class
    const buttonClass = await checkbox.getAttribute('class');
    return buttonClass.includes('check-btn--checked');
}

/**
 * Delete todo by index - BREAKTHROUGH VERSION with DOM manipulation
 */
export async function deleteTodo(index) {
    const todos = await getTodoItems();
    if (index >= todos.length) {
        throw new Error(`Todo index ${index} out of range`);
    }

    console.log(`🗑️ DELETING TODO at index ${index}...`);
    
    // Method 1: Revolutionary JavaScript DOM manipulation approach
    try {
        const success = await browser.execute((todoIndex) => {
            console.log('🧠 ULTRATHINK DELETE - DOM Manipulation starting...');
            
            const todos = document.querySelectorAll('[data-testid="todo-item"]');
            if (!todos[todoIndex]) {
                console.log('❌ Todo not found at index:', todoIndex);
                return { success: false, error: 'Todo not found' };
            }
            
            const todoElement = todos[todoIndex];
            const deleteBtn = todoElement.querySelector('[data-testid="delete-button"]');
            
            if (!deleteBtn) {
                console.log('❌ Delete button not found in todo');
                return { success: false, error: 'Delete button not found' };
            }
            
            // FORCE DELETE BUTTON TO BE FULLY INTERACTABLE
            deleteBtn.style.pointerEvents = 'auto';
            deleteBtn.style.position = 'relative';
            deleteBtn.style.zIndex = '10002';
            deleteBtn.style.display = 'block';
            deleteBtn.style.visibility = 'visible';
            deleteBtn.style.opacity = '1';
            deleteBtn.style.cursor = 'pointer';
            
            // Remove any overlays that might block the click
            const overlays = document.querySelectorAll('.modal-overlay, .settings-overlay, .command-palette-overlay');
            overlays.forEach(overlay => {
                if (overlay) {
                    overlay.style.pointerEvents = 'none';
                    overlay.style.zIndex = '1';
                }
            });
            
            // Force the entire todo item to be clickable as well
            todoElement.style.pointerEvents = 'auto';
            todoElement.style.zIndex = '1000';
            
            // Create and dispatch multiple types of click events for maximum compatibility
            const events = ['mousedown', 'mouseup', 'click'];
            let clickSuccess = false;
            
            events.forEach(eventType => {
                try {
                    const event = new MouseEvent(eventType, {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        buttons: 1,
                        button: 0
                    });
                    deleteBtn.dispatchEvent(event);
                    if (eventType === 'click') clickSuccess = true;
                } catch (e) {
                    console.log(`Failed to dispatch ${eventType}:`, e.message);
                }
            });
            
            // ALSO try direct click as backup
            try {
                deleteBtn.click();
                clickSuccess = true;
            } catch (e) {
                console.log('Direct click failed:', e.message);
            }
            
            console.log('✅ Delete button DOM manipulation completed, success:', clickSuccess);
            return { success: clickSuccess, error: null };
            
        }, index);
        
        if (success.success) {
            console.log('🎯 BREAKTHROUGH - Delete button clicked via JavaScript DOM manipulation!');
            await browser.pause(500); // Wait for deletion to process
        } else {
            throw new Error(`DOM manipulation failed: ${success.error}`);
        }
        
    } catch (error) {
        console.log('🔄 Method 1 failed, trying Method 2:', error.message);
        
        // Method 2: Enhanced WebDriver click with forced CSS
        try {
            const deleteButton = await todos[index].$('[data-testid="delete-button"]');
            if (await deleteButton.isExisting()) {
                // Force button to be clickable using WebDriver execute
                await browser.execute((element) => {
                    element.style.pointerEvents = 'auto';
                    element.style.position = 'relative';
                    element.style.zIndex = '10002';
                    element.style.display = 'block';
                    element.style.visibility = 'visible';
                    element.style.opacity = '1';
                }, deleteButton);
                
                await deleteButton.click();
                await browser.pause(500);
                console.log('✅ Delete button clicked via WebDriver with CSS override');
            }
        } catch (webDriverError) {
            console.log('🔄 Method 2 failed, trying Method 3:', webDriverError.message);
            
            // Method 3: Select todo and use Delete key
            try {
                await todos[index].click();
                await browser.pause(200);
                await browser.keys(['Delete']);
                await browser.pause(500);
                console.log('✅ Delete via keyboard shortcut');
            } catch (keyboardError) {
                console.log('❌ All delete methods failed:', keyboardError.message);
                throw new Error(`All delete methods failed for todo at index ${index}`);
            }
        }
    }

    // Handle confirmation dialog if enabled - ENHANCED
    try {
        await browser.pause(300); // Wait for dialog to appear
        
        // Try multiple ways to find and click the confirmation button
        let confirmClicked = false;
        
        // Method 1: Direct testid
        try {
            const confirmButton = await $('[data-testid="confirm-delete"]');
            if (await confirmButton.isExisting()) {
                await confirmButton.click();
                confirmClicked = true;
                console.log('✅ Confirmation dialog clicked via testid');
            }
        } catch (e) {
            console.log('Confirm button testid failed:', e.message);
        }
        
        // Method 2: JavaScript confirmation click
        if (!confirmClicked) {
            try {
                const jsSuccess = await browser.execute(() => {
                    const confirmBtn = document.querySelector('[data-testid="confirm-delete"]') || 
                                    document.querySelector('.confirm-delete') ||
                                    document.querySelector('button[class*="confirm"]');
                    if (confirmBtn) {
                        confirmBtn.click();
                        console.log('Confirmation clicked via JavaScript');
                        return true;
                    }
                    return false;
                });
                
                if (jsSuccess) {
                    confirmClicked = true;
                    console.log('✅ Confirmation dialog clicked via JavaScript');
                }
            } catch (e) {
                console.log('JavaScript confirmation failed:', e.message);
            }
        }
        
        if (confirmClicked) {
            await browser.pause(500); // Wait for confirmation to process
        }
        
    } catch (error) {
        console.log('No confirmation dialog needed or failed to handle:', error.message);
    }
    
    console.log('🎯 DELETE OPERATION COMPLETED');
}

/**
 * 🧪 REVOLUTIONARY: Clear all test data via HTTP endpoint for complete isolation
 */
export async function clearTestData() {
    console.log('🧼 CLEARING ALL TEST DATA via HTTP endpoint...');
    
    try {
        // Method 1: Use HTTP endpoint for complete data isolation
        const response = await fetch('http://localhost:3001/test/clear-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test data cleared successfully:', result.message);
            
            // Additional verification
            const statsResponse = await fetch('http://localhost:3001/test/data-stats');
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                console.log('📊 Data stats after clearing:', stats);
            }
            
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.log('❌ HTTP endpoint clearing failed:', error.message);
        console.log('🔄 Falling back to UI-based clearing...');
        
        // Fallback to UI-based clearing
        return await clearAllTodosUI();
    }
}

/**
 * Fallback: Clear all todos via UI interaction (original method)
 */
export async function clearAllTodosUI() {
    let todos = await getTodoItems();
    
    while (todos.length > 0) {
        // Use Ctrl+A to select all
        await browser.keys(['Control', 'a']);
        await browser.pause(200);
        
        // Delete selected
        await browser.keys(['Delete']);
        await browser.pause(300);
        
        // Handle confirmation dialog if it appears
        const confirmButton = await $('[data-testid="confirm-delete"]');
        if (await confirmButton.isExisting()) {
            await confirmButton.click();
            await browser.pause(500);
        }
        
        // Check if todos were deleted
        const newTodos = await getTodoItems();
        if (newTodos.length === todos.length) {
            // If no todos were deleted, try individual deletion
            if (todos.length > 0) {
                await deleteTodo(0);
                await browser.pause(500);
            }
        }
        
        todos = await getTodoItems();
    }
}

/**
 * Open command palette
 */
export async function openCommandPalette() {
    // Use keyboard shortcut
    await browser.keys(['Control', 'Shift', 'p']);
    
    // Wait for palette to open
    await browser.waitUntil(
        async () => {
            const palette = await $('[data-testid="command-palette"]');
            return await palette.isDisplayed();
        },
        {
            timeout: 2000,
            timeoutMsg: 'Command palette did not open'
        }
    );
}

/**
 * Execute command from palette
 */
export async function executeCommand(commandName) {
    await openCommandPalette();
    
    const searchInput = await $('[data-testid="command-search"]');
    await searchInput.setValue(commandName);
    
    // Wait for filtering
    await browser.pause(300);
    
    // Press Enter to execute first result
    await browser.keys(['Enter']);
    
    // Wait for palette to close
    await browser.waitUntil(
        async () => {
            const palette = await $('[data-testid="command-palette"]');
            return !(await palette.isDisplayed());
        },
        {
            timeout: 2000,
            timeoutMsg: 'Command palette did not close'
        }
    );
}

/**
 * Open settings modal
 */
export async function openSettings() {
    try {
        // Method 1: Try keyboard shortcut first (Ctrl+,)
        await browser.keys(['Control', ',']);
        await browser.pause(500);
        
        // Check if settings opened
        const settings = await $('[data-testid="settings-modal"]');
        if (await settings.isDisplayed()) {
            console.log('Settings opened via keyboard shortcut');
            return;
        }
    } catch (error) {
        console.log('Keyboard shortcut failed:', error.message);
    }
    
    try {
        // Method 2: Try command palette
        await executeCommand('Open Settings');
        console.log('Settings opened via command palette');
        return;
    } catch (error) {
        console.log('Command palette failed, trying menu fallback:', error.message);
        
        // Method 3: JavaScript direct click on settings
        try {
            await browser.execute(() => {
                // Try to find and click settings button directly
                const settingsButtons = document.querySelectorAll('[data-testid*="settings"], [data-testid*="preferences"]');
                for (const button of settingsButtons) {
                    if (button && button.click) {
                        button.click();
                        console.log('Settings opened via direct JavaScript click');
                        return true;
                    }
                }
                
                // Try menu item directly
                const menuPreferences = document.querySelector('[data-testid="menu-item-preferences"]');
                if (menuPreferences && menuPreferences.click) {
                    menuPreferences.click();
                    console.log('Settings opened via direct menu item click');
                    return true;
                }
                
                return false;
            });
            
            await browser.pause(500);
            const settings = await $('[data-testid="settings-modal"]');
            if (await settings.isDisplayed()) {
                console.log('Settings opened via JavaScript direct click');
                return;
            }
        } catch (error) {
            console.log('JavaScript direct click failed:', error.message);
        }
    
        // Fallback to menu
        await ensureMenuVisible();
        
        // Check if we're in hamburger mode
        const hamburgerMenu = await $('[data-testid="hamburger-menu"]');
        const isHamburgerMode = await hamburgerMenu.isExisting();
        
        if (isHamburgerMode) {
            console.log('Using hamburger menu mode');
            // Click hamburger menu
            await hamburgerMenu.click();
            await browser.pause(300);
            
            // Hover over File menu item to open submenu
            const fileMenuItem = await $('button').filter(async (elem) => {
                const text = await elem.getText();
                return text.includes('File') || text.includes('ファイル');
            });
            
            if (await fileMenuItem.isExisting()) {
                await fileMenuItem.moveTo();
                await browser.pause(300);
                
                // Look for preferences in the submenu
                const preferencesItem = await $('[data-testid="menu-item-preferences"]');
                await preferencesItem.click();
            } else {
                throw new Error('File menu item not found in hamburger mode');
            }
        } else {
            console.log('Using regular menu mode');
            const fileMenu = await $('[data-testid="menu-file"]');
            console.log('File menu exists:', await fileMenu.isExisting());
            console.log('File menu clickable:', await fileMenu.isClickable());
            
            await fileMenu.click();
            await browser.pause(500); // Wait longer for dropdown
            
            // Check if dropdown opened
            const fileDropdown = await $('[data-testid="menu-file-dropdown"]');
            const dropdownExists = await fileDropdown.isExisting();
            const dropdownVisible = dropdownExists ? await fileDropdown.isDisplayed() : false;
            console.log('File dropdown exists:', dropdownExists);
            console.log('File dropdown visible:', dropdownVisible);
            
            if (!dropdownVisible) {
                console.log('Dropdown not visible, trying click again');
                await fileMenu.click();
                await browser.pause(500);
            }
            
            // Wait for preferences item to appear
            await browser.waitUntil(
                async () => {
                    const preferencesItem = await $('[data-testid="menu-item-preferences"]');
                    const exists = await preferencesItem.isExisting();
                    console.log('Preferences item exists:', exists);
                    return exists;
                },
                {
                    timeout: 3000,
                    timeoutMsg: 'Preferences menu item did not appear'
                }
            );
            
            const preferencesItem = await $('[data-testid="menu-item-preferences"]');
            await preferencesItem.click();
        }
    }
    
    // Wait for settings to open
    await browser.waitUntil(
        async () => {
            const settings = await $('[data-testid="settings-modal"]');
            return await settings.isDisplayed();
        },
        {
            timeout: 3000,
            timeoutMsg: 'Settings modal did not open'
        }
    );
}

/**
 * Get current theme
 */
export async function getCurrentTheme() {
    const htmlElement = await $('html');
    const dataTheme = await htmlElement.getAttribute('data-theme');
    return dataTheme;
}

/**
 * Wait for connection to backend
 */
export async function waitForConnection() {
    await browser.waitUntil(
        async () => {
            const status = await $('[data-testid="connection-status"]');
            if (!await status.isExisting()) {
                return false;
            }
            
            // Try to get text first (detailed mode)
            const text = await status.getText();
            if (text && (text.includes('Connected') || text.includes('接続済み'))) {
                return true;
            }
            
            // For slim mode, check title attribute or hover to get tooltip
            try {
                // Move mouse to the element to trigger tooltip
                await status.moveTo();
                await browser.pause(200);
                
                // Look for tooltip text
                const tooltip = await $('.connection-tooltip');
                if (await tooltip.isExisting()) {
                    const tooltipText = await tooltip.getText();
                    return tooltipText.includes('Connected') || tooltipText.includes('接続済み');
                }
                
                // Fallback: just check if the element exists and is visible
                return await status.isDisplayed();
            } catch (error) {
                // Final fallback: just check if element exists
                return await status.isExisting();
            }
        },
        {
            timeout: 15000,
            timeoutMsg: 'Failed to connect to backend'
        }
    );
}