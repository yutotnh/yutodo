# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri desktop application for todo list management with a React frontend and Node.js backend. The app features real-time synchronization using WebSockets, keyboard shortcuts, SQLite database for persistence, native desktop integration with export/import functionality, and a comprehensive schedule management system.

### Architecture

- **Frontend**: React + TypeScript + Vite running in Tauri webview
- **Backend**: Node.js Express server with Socket.IO for real-time communication and schedule execution engine
- **Database**: SQLite with OS-standard storage locations and automatic migration
- **Desktop**: Tauri v2 Rust wrapper for cross-platform desktop app

### Key Components

- **Frontend**: `src/App.tsx` is the main component managing state, socket connections, and UI
- **Backend**: `server/server.ts` handles WebSocket events, SQLite operations, and schedule execution
- **Types**: Shared interfaces in `src/types/todo.ts`, `src/types/config.ts`, and `src/types/commands.ts`
- **Hooks**: Custom hooks for socket communication (`useSocket.ts`) and keyboard shortcuts (`useKeyboardShortcuts.ts`)
- **Configuration**: 
  - **Client**: TOML-based config system with `src/utils/configManager.ts`
  - **Server**: Comprehensive server configuration system in `server/src/config/ServerConfigManager.ts`
- **Internationalization**: `src/i18n/` - Complete i18n system with English/Japanese support  
- **Menu System**: Custom header-integrated menu bar (`src/components/MenuBar.tsx`) replacing native Tauri menus
- **Command Palette**: VSCode-style command system (`src/components/CommandPalette.tsx`) with centralized command registry
- **Schedule System**: Complete schedule management with `src/components/ScheduleView.tsx` and server-side execution engine

## Development Commands

### Frontend (Tauri + React)
```bash
npm run dev          # Start Vite dev server (auto-selects available port starting from 1420)
npm run build        # Build React app and TypeScript
npm run preview      # Preview built app
npm run tauri dev    # Start Tauri development mode
npm run tauri build  # Build Tauri desktop app
npm test             # Run frontend tests with Vitest
npm run test:ui      # Run tests with Vitest UI interface
npm run lint         # Run ESLint on source files
npm run lint:fix     # Fix ESLint issues automatically
```

### Backend (Node.js Server)
```bash
cd server
npm run dev          # Start server with ts-node (development)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled server from dist/
npm test             # Run backend tests with Jest
npm run test:watch   # Run tests in watch mode
npm run test:parallel # Run tests in parallel (faster)

# Server configuration examples
YUTODO_SERVER_PORT=8080 npm run dev                    # Custom port
YUTODO_CONFIG_PATH=/path/to/config.toml npm run dev    # Custom config file
YUTODO_LOG_LEVEL=debug npm run dev                     # Debug logging
npm test server-config                                 # Test config system only
```

### Testing Commands
```bash
# Frontend testing (from root directory)
npm test                    # Run all frontend tests (346+ tests)
npm test src/test/TodoItem.test.tsx  # Run specific test file
npm test -- --run          # Run tests once (no watch mode)
npm run test:ui            # Launch Vitest UI for interactive testing

# Backend testing (from server directory)  
cd server
npm test                   # Run all backend tests (58 tests)
npm run test:watch         # Watch mode for development
npm run test:parallel      # Run tests in parallel (faster but may conflict)
npm test -- --testNamePattern="socket" # Run specific tests

# E2E testing with WebdriverIO (from root directory)
npm run test:e2e           # Run all E2E tests headlessly
npm run test:e2e:ui        # Run E2E tests with visible browser (HEADED=true)
npm run test:e2e:headed    # Alternative command for headed mode
npm run setup:e2e          # Install tauri-driver and WebDriver dependencies

# Docker-based E2E testing (from e2e directory)
cd e2e
npm run test:docker        # Run E2E tests in Docker environment (sequential)
npm run test:docker:parallel  # Run E2E tests in parallel (faster)
npm run test:docker:dev    # Start development environment for debugging
npm run test:docker:clean  # Clean up Docker containers and volumes
npm run docker:build       # Build E2E Docker image
npm run docker:shell       # Interactive Docker shell for debugging
```

## Development Workflow

1. Start the backend server: `cd server && npm run dev`
2. Start the Tauri app: `npm run tauri dev`
3. The app connects to the server at `http://localhost:3001` by default

**Note**: The frontend development server automatically selects an available port starting from 1420. If 1420 is in use, it will try 1421, 1422, etc.

## Release Management & CHANGELOG

### CHANGELOG Maintenance

The project uses a **hybrid approach** for CHANGELOG.md maintenance:

- **Claude Code assistance**: Claude evaluates each change and updates CHANGELOG.md when significant
- **Manual review encouraged**: Developers can request CHANGELOG updates for important changes
- **Conventional commits recommended**: Helps categorize changes but not strictly required
- **Release Please available**: Can be used for automated releases when needed

### Conventional Commit Format

All commits must follow conventional commit format:

```bash
# Features (minor version bump)
git commit -m "feat: add user authentication system"
git commit -m "feat(ui): implement dark mode toggle"

# Bug fixes (patch version bump)  
git commit -m "fix: resolve header positioning in detailed mode"
git commit -m "fix(server): handle socket disconnection properly"

# Breaking changes (major version bump)
git commit -m "feat!: redesign API interface"
git commit -m "fix!: change database schema"

# Other types (no version bump)
git commit -m "docs: update README installation steps"
git commit -m "test: add coverage for schedule execution"
git commit -m "refactor: simplify component structure"
git commit -m "style: fix linting warnings"
git commit -m "ci: update GitHub Actions workflow"
git commit -m "deps: update React to v18.3.2"
```

### Release Process

1. **Development**: Use conventional commits for all changes
2. **PR Merge**: When merged to `main`, Release Please analyzes commits
3. **Release PR**: Automatically creates PR with CHANGELOG.md updates and version bump
4. **Release**: Merging the Release Please PR triggers automated release with binaries

### CHANGELOG Update Guidelines

Claude Code evaluates each change and makes CHANGELOG.md update decisions at commit time based on the following criteria:

#### ✅ **Always Update Required**
- **feat**: New features and functionality additions
- **fix**: Important bug fixes with user impact
- **perf**: Performance improvements
- **breaking changes**: Any breaking changes (feat!, fix!)
- **UI/UX improvements**: Significant user experience enhancements

#### ❓ **Evaluate and Update if Significant**
- **refactor**: Large-scale code restructuring
- **style**: Important visual/UI changes
- **docs**: Major documentation additions
- **build/ci**: Development workflow changes affecting users

#### ❌ **Usually No Update Required**
- **test**: Test additions/modifications only
- **docs**: Minor documentation fixes
- **style**: Code formatting only
- **chore**: Configuration file minor changes
- **fix**: Typo fixes and trivial bug fixes

#### **Implementation Process**
- **At commit time**: Claude evaluates change importance and updates CHANGELOG.md accordingly
- **Decision transparency**: Clear reasoning provided for update/no-update decisions
- **Manual requests**: Developers can explicitly request CHANGELOG updates for any change
- **Periodic review**: Regular checks to ensure no important changes are missed

## Testing Architecture

### Frontend Testing (Vitest + React Testing Library)
- **Framework**: Vitest with JSDOM environment for React component testing
- **Testing Library**: @testing-library/react for component interaction testing
- **Mock Strategy**: Comprehensive mocking of external dependencies (Tauri plugins, DnD Kit, ReactMarkdown)
- **Setup**: Global test setup in `src/test/setup.ts` with jest-dom matchers and window mocks
- **Coverage**: 346+ tests across 19 test files covering all major components and hooks

### Backend Testing (Jest + Socket.IO Testing)
- **Framework**: Jest with ts-jest preset for TypeScript support
- **Environment**: Node.js test environment with SQLite in-memory database
- **Socket Testing**: Socket.IO client/server integration tests
- **Configuration**: Tests run in band (sequential) to prevent database conflicts
- **Setup**: Test database isolation and cleanup between tests
- **Coverage**: 58 tests across 5 test files

### E2E Testing (WebdriverIO + Tauri)
- **Framework**: WebdriverIO with Tauri WebDriver support
- **Environment**: Real Tauri application with backend server
- **Test Coverage**: App launch, todo operations, keyboard shortcuts, window operations
- **CI Support**: GitHub Actions with virtual display (Xvfb) for Linux
- **Helper Functions**: Reusable test utilities in `e2e/helpers/tauri-helpers.js`
- **Requirements**: `tauri-driver`, platform-specific WebDriver (webkit2gtk-driver for Linux, Edge WebDriver for Windows)

### Docker E2E Testing (Containerized Environment)
- **Framework**: Docker-based E2E testing with full environment isolation
- **Architecture**: Complete containerized server + E2E test runner setup
- **Orchestration**: Docker Compose with `docker-compose.e2e.yml`
- **Environment**: 
  - `yutodo-server-e2e`: Isolated server instance with test configuration
  - `yutodo-e2e`: Test runner container with Xvfb, tauri-driver, and WebDriver
  - `yutodo-e2e-dev`: Development container for debugging
- **Features**:
  - **Parallel Execution**: Configurable parallel test runs with `E2E_PARALLEL=true`
  - **Health Checks**: Server readiness verification before test execution
  - **Artifact Collection**: Automated test reports, screenshots, and logs collection
  - **Debug Support**: Interactive debugging shell and volume export for failed tests
- **Scripts**: 
  - `docker-e2e-setup.sh`: Environment setup and dependency installation
  - `docker-e2e-run.sh`: Test execution with comprehensive logging and cleanup
  - `health-check.sh`: Container health verification
- **CI Integration**: GitHub Actions job for Docker-based E2E testing with artifact upload

### Test Files Structure
```
src/test/
├── setup.ts                    # Global test configuration and mocks
├── App.test.tsx                # Main application integration tests
├── TodoItem.test.tsx           # TodoItem component behavior tests
├── useSocket.test.ts           # WebSocket functionality tests
├── useKeyboardShortcuts.test.ts # Keyboard shortcut system tests
├── configManager.test.ts       # Configuration management tests
├── utils.test.ts               # Utility function tests
├── AddTodoForm.test.tsx        # Form component tests
├── ConnectionStatus.test.tsx   # Connection status tests
├── DarkMode.test.tsx           # Dark mode functionality tests
├── DeleteConfirmDialog.test.tsx # Delete confirmation tests
├── MenuBar.test.tsx            # Menu bar functionality tests
├── ScheduleModal.test.tsx      # Schedule modal tests
├── ScheduleView.test.tsx       # Schedule view tests
├── SearchBar.test.tsx          # Search functionality tests
├── ShortcutHelp.test.tsx       # Shortcut help modal tests
├── TodoFilter.test.tsx         # Todo filtering tests
├── HeaderLayout.test.tsx       # Header layout behavior tests
├── priorityUtils.test.ts       # Priority conversion utility tests
└── CommandPalette.test.tsx     # Command palette functionality tests

server/__tests__/
├── setup.js                    # Backend test setup and teardown
├── server.test.ts              # Main server integration tests
├── socket.test.ts              # WebSocket event handling tests
├── database-crud.test.ts       # Database CRUD operation tests
├── database-migration.test.ts  # Database migration tests
└── schedule-executor.test.ts   # Schedule execution engine tests

e2e/
├── helpers/
│   └── tauri-helpers.js        # Tauri app launch/control utilities
├── tests/
│   ├── app-launch.spec.ts      # App initialization and UI tests
│   ├── todo-operations.spec.ts # Todo CRUD operation tests
│   ├── keyboard-shortcuts.spec.ts # Keyboard shortcut tests
│   └── window-operations.spec.ts # Window management tests
├── scripts/                    # Docker E2E automation scripts
│   ├── docker-e2e-setup.sh    # Environment setup and dependency installation
│   ├── docker-e2e-run.sh      # Test execution with logging and cleanup
│   └── health-check.sh         # Container health verification
├── Dockerfile                  # E2E testing container image
├── screenshots/                # Test failure screenshots
└── test-output/                # Docker test artifacts and reports
```

### Testing Patterns
- **Mock Management**: External dependencies (Tauri, DnD Kit) mocked with factory functions
- **Error Testing**: Console.error suppression for intentional error test scenarios
- **Event Simulation**: Custom event simulation for keyboard shortcuts and DOM interactions
- **Async Testing**: Proper handling of Socket.IO events and async operations with waitFor
- **Type Safety**: Full TypeScript support in all test files with proper typing
- **Cross-platform**: OS detection and platform-specific behavior testing
- **React Testing**: Proper `act()` wrapping for state updates and filtered DatePicker prop mocking
- **Priority Testing**: Comprehensive testing of priority type migration and conversion utilities
- **Backward Compatibility**: Tests ensure both legacy numeric and new string priority formats work

### Running Tests
- **Frontend**: All 346+ tests pass with clean output, no warnings
- **Backend**: Comprehensive coverage of database operations and WebSocket events  
- **E2E**: WebDriver-based GUI tests for Tauri app with 4 test suites
- **CI/CD Ready**: Tests designed for automated testing environments with Xvfb support
- **Fast Execution**: Optimized test performance with proper mocking and cleanup
- **100% Pass Rate**: Complete test coverage achieved with comprehensive component testing
- **Warning-Free**: All React DatePicker DOM prop warnings and act() issues resolved

### E2E Testing Setup
```bash
# Install tauri-driver
cargo install tauri-driver --locked

# Linux: Install WebDriver
sudo apt install webkit2gtk-driver

# Windows: Download Edge WebDriver matching your Edge version
# https://developer.microsoft.com/microsoft-edge/tools/webdriver/

# Run E2E tests
npm run test:e2e
```

## Architecture Patterns

### Command Palette System
- VSCode-style command palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
- Centralized command registry with type-safe command definitions (`src/types/commands.ts`)
- Dynamic command filtering with fuzzy search and scoring algorithm
- Context-aware command visibility and enablement based on application state
- Internationalization support for all command titles and descriptions
- Categories: file, view, task, schedule, search, settings, navigation

### Centralized Keyboard Shortcut Management
- Single source of truth in `src/utils/keyboardShortcuts.ts` for all keyboard shortcuts
- OS-aware shortcut display with automatic Ctrl/Cmd detection (`src/utils/osDetection.ts`)
- Dynamic shortcut reference system eliminates inconsistencies between displayed and actual shortcuts
- Type-safe shortcut definitions with handler name mapping for automatic synchronization
- Unified shortcut display across command palette, help system, and UI components

### Real-time State Management
- `useSocket.ts` manages WebSocket connection and synchronizes todos across all clients
- Socket.IO events: `todo:add`, `todo:update`, `todo:delete`, `todo:toggle`, `todos:reorder`
- Schedule events: `schedule:add`, `schedule:update`, `schedule:delete`, `schedule:toggle`
- State flows from server → Socket.IO → useSocket → App.tsx → UI components

### Configuration System

#### Client-Side Configuration
- **Architecture**: File-based VS Code-style configuration with TOML format
- **Location**: `src/config/SettingsManager.ts` handles settings and keybindings files
- **OS-Standard Paths**: Automatically uses platform-appropriate config directories:
  - **Windows**: `%APPDATA%/YuToDo/` (settings.toml, keybindings.toml)
  - **macOS**: `~/Library/Application Support/YuToDo/` (settings.toml, keybindings.toml)
  - **Linux**: `~/.config/yutodo/` (settings.toml, keybindings.toml)
- **Auto-Migration**: Automatically migrates from old paths (e.g., `~/.local/share/yutotnh/YuToDo/` on Linux)

#### Server-Side Configuration System
- **Architecture**: Comprehensive TOML-based server configuration with Zod schema validation
- **Location**: `server/src/config/ServerConfigManager.ts` and `server/src/types/config.ts`
- **OS-Standard Paths**: Automatically uses platform-appropriate directories:
  - **Windows**: `%APPDATA%/YuToDo Server/server-config.toml`
  - **macOS**: `~/Library/Application Support/YuToDo Server/server-config.toml`
  - **Linux**: `~/.config/yutodo-server/server-config.toml`

#### Environment Variable Support
**Configuration Path Resolution** (priority order):
```bash
# 1. Constructor argument (highest priority)
new ServerConfigManager('/custom/path/config.toml')

# 2. Full config file path
YUTODO_CONFIG_PATH=/path/to/server-config.toml

# 3. Config directory (filename fixed as server-config.toml)
YUTODO_CONFIG_DIR=/path/to/config/directory

# 4. OS standard path (default)
```

**Configuration Overrides**:
```bash
YUTODO_SERVER_PORT=8080          # Server port
YUTODO_SERVER_HOST=0.0.0.0       # Server host
YUTODO_DB_PATH=/custom/todos.db   # Database file path
YUTODO_DB_CACHE_SIZE=2000        # SQLite cache size
YUTODO_LOG_LEVEL=debug           # Logging level
YUTODO_SCHEDULE_INTERVAL=120     # Schedule check interval (seconds)
YUTODO_ENABLE_DEBUG=true         # Debug mode
```

#### Server Configuration Categories
- **Server Settings**: Port, host, connection limits, timeouts
- **Database Configuration**: SQLite pragmas (cache_size, journal_mode, synchronous), backup settings
- **Schedule Engine**: Check intervals, timezone, concurrent execution limits
- **Logging & Monitoring**: Log levels, output destinations, file rotation
- **Security & CORS**: Allowed origins, rate limiting, request size limits
- **Performance**: Memory limits, compression, keep-alive settings
- **Development**: Debug mode, hot reload, error simulation

#### Configuration Features
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Error Handling**: Graceful fallbacks when config files are invalid or missing
- **Hot Configuration**: Live config updates without server restart
- **Import/Export**: TOML format configuration export and import
- **Testing**: Comprehensive tests covering all functionality

### Theme and UI State
- Dark/light/auto theme detection with system preference monitoring
- Slim mode for compact desktop experience
- Auto-hiding header triggered by mouse position
- Custom CSS injection for user personalization

### Component Architecture
- `App.tsx` orchestrates global state, settings, and real-time connections
- Custom hooks abstract complex logic (WebSocket, keyboard shortcuts with OS detection)
- Settings panel supports live configuration export/import/reset
- All modals (Settings, ShortcutHelp, DeleteConfirmDialog, ScheduleModal, CommandPalette) support Esc key and outside-click closing
- Delete confirmation dialogs with settings-controlled behavior
- Overlay-based UI components (header auto-hide, bottom Add Todo form) that don't displace content
- **Menu System**: Custom header-integrated MenuBar component with dropdown menus that prevent header auto-hide during interaction

### Schedule System Architecture
- **Frontend Components**: `ScheduleView.tsx` and `ScheduleModal.tsx` for UI
- **Server-Side Engine**: `ScheduleExecutor` class checks and executes schedules at configured intervals
- **Schedule Types**: once, daily, weekly, monthly, custom
- **Active/Inactive Categorization**: Automatic categorization based on completion status and next execution
- **Bulk Operations**: Delete all inactive schedules with confirmation dialog
- **Real-time Sync**: Schedule changes synchronized across all clients via Socket.IO

### Window Drag Pattern
- **Reusable Hook**: `useWindowDrag` hook provides consistent window dragging functionality across all modal components
- **Automatic Element Filtering**: Automatically ignores interactive elements (buttons, inputs, textareas, selects, links) to prevent drag conflicts
- **Tauri Environment Detection**: Only enables dragging in Tauri desktop environment, gracefully handles browser fallback
- **Implementation Pattern**: Apply `onMouseDown={handleHeaderDrag}` to modal headers for consistent drag behavior
- **Usage Example**:
  ```tsx
  import { useWindowDrag } from '../hooks/useWindowDrag';
  
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();
  
  return (
    <div className="modal-header" onMouseDown={handleHeaderDrag}>
      <h2>Modal Title</h2>
      <button>Close</button>  {/* Automatically ignored */}
    </div>
  );
  ```
- **Applied Components**: CommandPalette, Settings, ScheduleModal, ShortcutHelp, DeleteConfirmDialog
- **Configuration Options**: 
  - `ignoreElements`: Array of CSS selectors to ignore (default: button, input, textarea, select, a)
  - `logErrors`: Whether to log errors (default: true)
- **Error Handling**: Graceful fallback when Tauri APIs are unavailable with optional error logging

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

- **VSCode-style command palette**: Quick access to all application commands with Ctrl+Shift+P (Cmd+Shift+P on macOS)
- **Centralized keyboard shortcut management**: Single source of truth for all shortcuts with automatic synchronization between display and functionality
- **Real-time sync**: Multiple clients stay synchronized via Socket.IO
- **Comprehensive keyboard navigation**: Extensive shortcuts with OS-aware labels (Ctrl/Cmd), VS Code-style sequences (Ctrl+K, Ctrl+S for help), Microsoft To Do-style Ctrl+D for completion toggle
- **Filtering**: Filter todos by status, priority, and overdue items
- **Import/Export**: Native file dialogs for TOML export/import, unified format with standard `[[tasks]]` table syntax
- **Custom styling**: Support for custom CSS injection
- **Configuration**: TOML settings file with export/import/reset functionality
- **Theme system**: Auto/light/dark mode with system preference detection
- **Slim mode**: Compact UI mode for desktop with priority, date, and description display
- **Priority system**: String-based priorities ('high', 'medium', 'low') with legacy numeric support
- **Scheduling**: Comprehensive schedule system with execution engine and active/inactive categorization
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
- **Schedule Management**: Active/inactive schedule categorization with bulk delete operations

## Database Architecture

### Database Location & Storage
- **OS-Standard Paths**: Database stored in OS-appropriate server data directories
  - **Linux**: `~/.local/share/yutodo-server/todos.db`
  - **Windows**: `%APPDATA%/YuToDo Server/Data/todos.db`
  - **macOS**: `~/Library/Application Support/YuToDo Server/Data/todos.db`
- **Automatic Migration**: Server detects old database locations and migrates data to new location
  - From git repository (`./todos.db`)
  - From old client directories (e.g., `~/.local/share/YuToDo/todos.db`)
- **Directory Creation**: Automatically creates data directory structure if not present
- **Git Exclusion**: Database files excluded from version control via `.gitignore`
- **Configuration Control**: Database location can be overridden via server configuration

### Database Schema

SQLite table `todos`:
- `id` (TEXT PRIMARY KEY)
- `title` (TEXT NOT NULL)
- `description` (TEXT)
- `completed` (BOOLEAN)
- `priority` (INTEGER, 0-2) - Legacy numeric format, converted to strings in application
- `scheduledFor` (DATETIME)
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)
- `order_index` (INTEGER) - Custom ordering for drag & drop

SQLite table `schedules`:
- `id` (TEXT PRIMARY KEY)
- `title` (TEXT NOT NULL)
- `description` (TEXT)
- `type` (TEXT) - once, daily, weekly, monthly, custom
- `startDate` (TEXT)
- `endDate` (TEXT)
- `time` (TEXT)
- `priority` (TEXT) - high, medium, low
- `excludeWeekends` (BOOLEAN)
- `weeklyConfig` (TEXT) - JSON string
- `monthlyConfig` (TEXT) - JSON string
- `customConfig` (TEXT) - JSON string
- `isActive` (BOOLEAN)
- `lastExecuted` (TEXT)
- `nextExecution` (TEXT)
- `createdAt` (TEXT)
- `updatedAt` (TEXT)

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
- **Consistent UX**: All modals (Settings, ShortcutHelp, DeleteConfirmDialog, ScheduleModal, CommandPalette) follow same interaction patterns
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
- **App header height**: Use `event.clientY <= 44` for app header detection (28px height + 16px padding)
- **Header z-index**: Set to `z-index: 10000` to ensure header is always accessible for window dragging even when modals are open
- **Modal overlay pointer-events**: Use `pointer-events: none` on overlay and `pointer-events: auto` on modal content to allow window dragging

### State Management
- **Settings migration**: Check for localStorage key changes (`todoAppSettings` → `yutodoAppSettings`)
- **Modal state tracking**: Include all modal states in `isModalOpen` calculation for keyboard shortcut system
- **Real-time updates**: Language and theme changes apply immediately without restart
- **Priority conversion**: Automatic conversion between legacy numeric (0,1,2) and string ('low','medium','high') formats

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

### Schedule System
- **Schedule Execution Engine**: Server-side engine checks schedules every interval (configurable)
- **Active/Inactive Categorization**: Automatic categorization based on completion status and next execution
- **Bulk Operations**: Delete all inactive schedules with confirmation dialog
- **Configuration**: Server-side schedule check interval configurable via TOML
- **Completion Status**: Completed schedules show "Completed" status and move to inactive section
- **Visual Separation**: Clear distinction between active and inactive schedules with collapsible sections

### Cross-platform Considerations
- **Mouse tracking in Tauri**: Implement multiple event listeners (document, body, window) for reliable mouse leave detection
- **WSLg fallbacks**: Always provide clipboard alternatives for file operations and URL opening
- **Element selection**: Use CSS `user-select: none` globally with specific exceptions for text inputs
- **OS detection**: Platform-aware keyboard shortcut labels (Ctrl vs Cmd) with automatic detection

## Testing Best Practices

### Mandatory Testing Policy
**IMPORTANT**: Always write or update tests when adding features or making modifications. This is a strict requirement for this codebase.

### CI/CD Validation Requirements
**CRITICAL**: Before committing any changes, always run the complete CI/CD validation suite to prevent GitHub Actions failures:

```bash
# Frontend validation (run from root directory)
npm run lint          # ESLint check - must pass with no errors
npm run build         # TypeScript compilation and Vite build - must succeed
npm test -- --run     # All frontend tests - must pass (346+ tests)

# Backend validation (run from server directory)  
cd server
npm run build         # TypeScript compilation - must succeed
npm test              # All backend tests - must pass (58 tests)
```

**Required checks before every commit:**
1. **Lint Check**: `npm run lint` must pass without errors
2. **Type Check**: `npm run build` must complete successfully
3. **Frontend Tests**: All 346+ tests must pass
4. **Backend Tests**: All 58 tests must pass  
5. **Build Verification**: Vite build must succeed

### When Adding New Features
1. **Component Tests**: Create comprehensive tests for new UI components in `src/test/ComponentName.test.tsx`
2. **Hook Tests**: Create tests for custom hooks in `src/test/useHookName.test.ts`
3. **Utility Tests**: Add tests for new utility functions in appropriate test files
4. **Integration Tests**: Create feature integration tests when needed
5. **Mock External Dependencies**: Use factory functions for mocking Tauri plugins, external libraries
6. **Error Suppression**: For intentional error testing, use `vi.spyOn(console, 'error').mockImplementation(() => {})` 
7. **Event Simulation**: Use custom event simulation for keyboard shortcuts and complex DOM interactions
8. **Async Testing**: Always use `waitFor` for async operations, never use arbitrary timeouts

### When Modifying Existing Features
1. **Update Existing Tests**: Modify test cases to match changes
2. **Add New Test Cases**: Test newly added behavior
3. **Edge Case Testing**: Add tests to prevent regression, especially for bug fixes
4. **Maintain 100% Pass Rate**: Ensure all tests continue to pass

### Test File Naming and Structure
- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Integration tests: `featureName.integration.test.ts`

### Test Quality Standards
- **100% Pass Rate Requirement**: All tests must pass before any commit or deployment
- **Comprehensive Coverage**: Aim for complete test coverage of new functionality
- **No Breaking Changes**: Never commit code that breaks existing tests
- **Clean Test Output**: Address any stderr warnings when possible

### Mock Strategies
- **Tauri Plugins**: Mock in beforeEach with controlled return values
- **External Libraries**: Use vi.mock with factory functions to avoid hoisting issues
- **Socket.IO**: Mock entire socket instance with event simulation capabilities
- **DOM APIs**: Mock window.alert, navigator.clipboard, etc. in test setup

### Running Specific Tests
```bash
# Run single test file
npm test src/test/TodoItem.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="keyboard"

# Run tests in UI mode for debugging
npm run test:ui

# Run tests with coverage
npm test -- --coverage
```

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
- **App Header Click Detection**: Adjusted header height detection to 44px (28px header + 16px padding) for custom app header
- **Header Accessibility**: Increased header z-index to 10000 to ensure window dragging works even with modals open
- **Modal Window Dragging**: Fixed pointer-events on command palette overlay to enable window dragging with modal open
- **Header Window Dragging**: Fixed event propagation in MenuBar to allow window dragging through header/menu bar
- **Schedule Completion Display**: Fixed schedules to show "Completed" status and move to inactive section when finished
- **Schedule Modal Layout**: Improved UI by grouping daily schedule time and exclude weekends options together
- **Bulk Delete Schedules**: Added command to delete all inactive schedules with confirmation dialog
- **Test Coverage**: Achieved 100% E2E test pass rate with WebdriverIO
- **Server Configuration**: Added comprehensive server-side configuration management system
- **Directory Structure Refactoring**: 
  - **Client settings** moved from data to config directories following XDG standards
  - **Server configuration** separated into dedicated server directories
  - **Database** moved to server-specific data directories
  - **Automatic migration** from old paths to new locations
  - **Linux lowercase naming**: `yutodo` for client, `yutodo-server` for server

## Logging Best Practices

### Logging Philosophy
This codebase follows production-ready logging practices with environment-based control and proper log levels. All logging is handled through a centralized logger utility that ensures clean console output in production.

### Logger Utility (`src/utils/logger.ts`)
```typescript
import logger from '../utils/logger';

// Available log levels:
logger.debug('Development-only detailed information');    // Development only
logger.info('Important application flow information');     // All environments  
logger.warn('Potential issues that don't break functionality'); // All environments
logger.error('Errors and exceptions');                    // All environments
logger.network('Socket.IO and API debugging');           // Development only
logger.ui('Component state and interaction debugging');   // Development only
```

### Log Level Guidelines

#### ✅ **Use logger.debug() for:**
- Detailed debugging information
- Component state changes
- Configuration loading details
- File operation details
- Development workflow information

#### ✅ **Use logger.info() for:**
- Important application milestones
- Successful reconnections
- Major state transitions
- User-facing operations completion

#### ✅ **Use logger.warn() for:**
- Fallback method usage (Tauri → browser)
- Non-critical errors with recovery
- Deprecated feature usage
- Performance concerns

#### ✅ **Use logger.error() for:**
- Connection failures
- File operation failures  
- API errors
- Unexpected exceptions
- Critical system errors

#### ✅ **Use logger.network() for:**
- Socket.IO connection events
- Data synchronization logging
- API request/response details
- Reconnection attempts

#### ✅ **Use logger.ui() for:**
- Component render cycles
- User interaction debugging
- Modal state changes
- Form validation details

### Log Output Control

**Development Environment** (`npm run dev`):
- All log levels are displayed
- Detailed debugging information available
- Console output includes prefixed log levels `[DEBUG]`, `[INFO]`, etc.

**Production Environment** (`npm run build`):
- Only `logger.info()`, `logger.warn()`, and `logger.error()` are displayed
- Debug and development logs are suppressed
- Clean console output for end users

### Implementation Rules

#### ❌ **NEVER use console.log() directly**
```typescript
// Wrong - bypasses environment control
console.log('This will always appear');

// Correct - respects environment settings
logger.debug('This appears only in development');
```

#### ❌ **NEVER log sensitive information**
```typescript
// Wrong - security risk
logger.debug('User password:', password);

// Correct - safe information only
logger.debug('User authentication attempt');
```

#### ❌ **NEVER use excessive logging in loops**
```typescript
// Wrong - performance impact
todos.forEach(todo => {
  logger.debug('Processing todo:', todo.id);
});

// Correct - summary logging
logger.debug('Processing todos batch:', todos.length, 'items');
```

### Cross-Platform Considerations

- **WSLg Environment**: Important warnings for URL handling limitations
- **Tauri vs Browser**: Environment detection with appropriate fallbacks
- **Error Context**: Include enough context for debugging across different platforms

### Maintenance Guidelines

1. **Regular Cleanup**: Remove temporary debug logs before committing
2. **Log Level Review**: Ensure appropriate log levels are used
3. **Performance Impact**: Monitor log volume in development
4. **User Experience**: Keep production logs minimal and user-friendly

### Testing Integration

- **Test Isolation**: Logger is mocked in tests to avoid console pollution
- **Error Testing**: Use logger.error() for expected error scenarios
- **Debug Testing**: Test logs are captured for verification when needed

This logging strategy ensures clean production deployments while maintaining powerful debugging capabilities during development.

## CI/CD & Automation

### GitHub Actions Workflows

The project includes comprehensive CI/CD automation:

#### **ci.yml** - Continuous Integration
- **Triggers**: Push/PR to `main` and `develop` branches
- **Jobs**:
  - **Lint & Type Check**: Frontend and backend TypeScript validation
  - **Frontend Tests**: Vitest with coverage reporting to Codecov
  - **Backend Tests**: Jest with coverage reporting to Codecov  
  - **Tauri Build Test**: Multi-platform build verification (Windows/macOS/Linux)

#### **e2e-tests.yml** - GUI End-to-End Tests
- **Triggers**: Push/PR to `main` and `develop` branches
- **Jobs**:
  - **E2E Tests**: WebdriverIO tests on Windows/macOS/Linux
  - **Virtual Display**: Xvfb for headless Linux GUI testing
  - **Artifacts**: Screenshots and videos on test failures
  - **Test Report**: Consolidated results across all platforms

#### **release-please.yml** - Automated Releases
- **Triggers**: Push to `main` branch
- **Process**:
  1. Analyzes conventional commits since last release
  2. Creates Release PR with CHANGELOG.md updates and version bump
  3. When Release PR is merged, builds and publishes GitHub release with binaries
- **Platforms**: Builds for Windows, macOS, and Linux simultaneously

#### **security.yml** - Security Scanning
- **Triggers**: Push/PR to `main`, weekly scheduled runs
- **Scans**:
  - **NPM Audit**: Frontend and backend dependency vulnerability checks
  - **Cargo Audit**: Rust dependency security scanning
  - **CodeQL**: Static code analysis for JavaScript and Rust
- **Reporting**: Results integrated with GitHub Security tab

#### **validate-commits.yml** - Commit Message Validation
- **Triggers**: Pull requests to `main`
- **Purpose**: Ensures conventional commit format for proper CHANGELOG generation
- **Blocks**: PRs with improperly formatted commit messages

### Dependabot Configuration

Automated dependency updates via `.github/dependabot.yml`:

- **Frontend Dependencies**: Weekly updates (Monday 9:00 AM)
- **Backend Dependencies**: Weekly updates (Monday 9:30 AM)  
- **Rust Dependencies**: Weekly updates (Tuesday 9:00 AM)
- **GitHub Actions**: Weekly updates (Wednesday 9:00 AM)
- **Grouping**: Related packages updated together (e.g., React ecosystem, Tauri plugins)
- **Security**: Automatic security patches as they become available

### Development Integration

#### Required for All Development:
- **Conventional Commits**: Recommended for better organization and optional automation
- **Test Coverage**: All new code must include comprehensive tests
- **Type Safety**: TypeScript compilation must pass without errors
- **Security Compliance**: No vulnerabilities in dependencies
- **CHANGELOG Updates**: Significant changes should include CHANGELOG.md updates

#### PR Requirements:
- All CI checks must pass (build, test, lint, security)
- Conventional commit format validation
- Code review approval
- Up-to-date with target branch

#### Release Process:
1. **Development** → Use conventional commits
2. **PR Merge** → Release Please analyzes changes
3. **Release PR** → Automatic CHANGELOG/version updates  
4. **Release Merge** → Automated build and publish to GitHub Releases

### Monitoring & Maintenance

- **Security Alerts**: GitHub security advisories with automatic Dependabot fixes
- **Build Status**: All workflows report to GitHub checks API
- **Coverage Tracking**: Codecov integration for test coverage trends
- **Dependency Health**: Automated updates with compatibility testing

This automation ensures consistent code quality, security compliance, and reliable releases without manual intervention.

## Server Configuration Examples

### Development Environment
```bash
# Local development with debug logging
cd server
YUTODO_LOG_LEVEL=debug \
YUTODO_ENABLE_DEBUG=true \
npm run dev
```

### Production Environment
```bash
# Production deployment with custom config
YUTODO_CONFIG_PATH=/etc/yutodo/production.toml \
YUTODO_SERVER_PORT=80 \
YUTODO_LOG_LEVEL=warn \
npm start
```

### Docker Deployment
```bash
# Docker container with volume-mounted config
docker run -d \
  -e YUTODO_CONFIG_PATH=/config/server-config.toml \
  -e YUTODO_SERVER_PORT=3001 \
  -v /host/config:/config \
  -p 3001:3001 \
  yutodo-server
```

### Testing Environment
```bash
# Isolated test environment
YUTODO_DB_PATH=/tmp/test-todos.db \
YUTODO_SERVER_PORT=9999 \
YUTODO_CONFIG_DIR=/tmp/test-config \
npm test
```

### Example Server Configuration File
```toml
# /etc/yutodo/production.toml

[server]
port = 3001
host = "0.0.0.0"
max_connections = 1000
request_timeout = 30000

[database]
location = "/var/lib/yutodo/todos.db"
cache_size = 5000
journal_mode = "WAL"
backup_enabled = true
backup_interval = 6  # hours

[schedules]
check_interval = 30  # seconds
timezone = "UTC"
max_concurrent_executions = 10

[logging]
level = "info"
output = "both"
file_path = "/var/log/yutodo/server.log"
max_file_size = 50  # MB
max_files = 10

[security]
cors_origins = ["https://yutodo.example.com"]
enable_rate_limiting = true
rate_limit_max_requests = 1000
max_request_size = "5mb"

[performance]
memory_limit = 1024  # MB
enable_compression = true
enable_keep_alive = true
```

### CORS Configuration for Development

The server now supports flexible CORS configuration with wildcard support:

#### Option 1: Wildcard (Recommended for Development)
```toml
[security]
# Allow all origins - useful for development
cors_origins = ["*"]
```

#### Option 2: Automatic Port Range Detection
The server automatically allows `localhost:1400-1500` range, which covers all possible Vite development ports.

#### Option 3: Explicit Origins
```toml
[security]
# Explicitly list allowed origins
cors_origins = [
  "http://localhost:1420",
  "http://localhost:1421", 
  "http://localhost:1422",
  # ... add more as needed
]
```

**Technical Implementation**: The server uses Socket.IO's dynamic origin validation to support wildcards properly, overcoming the limitation where `["*"]` wouldn't work with Socket.IO's default configuration.

## Docker Containerization

The YuToDo Server can be run in Docker containers for improved portability, scalability, and deployment consistency. The containerization preserves the existing architecture where the Tauri desktop app connects to the server via WebSocket.

### Docker Architecture

- **Server Container**: Node.js Express + Socket.IO server with SQLite database
- **Client Application**: Native Tauri desktop app (runs on host, connects to containerized server)  
- **Communication**: WebSocket (Socket.IO) connection between client and server
- **Data Persistence**: SQLite database stored in Docker volumes

### Quick Start

#### Development Environment
```bash
# Start containerized server for development
docker-compose up -d

# Start Tauri desktop app (connects to containerized server)
npm run tauri dev
```

#### Production Environment
```bash
# Start production server container
docker-compose -f docker-compose.prod.yml up -d

# Desktop app connects to production server
npm run tauri build  # Build desktop app
```

### Container Configuration

#### Development (docker-compose.yml)
- **Purpose**: Local development with debug logging and flexible CORS
- **Environment**: `NODE_ENV=development`, debug mode enabled
- **CORS**: Wildcard allowed (`*`) for development flexibility
- **Volumes**: Named volumes for data persistence
- **Port**: 3001 (mapped to host)

#### Production (docker-compose.prod.yml)  
- **Purpose**: Production deployment with security and performance optimization
- **Environment**: `NODE_ENV=production`, optimized logging
- **CORS**: Explicit origins only (security)
- **Security**: Resource limits, security options, read-only filesystem where possible
- **Volumes**: Bind mounts for better backup control
- **Health Checks**: Enhanced monitoring for production reliability

### Environment Variables

The containerized server supports comprehensive environment variable configuration:

#### **Core Server Settings**
```bash
YUTODO_SERVER_HOST=0.0.0.0          # Bind to all interfaces (required for containers)
YUTODO_SERVER_PORT=3001             # Server port
YUTODO_DB_PATH=/data/todos.db        # Database location in container
YUTODO_CONFIG_DIR=/config            # Configuration directory
```

#### **Security & CORS**
```bash
YUTODO_CORS_ORIGINS="*"                                    # Development wildcard
YUTODO_CORS_ORIGINS="http://localhost:1420,https://app.example.com"  # Production origins
```

#### **Performance & Debugging**
```bash
YUTODO_LOG_LEVEL=info               # Logging level (debug, info, warn, error)
YUTODO_DB_CACHE_SIZE=5000           # SQLite cache size for performance
YUTODO_SCHEDULE_INTERVAL=30         # Schedule check interval (seconds)
YUTODO_ENABLE_DEBUG=false           # Debug mode toggle
```

### Docker Commands

#### Building and Running
```bash
# Development environment
docker-compose up -d                # Start in background
docker-compose logs yutodo-server   # View logs  
docker-compose down                 # Stop and remove containers

# Production environment
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml down

# Manual container build
cd server && docker build -t yutodo-server .
docker run -d -p 3001:3001 -v yutodo-data:/data yutodo-server
```

#### Data Management
```bash
# View volumes
docker volume ls | grep yutodo

# Backup database
docker cp yutodo-server-dev:/data/todos.db ./backup/

# View container config
docker exec yutodo-server-dev cat /config/server-config.toml
```

#### Monitoring and Debugging
```bash
# Container health and status
docker ps | grep yutodo
docker exec yutodo-server-dev node -e "console.log('Health check')"

# Live logs
docker-compose logs -f yutodo-server

# Container shell access
docker exec -it yutodo-server-dev sh
```

### Production Deployment

#### Environment Setup
```bash
# Create production environment file
cat > .env.prod << 'EOF'
YUTODO_HOST_PORT=3001
YUTODO_LOG_LEVEL=info
YUTODO_CORS_ORIGINS=https://your-domain.com
YUTODO_DATA_DIR=/opt/yutodo/data
YUTODO_LOGS_DIR=/opt/yutodo/logs
YUTODO_CONFIG_PATH=/opt/yutodo/config/production.toml
EOF

# Start with environment file
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

#### Backup Strategy
```bash
# Automated database backup
docker exec yutodo-server-prod cp /data/todos.db /data/backup/todos-$(date +%Y%m%d).db

# Volume backup
docker run --rm -v yutodo-prod-data:/data -v $(pwd)/backup:/backup alpine \
  tar czf /backup/yutodo-data-$(date +%Y%m%d).tar.gz -C /data .
```

### Integration with Existing Workflow

#### Development Workflow
1. **Start containerized server**: `docker-compose up -d`
2. **Develop Tauri app**: `npm run tauri dev` (connects to container)
3. **Server logs**: Available via `docker-compose logs yutodo-server`
4. **Configuration**: Server settings via environment variables or volume-mounted config

#### Testing with Containers
```bash
# Backend tests (in container)
docker-compose exec yutodo-server npm test

# Frontend tests (host, connecting to container)
npm test

# E2E tests (with containerized server)
docker-compose up -d && npm run test:e2e
```

### Container Benefits

- **Environment Consistency**: Identical server environment across development, testing, and production
- **Easy Deployment**: Single container image works across different platforms
- **Resource Isolation**: Container resource limits prevent resource conflicts
- **Backup Simplicity**: Database and configuration stored in managed volumes
- **Scalability Ready**: Foundation for future horizontal scaling (with external database)
- **Security**: Container isolation and configurable security policies

### Limitations and Considerations

- **SQLite Constraint**: Current architecture supports single instance only (no horizontal scaling)
- **Database Migration**: Moving from host SQLite to container requires data migration
- **Network Configuration**: Ensure client can reach containerized server (especially in complex network setups)
- **Volume Management**: Database persistence requires proper volume backup strategy

### Migration from Host to Container

```bash
# 1. Stop existing host server
cd server && npm run build  # Ensure latest build

# 2. Backup existing database
cp ~/.local/share/yutodo-server/todos.db ./backup/

# 3. Start containerized server
docker-compose up -d

# 4. Copy database to container (if needed)
docker cp ./backup/todos.db yutodo-server-dev:/data/todos.db

# 5. Verify client connection
npm run tauri dev  # Should connect to containerized server
```

## CI/CD Integration & GitHub Container Registry

The project includes comprehensive CI/CD automation for Docker image building and publishing to GitHub Container Registry (GHCR):

### GitHub Actions Workflows

#### **CI Pipeline** (`ci.yml`)
- **Docker Build Test**: Validates Dockerfile and docker-compose configurations
- **Container Health Check**: Tests server startup and basic functionality
- **Multi-environment Testing**: Tests both development and production Docker configurations

#### **Docker Publish** (`docker-publish.yml`)
- **Automated Publishing**: Publishes to GitHub Container Registry on releases and main branch pushes
- **Multi-platform Builds**: Supports AMD64 and ARM64 architectures
- **Smart Tagging**: Semantic versioning with latest tags
- **Image Testing**: Validates published images before deployment

#### **Release Integration** (`release-please.yml`)
- **Coordinated Releases**: Docker images published alongside Tauri app releases
- **Release Notes**: Automatic Docker image information in GitHub releases

### GitHub Container Registry Setup

#### **Automatic Authentication**
GitHub Container Registry integration is automatic - no additional secrets required:

- **Authentication**: Uses built-in `GITHUB_TOKEN` automatically
- **Permissions**: Requires `packages: write` permission (already configured)
- **Repository**: Images are published to `ghcr.io/<owner>/<repo>/server`

#### **Repository Visibility**
- **Public Repositories**: Container images are public by default
- **Private Repositories**: Container images inherit repository visibility
- **Manual Visibility**: Can be changed in GitHub Package settings

### Published Docker Images

#### **Available Tags**
```bash
# Latest stable release
docker pull ghcr.io/<owner>/<repo>/server:latest

# Specific version
docker pull ghcr.io/<owner>/<repo>/server:1.0.0
docker pull ghcr.io/<owner>/<repo>/server:1.0
docker pull ghcr.io/<owner>/<repo>/server:1

# Development builds (main branch)
docker pull ghcr.io/<owner>/<repo>/server:main-<commit-sha>
```

#### **Multi-platform Support**
Images are built for multiple architectures:
- **AMD64**: Intel/AMD x86_64 processors
- **ARM64**: Apple Silicon, ARM servers, Raspberry Pi

#### **Using Published Images**

Replace the build configuration in `docker-compose.prod.yml`:

```yaml
services:
  yutodo-server:
    # Use published image instead of building locally
    image: ghcr.io/<owner>/<repo>/server:latest
    # image: ghcr.io/<owner>/<repo>/server:1.0.0  # For specific version
    # 
    # Comment out build configuration:
    # build:
    #   context: ./server
    #   dockerfile: Dockerfile
```

### Local Development with Published Images

#### **Quick Start with Published Image**
```bash
# Create minimal docker-compose for published image
cat > docker-compose.published.yml << 'EOF'
version: '3.8'
services:
  yutodo-server:
    image: ghcr.io/<owner>/<repo>/server:latest
    container_name: yutodo-server-published
    environment:
      - YUTODO_CORS_ORIGINS=*
    ports:
      - "3001:3001"
    volumes:
      - yutodo-data:/data
volumes:
  yutodo-data:
EOF

# Login to GHCR (for private repositories)
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# Start with published image
docker-compose -f docker-compose.published.yml up -d

# Connect with Tauri app
npm run tauri dev
```

#### **Hybrid Development**
```bash
# Use published server image for stable backend
docker-compose -f docker-compose.published.yml up -d

# Develop frontend against stable containerized server
npm run dev  # Frontend development server
npm run tauri dev  # Tauri app development
```

### Image Management

#### **Image Information**
```bash
# Inspect image metadata
docker inspect ghcr.io/<owner>/<repo>/server:latest

# View image layers and size
docker history ghcr.io/<owner>/<repo>/server:latest

# List all packages for a repository (via GitHub CLI)
gh api /orgs/<owner>/packages?package_type=container
```

#### **Local Cache Management**
```bash
# Update to latest version
docker pull ghcr.io/<owner>/<repo>/server:latest

# Clean old versions
docker image prune -f

# Remove specific version
docker rmi ghcr.io/<owner>/<repo>/server:1.0.0
```

### Security & Best Practices

#### **Image Security**
- **Non-root User**: Images run as `yutodo` user (UID 1001)
- **Minimal Base**: Alpine Linux for reduced attack surface
- **Security Scanning**: Automated vulnerability scanning in CI
- **Multi-stage Build**: Reduces final image size and complexity

#### **Production Usage**
```bash
# Always pin to specific versions in production
image: ghcr.io/<owner>/<repo>/server:1.0.0  # Good
# image: ghcr.io/<owner>/<repo>/server:latest  # Avoid in production

# Use environment-specific configurations
YUTODO_CORS_ORIGINS=https://your-domain.com  # Specific origins only
YUTODO_LOG_LEVEL=info  # Appropriate logging level
```

#### **GHCR Benefits**
- **Integrated Authentication**: Uses GitHub tokens, no separate credential management
- **Private Repository Support**: Free private container images with private repositories
- **Access Control**: Inherits GitHub repository permissions and teams
- **Package Management**: Integrated with GitHub Packages for unified dependency management
- **Security Scanning**: Automatic vulnerability scanning and security advisories

### Local Docker Development Script

The `scripts/docker-local.sh` script provides convenient commands for local Docker development and testing:

#### **Available Commands**
```bash
# Build Docker image locally
./scripts/docker-local.sh build --tag test

# Run container with development settings
./scripts/docker-local.sh run

# Run container with production settings  
./scripts/docker-local.sh run --env prod

# Test complete Docker setup (build + run + health check)
./scripts/docker-local.sh test --cleanup

# Test publishing workflow with local registry
./scripts/docker-local.sh publish

# View container logs
./scripts/docker-local.sh logs

# Open shell in running container
./scripts/docker-local.sh shell

# Clean up Docker resources
./scripts/docker-local.sh clean
```

#### **Script Options**
- `--tag TAG`: Specify Docker image tag (default: latest)
- `--env ENV`: Environment mode - `dev` or `prod` (default: dev)
- `--cleanup`: Clean up resources after operation
- `--help`: Show usage information

#### **Development Workflow Examples**
```bash
# Quick development setup
./scripts/docker-local.sh build
./scripts/docker-local.sh run
npm run tauri dev  # Connect Tauri app

# Test production build
./scripts/docker-local.sh run --env prod --cleanup

# Debug container issues
./scripts/docker-local.sh test
./scripts/docker-local.sh logs
./scripts/docker-local.sh shell

# Clean up everything
./scripts/docker-local.sh clean
```

### Integration with Package.json

Add these convenience scripts to your `package.json`:

```json
{
  "scripts": {
    "docker:build": "./scripts/docker-local.sh build",
    "docker:dev": "./scripts/docker-local.sh run",
    "docker:prod": "./scripts/docker-local.sh run --env prod",
    "docker:test": "./scripts/docker-local.sh test --cleanup",
    "docker:clean": "./scripts/docker-local.sh clean"
  }
}
```

Then use with npm:
```bash
npm run docker:dev    # Start development container
npm run docker:test   # Run full Docker test suite
npm run docker:clean  # Clean up resources
```

## Development Containers (VS Code)

The project includes full VS Code Development Container support for a consistent, reproducible development environment across all platforms.

### Quick Start

#### **Prerequisites**
- [VS Code](https://code.visualstudio.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

#### **Getting Started**
```bash
# 1. Clone the repository
git clone <repository-url>
cd yutodo

# 2. Open in VS Code
code .

# 3. When prompted, click "Reopen in Container"
# Or use Command Palette: "Dev Containers: Reopen in Container"
```

### Container Features

#### **Development Environment**
- **Base Image**: Ubuntu 22.04 with development tools
- **Node.js**: v20 with npm, yarn, and common global packages
- **Rust**: Latest stable toolchain with cargo, clippy, rustfmt
- **Tauri Dependencies**: All required system libraries pre-installed
- **Docker-in-Docker**: Full Docker CLI access for container development

#### **Pre-installed Tools**
```bash
# Development Utilities
git, curl, wget, tree, htop, vim, nano, jq, ripgrep, fd-find, bat, exa

# Tauri System Dependencies  
libwebkit2gtk-4.1-dev, libappindicator3-dev, librsvg2-dev, patchelf

# Testing & E2E
tauri-driver, webkit2gtk-driver, xvfb (virtual display)

# Rust Tools
cargo-edit, cargo-audit, cargo-outdated, cargo-tree, tauri-cli

# Node.js Global Packages
typescript, ts-node, eslint, prettier, concurrently, nodemon
```

#### **VS Code Extensions**
Automatically installs and configures:
- **Rust**: rust-analyzer, LLDB debugger, crates manager
- **TypeScript**: Advanced TypeScript support, ESLint, Prettier
- **React**: React snippets, auto-rename-tag, path intellisense
- **Tauri**: Official Tauri extension
- **Testing**: Jest, Vitest explorers
- **Docker**: Docker extension for container management
- **Git**: GitHub integration, Copilot support

### Development Workflow

#### **Container Startup**
1. **Post-Create** (runs once): Installs all dependencies, builds projects
2. **Post-Start** (runs on each start): Environment setup, service checks

#### **Development Commands**
```bash
# Quick aliases (automatically configured)
yt-dev         # Start Tauri development server
yt-server      # Start backend server  
yt-test        # Run frontend tests
yt-test-server # Run backend tests
yt-test-e2e    # Run E2E tests
yt-lint        # Run linting
yt-docker      # Docker development utilities

# Project management
dev-setup      # Install all dependencies
dev-clean      # Clean all node_modules and caches
dev-fresh      # Clean + setup from scratch

# Git shortcuts
gst, gco, gcb, gpl, gps, glog
```

#### **Integrated Development**
```bash
# Terminal 1: Start the server
yt-server

# Terminal 2: Start Tauri app (in container)
yt-dev

# Terminal 3: Run tests
yt-test --watch
```

### Advanced Configuration

#### **Container Composition**
The development environment uses docker-compose with multiple services:

```yaml
services:
  yutodo-dev:        # Main development container
  yutodo-server:     # Containerized server (optional)
```

#### **Volume Optimization**
- **Cargo Cache**: Persistent Rust build cache
- **Node Modules**: Separate caches for root, server, e2e
- **Target Directory**: Persistent Rust compilation cache
- **Source Code**: Bind mount with cached performance

#### **Port Forwarding**
- **1420**: Tauri development server
- **3001**: YuToDo backend server
- **5173**: Vite development server

#### **GUI Application Support**
```bash
# X11 forwarding for native development
export DISPLAY=:0

# Virtual display for headless testing
Xvfb :0 -screen 0 1920x1080x24
```

### Container vs Local Development

#### **Container Advantages**
- **Consistent Environment**: Same setup across Windows, macOS, Linux
- **Pre-configured Tools**: All dependencies and extensions ready
- **Isolation**: No conflicts with host system packages
- **Team Onboarding**: New developers productive immediately
- **CI/CD Parity**: Development environment matches build environment

#### **When to Use Local Development**
- **Performance**: Native compilation can be faster
- **System Integration**: Better access to system services
- **Resource Usage**: Lower memory/CPU overhead
- **Existing Setup**: Already have working local environment

### Troubleshooting

#### **Common Issues**

**Container won't start:**
```bash
# Check Docker daemon
docker info

# Restart Docker Desktop
# Windows/Mac: Restart Docker Desktop app
# Linux: sudo systemctl restart docker
```

**Extensions not loading:**
```bash
# Reload window
Ctrl+Shift+P > "Developer: Reload Window"

# Rebuild container
Ctrl+Shift+P > "Dev Containers: Rebuild Container"
```

**Port conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3001

# Kill conflicting processes
sudo lsof -ti:3001 | xargs sudo kill -9
```

**Slow performance:**
```bash
# Check Docker resources in Docker Desktop settings
# Increase memory allocation (recommended: 8GB+)
# Enable file sharing optimization
```

#### **Performance Optimization**

```bash
# Use named volumes for better I/O performance
docker volume create yutodo-cargo-cache
docker volume create yutodo-node-modules

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Use Docker Desktop with WSL 2 backend on Windows
```

### Integration with CI/CD

The development container configuration ensures:
- **Environment Parity**: Same base image and tools as CI
- **Dependency Consistency**: Lock files work identically
- **Test Reliability**: Same testing environment as GitHub Actions
- **Docker Integration**: Same containerized server setup

### Custom Configuration

#### **User Customization**
Create `.devcontainer/devcontainer.local.json` for personal settings:

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "your-personal-extension"
      ],
      "settings": {
        "your.personal.setting": "value"
      }
    }
  }
}
```

#### **Environment Variables**
Override via `.devcontainer/.env`:
```bash
RUST_LOG=trace
NODE_ENV=development
YUTODO_DEV_MODE=true
```

### Migration Guide

#### **From Local to Container Development**

1. **Backup Current Work**: Commit all changes
2. **Open in Container**: VS Code will prompt automatically
3. **Wait for Setup**: Post-create script installs everything
4. **Verify Environment**: Run `yt-test` to ensure everything works
5. **Continue Development**: All aliases and tools are ready

#### **Container to Local (if needed)**

1. **Export Dependencies**: `npm list --depth=0` in each directory
2. **Install Local Tools**: Follow main README installation guide
3. **Copy Configuration**: Transfer `.vscode/settings.json` settings

The development container provides the optimal development experience with minimal setup time and maximum consistency.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context or otherwise consider it in your response unless it is highly relevant to your task. Most of the time, it is not relevant.