#!/usr/bin/env node

/**
 * Simple wrapper to start the API server
 * This file provides an easy way to start the backend API server
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Change to the API directory and run the dev script
const apiDir = join(__dirname, 'apps', 'api');
const port = process.env.PORT || 3003;

console.log(`Starting API server on port ${port}...`);

// Set the PORT environment variable and run the API dev script
const apiProcess = spawn('pnpm', ['run', 'dev'], {
    cwd: apiDir,
    env: { ...process.env, PORT: port },
    stdio: 'inherit'
});

apiProcess.on('error', (error) => {
    console.error(`Failed to start API server: ${error.message}`);
    process.exit(1);
});

apiProcess.on('close', (code) => {
    console.log(`API server exited with code ${code}`);
    process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down API server...');
    apiProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\nShutting down API server...');
    apiProcess.kill('SIGTERM');
});