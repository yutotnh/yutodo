#!/bin/bash

echo "Starting E2E test environment..."

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "tauri-driver|yutodo|vite|ts-node" || true
sleep 2

# Start frontend dev server
echo "Starting frontend dev server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
sleep 5

# Start backend server
echo "Starting backend server..."
cd server
YUTODO_SERVER_PORT=3001 npm run start &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
sleep 3

# Start Tauri in dev mode
echo "Starting Tauri in development mode..."
npm run tauri dev &
TAURI_PID=$!

# Wait for Tauri to be ready
sleep 10

# Run E2E tests
echo "Running E2E tests..."
cd e2e
npm test
TEST_RESULT=$?

# Clean up
echo "Cleaning up..."
kill $FRONTEND_PID $BACKEND_PID $TAURI_PID 2>/dev/null || true
pkill -f "tauri-driver" || true

exit $TEST_RESULT