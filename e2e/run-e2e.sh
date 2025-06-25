#!/bin/bash

# Start frontend dev server in background
echo "Starting frontend dev server..."
cd ..
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
sleep 5

# Start backend server in background
echo "Starting backend server..."
cd server
YUTODO_SERVER_PORT=3001 npm run start &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 3

# Run Tauri in dev mode with E2E tests
echo "Running E2E tests..."
cd ../e2e
npm test

# Kill servers
echo "Cleaning up..."
kill $FRONTEND_PID
kill $BACKEND_PID

echo "E2E tests completed"