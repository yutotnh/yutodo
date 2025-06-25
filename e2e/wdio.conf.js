import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tauriDriver;
let serverProcess;
let frontendProcess;

export const config = {
    runner: 'local',
    specs: [
        './tests/**/*.spec.ts'
    ],
    maxInstances: 1,
    maxInstancesPerCapability: 1,
    hostname: 'localhost',
    port: 4444,
    path: '/',
    capabilities: [{
        browserName: 'wry',
        'tauri:options': {
            application: process.platform === 'win32' 
                ? '../src-tauri/target/debug/yutodo.exe'
                : '../src-tauri/target/debug/yutodo',
        },
        'wdio:options': {
            env: {
                TAURI_DEV_URL: 'http://localhost:1420'
            }
        }
    }],
    logLevel: 'info',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },


    onPrepare: async function () {
        // Kill any existing processes (cross-platform)
        try {
            await new Promise((resolve) => {
                const isWindows = process.platform === 'win32';
                let killProcesses;
                
                if (isWindows) {
                    // Windows: Use taskkill command
                    killProcesses = spawn('taskkill', ['/F', '/IM', 'tauri-driver.exe'], { 
                        stdio: 'ignore',
                        shell: true 
                    });
                } else {
                    // Linux/Unix: Use pkill command
                    killProcesses = spawn('pkill', ['-f', 'tauri-driver'], { stdio: 'ignore' });
                }
                
                killProcesses.on('close', () => resolve());
                killProcesses.on('error', () => resolve()); // Ignore errors - process might not exist
                setTimeout(resolve, 2000); // Timeout after 2 seconds
            });
        } catch (e) {
            console.log('No existing tauri-driver processes found');
        }

        // Check if binary already exists (cross-platform)
        const isWindows = process.platform === 'win32';
        const binaryName = isWindows ? 'yutodo.exe' : 'yutodo';
        const binaryPath = join(__dirname, '../src-tauri/target/debug', binaryName);
        const fs = await import('fs');
        
        if (!fs.existsSync(binaryPath)) {
            console.log('Building Tauri application...');
            const buildProcess = spawn('cargo', ['build', '--manifest-path', 'src-tauri/Cargo.toml'], {
                cwd: join(__dirname, '..'),
                stdio: 'inherit',
                shell: true
            });

            await new Promise((resolve, reject) => {
                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('Tauri build completed successfully');
                        resolve();
                    } else {
                        reject(new Error(`Build failed with code ${code}`));
                    }
                });
            });
        } else {
            console.log('Using existing Tauri build...');
        }

        // Start frontend dev server
        console.log('Starting frontend dev server...');
        frontendProcess = spawn('npm', ['run', 'dev'], {
            cwd: join(__dirname, '..'),
            stdio: 'pipe',
            shell: true
        });

        // Wait for frontend to be ready
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('Frontend server started');
                resolve();
            }, 5000);

            frontendProcess.stdout.on('data', (data) => {
                if (data.toString().includes('ready in')) {
                    console.log('Frontend dev server ready');
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        // Start backend server with test environment
        console.log('Starting backend server in TEST MODE...');
        serverProcess = spawn('npm', ['run', 'start'], {
            cwd: join(__dirname, '../server'),
            stdio: 'pipe',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'test',
                YUTODO_TEST: 'true',
                YUTODO_SERVER_PORT: '3001'
            }
        });

        // Wait for server to be ready
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('Backend server timeout, continuing...');
                resolve();
            }, 10000);

            serverProcess.stdout.on('data', (data) => {
                if (data.toString().includes('Server running on')) {
                    console.log('Backend server started');
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        // Start tauri-driver with error handling
        console.log('Starting tauri-driver...');
        
        await new Promise((resolve, reject) => {
            tauriDriver = spawn('tauri-driver', ['--port', '4444'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let driverReady = false;

            tauriDriver.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`tauri-driver: ${output}`);
                if (output.includes('Listening') || !driverReady) {
                    driverReady = true;
                    setTimeout(resolve, 2000); // Give it time to fully start
                }
            });

            tauriDriver.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`tauri-driver error: ${error}`);
                if (error.includes('can not listen')) {
                    reject(new Error('Port 4444 is already in use'));
                }
            });

            tauriDriver.on('error', (error) => {
                reject(new Error(`Failed to start tauri-driver: ${error.message}`));
            });

            // Fallback timeout
            setTimeout(() => {
                if (!driverReady) {
                    console.log('tauri-driver timeout, continuing anyway...');
                    resolve();
                }
            }, 5000);
        });
    },

    onComplete: function () {
        // Kill tauri-driver
        if (tauriDriver) {
            console.log('Stopping tauri-driver...');
            tauriDriver.kill();
        }

        // Kill backend server
        if (serverProcess) {
            console.log('Stopping backend server...');
            serverProcess.kill();
        }

        // Kill frontend dev server
        if (frontendProcess) {
            console.log('Stopping frontend dev server...');
            frontendProcess.kill();
        }
    }
};