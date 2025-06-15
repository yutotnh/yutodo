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
- **Internationalization**: `src/i18n/` - Complete i18n system with English/Japanese support  
- **Menu System**: Custom header-integrated menu bar (`src/components/MenuBar.tsx`) replacing native Tauri menus

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
npm run dev          # Start server with ts-node (development)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled server from dist/
npm test             # Run tests (placeholder - no tests implemented)
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
- Custom hooks abstract complex logic (WebSocket, keyboard shortcuts with OS detection)
- Settings panel supports live configuration export/import/reset
- All modals (Settings, ShortcutHelp, DeleteConfirmDialog) support Esc key and outside-click closing
- Delete confirmation dialogs with settings-controlled behavior
- Overlay-based UI components (header auto-hide, bottom Add Todo form) that don't displace content
- **Menu System**: Custom header-integrated MenuBar component with dropdown menus that prevent header auto-hide during interaction

### Tauri v2 Integration
- **Plugins Used**: opener, dialog, fs, clipboard-manager
- **Permissions**: Configured in `src-tauri/capabilities/default.json`
- **Native Features**: File dialogs, clipboard access, URL opening, window management
- **Cross-platform**: Handles WSLg limitations with fallbacks

### Internationalization (i18n)
- **react-i18next** integration with OS-aware language detection disabled in favor of app settings control
- **Translation files**: `src/i18n/locales/en.json` and `src/i18n/locales/ja.json`
- **Language persistence**: Dual storage in localStorage (`yutodoAppSettings`) and TOML config file
- **Settings integration**: Language selector in settings panel with auto/en/ja options
- **Type safety**: TypeScript integration for translation keys
- **OS detection**: Dynamic keyboard shortcut labels (Ctrl vs Cmd) based on platform
- **Extensible**: Easy to add new languages by adding translation files

### Markdown Support
- Both task titles and descriptions support full Markdown rendering
- Custom ReactMarkdown components for inline title rendering
- Link clicking opens URLs in default browser (with WSLg fallbacks)
- Right-click URLs to copy to clipboard

## Key Features

- **Real-time sync**: Multiple clients stay synchronized via Socket.IO
- **Keyboard shortcuts**: Extensive keyboard navigation with OS-aware labels (Ctrl/Cmd), VS Code-style sequences (Ctrl+K, Ctrl+S for help), Microsoft To Do-style Ctrl+D for completion toggle
- **Filtering**: Filter todos by status, priority, and overdue items
- **Import/Export**: Native file dialogs for TOML export/import, unified format with standard `[[tasks]]` table syntax
- **Custom styling**: Support for custom CSS injection
- **Configuration**: TOML settings file with export/import/reset functionality
- **Theme system**: Auto/light/dark mode with system preference detection
- **Slim mode**: Compact UI mode for desktop
- **Priority system**: High (2), Medium (1), Low (0) priority levels
- **Scheduling**: Optional due dates for todos
- **Delete confirmation**: Optional confirmation dialogs (configurable)
- **Markdown rendering**: Full Markdown support in titles and descriptions
- **URL handling**: Click links to open in browser, right-click to copy
- **Internationalization**: English/Japanese language support with app-controlled language persistence
- **Modal UX**: All dialogs support Esc key and outside-click closing
- **Overlay UI**: Non-intrusive header and Add Todo form that overlay content without displacement
- **Element selection prevention**: CSS and keyboard handling to prevent unwanted text selection
- **Multi-selection**: Excel-like task selection with Shift+Click (range) and Ctrl+Click (individual) with visual feedback
- **Completed task management**: Collapsible completed tasks section (HTML `<details>`-like functionality) with expand/collapse toggle
- **Header Menu System**: Custom menu bar integrated into header with File/Edit/View/Help menus and keyboard shortcuts

## Database Architecture

### Database Location & Storage
- **OS-Standard Paths**: Database stored in OS-appropriate application data directories
  - **Linux**: `~/.local/share/YuToDo/todos.db`
  - **Windows**: `%APPDATA%/YuToDo/todos.db`
  - **macOS**: `~/Library/Application Support/YuToDo/todos.db`
- **Automatic Migration**: Server detects old database in git repository and migrates data to new location
- **Directory Creation**: Automatically creates data directory structure if not present
- **Git Exclusion**: Database files excluded from version control via `.gitignore`

### Database Schema

SQLite table `todos`:
- `id` (TEXT PRIMARY KEY)
- `title` (TEXT NOT NULL)
- `description` (TEXT)
- `completed` (BOOLEAN)
- `priority` (INTEGER, 0-2)
- `scheduledFor` (DATETIME)
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)
- `order_index` (INTEGER) - Custom ordering for drag & drop

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
- **TOML Only**: Unified export format using standard TOML table syntax (`[[tasks]]`) with metadata and comments
- **Settings Backup**: TOML configuration export/import with complete app settings

### Native File Handling
- **Tauri Environment**: Native file dialogs with `.toml` extension filtering
- **Browser Environment**: Direct file download/upload functionality  
- **Cross-platform**: Automatic detection and appropriate file handling method
- **Menu Integration**: Direct export/import accessible from File menu without opening settings panel

## WSLg Environment Handling

The app detects WSLg environment and provides appropriate fallbacks:
- URL clicks trigger clipboard copy with user notification
- File operations fallback to clipboard when native dialogs fail
- Always on top functionality may be limited by WSLg constraints

## UI Behavior Patterns

### Overlay Header Design
- **Auto-hide trigger**: Header appears when mouse cursor is within **30px** of top edge
- **Position**: `position: fixed` overlay that doesn't displace content
- **Hide behavior**: Multiple detection methods for reliable hiding when mouse leaves window (critical for Tauri environments)
- **Animation**: Smooth `transform: translateY()` and opacity transitions
- **Design**: Thin (28px) with tile-style buttons and backdrop blur

### Add Todo Form
- **Position**: Fixed overlay at bottom of screen (`position: fixed; bottom: 0`)
- **Non-intrusive**: Overlays content without pushing other elements
- **Styling**: Semi-transparent background with backdrop blur effect
- **Accessibility**: Always visible and accessible via keyboard shortcuts

### Modal Dialog Patterns
- **Consistent UX**: All modals (Settings, ShortcutHelp, DeleteConfirmDialog) follow same interaction patterns
- **Esc key**: Always closes modal with `preventDefault()` and `stopPropagation()`
- **Outside click**: Closes modal when clicking outside dialog content area
- **Conflict resolution**: Main keyboard shortcuts disabled when modals are open

### Connection Status Indicators
- **Detailed mode**: Full connection status display in header center
- **Slim mode**: Small colored dot indicator in bottom-right corner with tooltip
- **Color coding**: Green (connected), Blue (connecting), Gray (disconnected), Red (error)

### Keyboard Shortcut System
- **OS Detection**: Dynamically shows Ctrl (Windows/Linux) vs Cmd (macOS) in help text
- **VS Code-style sequences**: Ctrl+K, Ctrl+S for help (2-second timeout between keys)
- **Modal awareness**: Main shortcuts disabled when dialogs are open
- **Prevention**: CSS `user-select: none` prevents unwanted element selection

## Adding New Languages

To add a new language (e.g., French):
1. Create `src/i18n/locales/fr.json` with complete translations
2. Add to `resources` object in `src/i18n/index.ts`
3. Add to `supportedLanguages` object
4. Update language settings UI in `Settings.tsx`
5. Test translation key coverage across all components

## Important Development Notes

### Character Encoding & i18n
- **All UI text** must use i18n translation keys to prevent character encoding issues in WSL environments
- **Language persistence**: Settings stored in both localStorage (`yutodoAppSettings`) and TOML config file
- **Config type safety**: Language field must be included in both `AppSettings` and `TodoAppConfig` interfaces plus conversion functions

### UI Development Patterns
- **Modal components**: Always implement both Esc key handling and outside-click detection
- **Overlay positioning**: Use `position: fixed` with high z-index for non-displacing overlays
- **Keyboard shortcuts**: Add `isModalOpen` parameter to prevent conflicts with modal interactions
- **OS detection**: Use platform detection for keyboard shortcut display (Ctrl vs Cmd)

### State Management
- **Settings migration**: Check for localStorage key changes (`todoAppSettings` → `yutodoAppSettings`)
- **Modal state tracking**: Include all modal states in `isModalOpen` calculation for keyboard shortcut system
- **Real-time updates**: Language and theme changes apply immediately without restart

### Multi-Selection System
- **Excel-like interaction**: Shift+Click for range selection, Ctrl/Cmd+Click for individual toggle
- **Visual feedback**: Animated checkmark badges appear in top-right corner of selected items
- **Selection counter**: Shows "X items selected" when 2+ items selected (hidden for single selection)
- **Event handling**: Click detection with `event.detail === 2` to prevent conflicts with double-click editing
- **State management**: Uses `Set<string>` for selected IDs and tracks `lastSelectedIndex` for range operations
- **Keyboard integration**: Select All (Ctrl+A), Delete Selected, and Escape to clear selection

### Task Editing System
- **Double-click editing**: Works in both slim and detailed modes with click position detection for cursor placement
- **Event isolation**: `preventDefault()` and `stopPropagation()` prevent conflicts between selection and editing
- **Auto-deselection**: Starting edit mode automatically clears selection state
- **Canvas-based positioning**: Uses 2D canvas context to calculate precise cursor position from click coordinates

### Cross-platform Considerations
- **Mouse tracking in Tauri**: Implement multiple event listeners (document, body, window) for reliable mouse leave detection
- **WSLg fallbacks**: Always provide clipboard alternatives for file operations and URL opening
- **Element selection**: Use CSS `user-select: none` globally with specific exceptions for text inputs
- **OS detection**: Platform-aware keyboard shortcut labels (Ctrl vs Cmd) with automatic detection

### Header Menu System Implementation
- **Event Isolation**: Menu clicks use `preventDefault()` and `stopPropagation()` to prevent header drag conflicts
- **State Management**: Menu open state (`isMenuOpen`) prevents header auto-hide during menu interaction
- **Dropdown Positioning**: Absolute positioned dropdowns with slide-in animation and outside-click detection
- **Keyboard Navigation**: Alt+F/E/V/H shortcuts open menus, arrow keys navigate within menus, Esc key closes menus, Enter activates items
- **Visual Feedback**: Active state styling and hover effects with theme-aware colors
- **Windows-style Access**: Alt key displays access key hints, full keyboard navigation support

### Completed Tasks Management
- **Collapsible Section**: HTML `<details>`-like behavior with expand/collapse toggle button
- **Visual Separation**: Clear separation between pending and completed tasks with animated arrow indicator
- **Default State**: Expanded by default, state persists during session
- **Sorting**: Completed tasks sorted by most recently updated first
- **Integration**: Works seamlessly with filtering, search, and multi-selection features

## Known Issues

### Keyboard Event Handling
- **Enter key behavior**: In some cases, pressing Enter while a task is selected may cause the task to enter an unresponsive state (background becomes slightly darker) until Escape is pressed. This appears to be related to focus management between TodoItem components and the AddTodoForm. 
  - **Workaround**: Press Escape to clear the state, or use E/F2 keys for task editing instead of Enter
  - **Status**: Under investigation - Enter key event handling has been removed from multiple locations but the issue persists
  - **Impact**: Does not affect core functionality, but may cause temporary UI confusion

### Recent Changes and Improvements
- **Database Location Migration**: Moved database from git repository to OS-standard application data directories with automatic migration
- **TOML Format Unification**: Export/import now uses unified TOML format exclusively with standard `[[tasks]]` table syntax
- **Completion Keyboard Shortcut**: Changed from Space key to Ctrl+D (Microsoft To Do style) for better UX and fewer conflicts
- **Menu System Integration**: Settings moved from Edit menu to File menu (VS Code style), removed toggle theme from menu for simplicity
- **Completed Tasks UI**: Added collapsible section for completed tasks with expand/collapse functionality
- **File Operations**: Direct export/import from menu bar bypasses settings screen for streamlined workflow
- **Git Repository Hygiene**: Database files now excluded from version control following best practices