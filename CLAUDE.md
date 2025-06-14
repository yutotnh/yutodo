# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri desktop application for todo list management with a React frontend and Node.js backend. The app features real-time synchronization using WebSockets, keyboard shortcuts, SQLite database for persistence, and native desktop integration with export/import functionality.

### Architecture

- **Frontend**: React + TypeScript + Vite running in Tauri webview
- **Backend**: Node.js Express server with Socket.IO for real-time communication
- **Database**: SQLite for todo persistence
- **Desktop**: Tauri v2 Rust wrapper for cross-platform desktop app

### Key Components

- **Frontend**: `src/App.tsx` is the main component managing state, socket connections, and UI
- **Backend**: `server/server.ts` handles WebSocket events and SQLite operations
- **Types**: Shared interfaces in `src/types/todo.ts` and `src/types/config.ts`
- **Hooks**: Custom hooks for socket communication (`useSocket.ts`) and keyboard shortcuts (`useKeyboardShortcuts.ts`)
- **Configuration**: TOML-based config system with `src/utils/configManager.ts`

## Development Commands

### Frontend (Tauri + React)
```bash
npm run dev          # Start Vite dev server
npm run build        # Build React app and TypeScript
npm run preview      # Preview built app
npm run tauri dev    # Start Tauri development mode
npm run tauri build  # Build Tauri desktop app
```

### Backend (Node.js Server)
```bash
cd server
npm run dev          # Start server with ts-node
npm run build        # Compile TypeScript
npm run start        # Run compiled server
```

## Development Workflow

1. Start the backend server: `cd server && npm run dev`
2. Start the Tauri app: `npm run tauri dev`
3. The app connects to the server at `http://localhost:3001` by default

## Architecture Patterns

### Real-time State Management
- `useSocket.ts` manages WebSocket connection and synchronizes todos across all clients
- Socket.IO events: `todo:add`, `todo:update`, `todo:delete`, `todo:toggle`, `todos:reorder`
- State flows from server → Socket.IO → useSocket → App.tsx → UI components

### Configuration System
- TOML-based configuration with JSON Schema validation (`config.schema.json`)
- `configManager.ts` handles file operations with localStorage fallback
- Settings persist both in memory and configuration file
- Conversion functions between `AppSettings` and `TodoAppConfig` interfaces

### Theme and UI State
- Dark/light/auto theme detection with system preference monitoring
- Slim mode for compact desktop experience
- Auto-hiding header triggered by mouse position
- Custom CSS injection for user personalization

### Component Architecture
- `App.tsx` orchestrates global state, settings, and real-time connections
- Custom hooks abstract complex logic (WebSocket, keyboard shortcuts)
- Settings panel supports live configuration export/import/reset
- Delete confirmation dialogs with settings-controlled behavior

### Tauri v2 Integration
- **Plugins Used**: opener, dialog, fs, clipboard-manager
- **Permissions**: Configured in `src-tauri/capabilities/default.json`
- **Native Features**: File dialogs, clipboard access, URL opening, window management
- **Cross-platform**: Handles WSLg limitations with fallbacks

### Markdown Support
- Both task titles and descriptions support full Markdown rendering
- Custom ReactMarkdown components for inline title rendering
- Link clicking opens URLs in default browser (with WSLg fallbacks)
- Right-click URLs to copy to clipboard

## Key Features

- **Real-time sync**: Multiple clients stay synchronized via Socket.IO
- **Keyboard shortcuts**: Extensive keyboard navigation (Ctrl+N for new task, Ctrl+F for search, etc.)
- **Filtering**: Filter todos by status, priority, and overdue items
- **Import/Export**: Native file dialogs for JSON/CSV export, TOML config export/import
- **Custom styling**: Support for custom CSS injection
- **Configuration**: TOML settings file with export/import/reset functionality
- **Theme system**: Auto/light/dark mode with system preference detection
- **Slim mode**: Compact UI mode for desktop
- **Priority system**: High (2), Medium (1), Low (0) priority levels
- **Scheduling**: Optional due dates for todos
- **Delete confirmation**: Optional confirmation dialogs (configurable)
- **Markdown rendering**: Full Markdown support in titles and descriptions
- **URL handling**: Click links to open in browser, right-click to copy

## Database Schema

SQLite table `todos`:
- `id` (TEXT PRIMARY KEY)
- `title` (TEXT NOT NULL)
- `description` (TEXT)
- `completed` (BOOLEAN)
- `priority` (INTEGER, 0-2)
- `scheduledFor` (DATETIME)
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)
- `order` (INTEGER) - Custom ordering for drag & drop

## Tauri v2 Plugin Configuration

### Registered Plugins (src-tauri/src/lib.rs)
- `tauri_plugin_opener` - URL and file opening
- `tauri_plugin_dialog` - Native dialogs
- `tauri_plugin_fs` - File system operations
- `tauri_plugin_clipboard_manager` - Clipboard access

### Required Permissions (src-tauri/capabilities/default.json)
- `opener:allow-open-url` - Open URLs in default browser
- `dialog:allow-save/open/message` - File dialogs and alerts
- `fs:allow-read/write-text-file` - Config file operations
- `clipboard-manager:allow-read/write-text` - Clipboard operations
- `core:window:allow-*` - Window management (always on top, sizing, etc.)

### Cross-Platform Considerations
- **WSLg Environment**: URL opening may fail, automatic clipboard fallback
- **File Operations**: Native save dialogs with browser fallback
- **Window Management**: Always on top may not work in WSLg

## Import/Export System

### Export Formats
- **JSON**: Complete task data with metadata
- **CSV**: Spreadsheet-compatible format
- **TOML**: Settings configuration backup

### Native File Handling
- Uses Tauri plugin-dialog for save dialogs
- Automatic fallback to clipboard if file operations fail
- Cross-platform file type filtering

## WSLg Environment Handling

The app detects WSLg environment and provides appropriate fallbacks:
- URL clicks trigger clipboard copy with user notification
- File operations fallback to clipboard when native dialogs fail
- Always on top functionality may be limited by WSLg constraints