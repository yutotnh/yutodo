import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tauriDriver;
let serverProcess;

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
            application: '../src-tauri/target/release/yutodo',
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
        // Kill any existing processes
        try {
            await new Promise((resolve) => {
                const killProcesses = spawn('pkill', ['-f', 'tauri-driver'], { stdio: 'ignore' });
                killProcesses.on('close', () => resolve());
                setTimeout(resolve, 1000); // Timeout after 1 second
            });
        } catch (e) {
            // Ignore if no processes to kill
        }

        // Check if binary already exists
        const binaryPath = join(__dirname, '../src-tauri/target/release/yutodo');
        const fs = await import('fs');
        
        if (!fs.existsSync(binaryPath)) {
            console.log('Building Tauri application...');
            const buildProcess = spawn('npm', ['run', 'tauri', 'build'], {
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

        // Start backend server with test environment
        console.log('Starting backend server in TEST MODE...');
        serverProcess = spawn('npm', ['run', 'start'], {
            cwd: join(__dirname, '../server'),
            stdio: 'pipe',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'test',
                YUTODO_TEST: 'true'
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
    }
};