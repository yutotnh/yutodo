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
- **Configuration**: 
  - **Client**: TOML-based config system with `src/utils/configManager.ts`
  - **Server**: Comprehensive server configuration system in `server/src/config/ServerConfigManager.ts`
- **Internationalization**: `src/i18n/` - Complete i18n system with English/Japanese support  
- **Menu System**: Custom header-integrated menu bar (`src/components/MenuBar.tsx`) replacing native Tauri menus

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
npm test                    # Run all frontend tests (291 total)
npm test src/test/TodoItem.test.tsx  # Run specific test file
npm test -- --run          # Run tests once (no watch mode)
npm run test:ui            # Launch Vitest UI for interactive testing

# Backend testing (from server directory)  
cd server
npm test                   # Run all backend tests (sequential due to SQLite)
npm run test:watch         # Watch mode for development
npm run test:parallel      # Run tests in parallel (faster but may conflict)
npm test -- --testNamePattern="socket" # Run specific tests

# E2E testing (from root directory)
npm run test:e2e           # Run all E2E tests headlessly
npm run test:e2e:ui        # Launch Playwright UI for interactive debugging
npm run test:e2e:headed    # Run E2E tests with visible browser window
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
- **Coverage**: 291 tests across 16 test files covering all major components and hooks

### Backend Testing (Jest + Socket.IO Testing)
- **Framework**: Jest with ts-jest preset for TypeScript support
- **Environment**: Node.js test environment with SQLite in-memory database
- **Socket Testing**: Socket.IO client/server integration tests
- **Configuration**: Tests run in band (sequential) to prevent database conflicts
- **Setup**: Test database isolation and cleanup between tests

### E2E Testing (Playwright + Tauri)
- **Framework**: Playwright for cross-platform GUI testing
- **Environment**: Real Tauri application with backend server
- **Test Coverage**: App launch, todo operations, keyboard shortcuts, window operations
- **CI Support**: GitHub Actions with virtual display (Xvfb) for Linux
- **Artifacts**: Screenshots, videos, and HTML reports on test failures

### Test Files Structure
```
src/test/
├── setup.ts                    # Global test configuration and mocks
├── App.test.tsx                # Main application integration tests
├── TodoItem.test.tsx           # TodoItem component behavior tests (37 tests)
├── useSocket.test.ts           # WebSocket functionality tests (28 tests)
├── useKeyboardShortcuts.test.ts # Keyboard shortcut system tests (40 tests)
├── configManager.test.ts       # Configuration management tests (17 tests)
├── utils.test.ts               # Utility function tests (16 tests)
├── AddTodoForm.test.tsx        # Form component tests (14 tests)
├── ConnectionStatus.test.tsx   # Connection status tests (8 tests)
├── DarkMode.test.tsx           # Dark mode functionality tests (9 tests)
├── DeleteConfirmDialog.test.tsx # Delete confirmation tests (9 tests)
├── MenuBar.test.tsx            # Menu bar functionality tests (12 tests)
├── ScheduleModal.test.tsx      # Schedule modal tests (14 tests)
├── ScheduleView.test.tsx       # Schedule view tests (13 tests)
├── SearchBar.test.tsx          # Search functionality tests (11 tests)
├── ShortcutHelp.test.tsx       # Shortcut help modal tests (15 tests)
└── TodoFilter.test.tsx         # Todo filtering tests (10 tests)

server/__tests__/
├── setup.js                   # Backend test setup and teardown
├── database.test.ts           # Database operations and migration tests
├── socket.test.ts             # WebSocket event handling tests
└── integration.test.ts        # End-to-end API integration tests

e2e/
├── helpers/
│   └── tauri-helpers.ts       # Tauri app launch/control utilities
├── tests/
│   ├── app-launch.spec.ts     # App initialization and UI tests
│   ├── todo-operations.spec.ts # Todo CRUD operation tests
│   ├── keyboard-shortcuts.spec.ts # Keyboard shortcut tests
│   └── window-operations.spec.ts # Window management tests
└── screenshots/               # Test failure screenshots
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

### E2E Testing with WebDriver (Tauri Official)
- **Framework**: WebdriverIO with Tauri WebDriver support
- **Test Coverage**: App launch, todo operations, keyboard shortcuts, window operations
- **Platform Support**: Linux (with Xvfb) and Windows (Edge WebDriver)
- **CI/CD Integration**: GitHub Actions workflow with virtual display for Linux
- **Test Organization**:
  - `e2e/tests/app-launch.spec.ts` - Application startup and UI component tests
  - `e2e/tests/todo-operations.spec.ts` - CRUD operations, filtering, search
  - `e2e/tests/keyboard-shortcuts.spec.ts` - Keyboard navigation and shortcuts
  - `e2e/tests/window-operations.spec.ts` - Window controls and menu interactions
- **Helper Functions**: Reusable test utilities in `e2e/helpers/tauri-helpers.ts`
- **Requirements**: `tauri-driver`, platform-specific WebDriver (webkit2gtk-driver for Linux, Edge WebDriver for Windows)

### Running Tests
- **Frontend**: All 336 tests pass with clean output, no warnings
- **Backend**: Comprehensive coverage of database operations and WebSocket events  
- **E2E**: WebDriver-based GUI tests for Tauri app with 4 test suites (30+ test cases)
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
cd e2e
npm install
npm test
```

## Architecture Patterns

### Command Palette System
- VSCode-style command palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
- Centralized command registry with type-safe command definitions (`src/types/commands.ts`)
- Dynamic command filtering with fuzzy search and scoring algorithm
- Context-aware command visibility and enablement based on application state
- Internationalization support for all command titles and descriptions

### Centralized Keyboard Shortcut Management
- Single source of truth in `src/utils/keyboardShortcuts.ts` for all keyboard shortcuts
- OS-aware shortcut display with automatic Ctrl/Cmd detection (`src/utils/osDetection.ts`)
- Dynamic shortcut reference system eliminates inconsistencies between displayed and actual shortcuts
- Type-safe shortcut definitions with handler name mapping for automatic synchronization
- Unified shortcut display across command palette, help system, and UI components

### Real-time State Management
- `useSocket.ts` manages WebSocket connection and synchronizes todos across all clients
- Socket.IO events: `todo:add`, `todo:update`, `todo:delete`, `todo:toggle`, `todos:reorder`
- State flows from server → Socket.IO → useSocket → App.tsx → UI components

### Configuration System

#### Client-Side Configuration
- TOML-based configuration with JSON Schema validation (`config.schema.json`)
- `configManager.ts` handles file operations with localStorage fallback
- Settings persist both in memory and configuration file
- Conversion functions between `AppSettings` and `TodoAppConfig` interfaces

#### Server-Side Configuration System
- **Architecture**: Comprehensive TOML-based server configuration with Zod schema validation
- **Location**: `server/src/config/ServerConfigManager.ts` and `server/src/types/config.ts`
- **OS-Standard Paths**: Automatically uses platform-appropriate directories:
  - **Windows**: `%APPDATA%/YuToDo/server-config.toml`
  - **macOS**: `~/Library/Application Support/YuToDo/server-config.toml`
  - **Linux**: `~/.config/YuToDo/server-config.toml`

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
- **Testing**: 24 comprehensive tests covering all functionality

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
- **App header height**: Use `event.clientY <= 44` for app header detection (28px height + 16px padding)
- **Header z-index**: Set to `z-index: 10000` to ensure header is always accessible for window dragging even when modals are open
- **Modal overlay pointer-events**: Use `pointer-events: none` on overlay and `pointer-events: auto` on modal content to allow window dragging

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

## Testing Best Practices

### Mandatory Testing Policy
**IMPORTANT**: Always write or update tests when adding features or making modifications. This is a strict requirement for this codebase.

### CI/CD Validation Requirements
**CRITICAL**: Before committing any changes, always run the complete CI/CD validation suite to prevent GitHub Actions failures:

```bash
# Frontend validation (run from root directory)
npm run lint          # ESLint check - must pass with no errors
npm run build         # TypeScript compilation and Vite build - must succeed
npm test -- --run     # All frontend tests - must pass (291 tests)

# Backend validation (run from server directory)  
cd server
npm run build         # TypeScript compilation - must succeed
npm test              # All backend tests - must pass (34 tests)
```

**Required checks before every commit:**
1. **Lint Check**: `npm run lint` must pass without errors
2. **Type Check**: `npm run build` must complete successfully
3. **Frontend Tests**: All 291 tests must pass
4. **Backend Tests**: All 34 tests must pass  
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
4. **Maintain 100% Pass Rate**: Ensure all 291 tests continue to pass

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
  - **E2E Tests**: Playwright tests on Windows/macOS/Linux
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