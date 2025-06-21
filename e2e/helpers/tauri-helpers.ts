import { spawn, ChildProcess } from 'child_process';
import { Page } from '@playwright/test';
import path from 'path';

let tauriProcess: ChildProcess | null = null;

/**
 * Launch Tauri application in development mode
 */
export async function launchTauriApp(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting Tauri app...');
    
    // Kill any existing process
    if (tauriProcess) {
      tauriProcess.kill();
    }

    // Launch Tauri in development mode
    tauriProcess = spawn('npm', ['run', 'tauri', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      shell: true,
      env: {
        ...process.env,
        // Ensure Tauri runs in development mode
        TAURI_ENV: 'development',
        // Disable auto-opening browser
        BROWSER: 'none',
      },
    });

    let output = '';
    
    tauriProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      console.log('Tauri stdout:', text);
      output += text;
      
      // Wait for the app to be ready
      if (text.includes('tauri://localhost') || text.includes('App ready') || text.includes('VITE') || text.includes('ready in')) {
        setTimeout(() => resolve(), 3000); // Give it 3 more seconds to fully initialize
      }
    });

    tauriProcess.stderr?.on('data', (data) => {
      console.error('Tauri stderr:', data.toString());
    });

    tauriProcess.on('error', (error) => {
      reject(new Error(`Failed to start Tauri app: ${error.message}`));
    });

    tauriProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Tauri process exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Timeout waiting for Tauri app to start'));
    }, 30000);
  });
}

/**
 * Close the Tauri application
 */
export async function closeTauriApp(): Promise<void> {
  if (tauriProcess) {
    console.log('Closing Tauri app...');
    
    // Try graceful shutdown first
    tauriProcess.kill('SIGTERM');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force kill if still running
    try {
      process.kill(tauriProcess.pid!, 0); // Check if process is still running
      tauriProcess.kill('SIGKILL');
    } catch (e) {
      // Process already terminated
    }
    
    tauriProcess = null;
  }
}

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the main app container
  await page.waitForSelector('.app-container', { timeout: 10000 });
  
  // Wait for initial socket connection
  await page.waitForFunction(() => {
    const statusElement = document.querySelector('.connection-status');
    return statusElement && !statusElement.textContent?.includes('Connecting');
  }, { timeout: 10000 });
}

/**
 * Helper to interact with Tauri-specific APIs
 */
export async function invokeCommand(page: Page, command: string, args?: any): Promise<any> {
  return await page.evaluate(async ({ cmd, payload }) => {
    // @ts-ignore - Tauri API is injected at runtime
    if (window.__TAURI__) {
      // @ts-ignore
      return await window.__TAURI__.tauri.invoke(cmd, payload);
    }
    throw new Error('Tauri API not available');
  }, { cmd: command, payload: args });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ 
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true 
  });
}