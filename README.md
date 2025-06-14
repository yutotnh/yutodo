# YuToDo - Tauri Desktop Application

A modern, feature-rich todo list application built with Tauri, React, and TypeScript. This desktop app provides real-time synchronization, native file operations, Markdown support, and extensive customization options.

## Features

### Core Functionality
- ✅ **Real-time synchronization** - Multiple instances stay synchronized via WebSocket
- ✅ **Drag & drop reordering** - Intuitive task organization
- ✅ **Inline editing** - Click to edit tasks directly (slim mode support)
- ✅ **Priority system** - High (2), Medium (1), Low (0) priority levels with visual indicators
- ✅ **Due dates** - Schedule tasks with optional due dates and overdue detection
- ✅ **Search & filtering** - Find tasks by content, status, priority, or overdue status
- ✅ **Bulk operations** - Select and delete multiple tasks with Ctrl+click
- ✅ **Delete confirmation** - Optional confirmation dialogs (configurable)
- ✅ **Markdown support** - Full Markdown rendering in task titles and descriptions

### User Interface
- 🎨 **Dark/Light themes** - Auto-detect system preference or manual selection
- 📱 **Slim mode** - Compact view for minimal desktop footprint
- 🎯 **Auto-hiding header** - Clean interface that appears on mouse hover
- ⌨️ **Keyboard shortcuts** - Full keyboard navigation support (Ctrl+N, Ctrl+F, etc.)
- 🎨 **Custom CSS injection** - Personalize the appearance with custom styles
- 🔗 **Interactive links** - Click Markdown links to open in default browser
- 📋 **Right-click context** - Right-click links to copy URLs to clipboard

### Data Management & Export/Import
- 💾 **SQLite database** - Reliable local data storage with automatic persistence
- 📤 **Native file operations** - Full Tauri-native file dialogs for export/import
- 📄 **Multiple export formats**:
  - **JSON export** - Complete task data with metadata and ordering
  - **CSV export** - Spreadsheet-compatible format for data analysis
  - **TOML config export** - Beautiful structured settings backup with comments
- 📥 **Import functionality**:
  - **JSON import** - Restore tasks from exported files with validation
  - **TOML config import** - Restore settings from backup files
- ⚙️ **TOML configuration** - Human-readable settings file with JSON Schema validation
- 🔄 **Auto-save** - Settings and tasks automatically persisted
- 📋 **Clipboard fallback** - Automatic clipboard copy when native save fails (WSLg support)

### Desktop Integration
- 📌 **Always on top** - Keep the app visible above other windows
- 🪟 **Custom window controls** - Minimize, close, and drag functionality
- 🔧 **Native dialogs** - System-native file save/open dialogs via Tauri plugins
- 🖥️ **Cross-platform** - Works on Windows, macOS, and Linux (with WSLg considerations)
- 📋 **System clipboard** - Native clipboard integration for URL copying and data export

## Architecture

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **UI Components**: Custom components with Lucide React icons
- **Drag & Drop**: @dnd-kit for modern drag and drop functionality
- **Date Handling**: react-datepicker for scheduling
- **Real-time**: Socket.IO client for WebSocket communication
- **Configuration**: @ltd/j-toml for TOML parsing and generation
- **Markdown**: react-markdown with remark-gfm for GitHub Flavored Markdown

### Backend (Node.js + Express)
- **Server**: Express.js with TypeScript
- **Database**: SQLite with better-sqlite3 for high performance
- **Real-time**: Socket.IO for WebSocket communication
- **API**: RESTful endpoints for todo operations
- **Schema**: Automatic database initialization and migration

### Desktop (Tauri v2 + Rust)
- **Framework**: Tauri v2 for modern cross-platform desktop apps
- **Plugins**:
  - `tauri-plugin-dialog` - Native file dialogs
  - `tauri-plugin-fs` - Secure file system access
  - `tauri-plugin-opener` - System integration and URL handling
  - `tauri-plugin-clipboard-manager` - Native clipboard operations
- **Window Management**: Native window controls and system integration
- **Security**: Capability-based permissions system
- **Performance**: Rust backend with web frontend for optimal performance

## Development Setup

### Prerequisites
- Node.js (v16+)
- Rust (latest stable)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd todo
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

### Development Workflow

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the Tauri development app**
   ```bash
   npm run tauri dev
   ```

The app will connect to the server at `http://localhost:3001` by default.

## Build Commands

### Frontend (React + Vite)
```bash
npm run dev          # Start Vite dev server
npm run build        # Build React app and TypeScript
npm run preview      # Preview built app
```

### Backend (Node.js Server)
```bash
cd server
npm run dev          # Start server with ts-node
npm run build        # Compile TypeScript
npm run start        # Run compiled server
```

### Desktop (Tauri)
```bash
npm run tauri dev    # Start Tauri development mode
npm run tauri build  # Build Tauri desktop app for distribution
```

## Configuration

### Settings File (TOML)
The app supports a comprehensive TOML configuration file with the following structure:

```toml
# YuToDo Configuration
# Generated on 2025-06-14T12:34:56.789Z
#
# This file contains all settings for the Yutodo application.
# You can edit this file manually or use the settings panel in the app.

# Application window settings
[app.window]
always_on_top = false
width = 800
height = 600
min_width = 400
min_height = 300

# User interface settings
[app.ui]
theme = "auto"  # "auto" | "light" | "dark"
detailed_mode = false
auto_hide_header = true

# Application behavior settings
[app.behavior]
auto_save = true
enable_shortcuts = true
show_notifications = true
confirm_delete = true

# Server connection settings
[server]
url = "http://localhost:3001"
timeout = 5000
retry_attempts = 3

# Visual appearance settings
[appearance]
custom_css = ""
font_family = "Inter, sans-serif"
font_size = 14

# Keyboard shortcuts
[shortcuts]
new_task = "Ctrl+N"
toggle_settings = "Ctrl+,"
focus_search = "Ctrl+F"
select_all = "Ctrl+A"
delete_selected = "Delete"
show_help = "F1"
```

### Configuration Management
- **Export Settings**: Save current configuration as structured TOML file with comments
- **Import Settings**: Load configuration from TOML file with validation
- **Reset to Defaults**: Restore all settings to default values
- **Live Updates**: Settings applied immediately without restart
- **Validation**: JSON Schema validation for configuration integrity

### JSON Schema
A complete JSON Schema is provided in `config.schema.json` for IDE autocompletion and validation.

## Markdown Support

### Full Markdown Rendering
- **Task Titles**: Support for inline Markdown formatting (bold, italic, code, links)
- **Task Descriptions**: Complete Markdown support including headers, lists, code blocks
- **GitHub Flavored Markdown**: Extended syntax support via remark-gfm

### Interactive Features
- **Clickable Links**: URLs in Markdown automatically open in default browser
- **Right-click Context**: Right-click any link to copy URL to clipboard
- **Cross-platform URL Handling**: Smart fallbacks for WSLg environments
- **Visual Styling**: Consistent Markdown styling in both light and dark themes

### Usage Examples
```markdown
**Important**: Review [documentation](https://example.com)
*Progress*: `npm install` completed
## Project Phase 1
- [x] Setup development environment
- [ ] Implement core features
```

## Data Export & Import

### Export Formats

#### JSON Export
- Complete task data with all metadata
- Includes ID, title, description, completion status, priority, due dates, and timestamps
- Preserves custom ordering information and Markdown formatting
- Full round-trip compatibility for backup/restore

#### CSV Export
- Spreadsheet-compatible format
- Headers: ID, Title, Description, Completed, Priority, Scheduled For, Created At, Updated At
- Handles text escaping and special characters (including Markdown)
- Perfect for data analysis or external tool integration

#### TOML Configuration Export
- Human-readable settings backup with comments and section headers
- Preserves all user customizations
- Includes theme preferences, window settings, shortcuts, and custom CSS
- Cross-device configuration sharing

### Import Functionality
- **JSON Import**: Restore tasks from exported JSON files with data validation
- **TOML Import**: Restore settings from configuration backups
- **File Validation**: Automatic format detection and error handling
- **Native File Dialogs**: System-native file picker integration

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new task |
| `Ctrl+,` | Toggle settings |
| `Ctrl+F` | Focus search |
| `Ctrl+A` | Select all tasks |
| `Delete` | Delete selected tasks |
| `F1` | Show help |
| `F2` | Edit task (slim mode) |
| `Space` | Toggle task completion |
| `Enter` | Confirm action/Complete editing |
| `Escape` | Cancel action/Close dialogs |

## Database Schema

SQLite table `todos`:
- `id` (TEXT PRIMARY KEY) - Unique task identifier
- `title` (TEXT NOT NULL) - Task title (supports Markdown)
- `description` (TEXT) - Optional task description (supports Markdown)
- `completed` (BOOLEAN) - Completion status
- `priority` (INTEGER, 0-2) - Priority level (0=Low, 1=Medium, 2=High)
- `scheduledFor` (DATETIME) - Optional due date
- `createdAt` (DATETIME) - Creation timestamp
- `updatedAt` (DATETIME) - Last modification timestamp
- `order` (INTEGER) - Custom ordering for drag & drop

## API Endpoints

### REST API
- `GET /api/todos` - Get all todos
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `POST /api/todos/bulk-import` - Import multiple todos
- `POST /api/todos/reorder` - Update todo ordering

### WebSocket Events (Socket.IO)
- `todos:list` - Get current todos list
- `todo:add` - Add new todo
- `todo:update` - Update existing todo
- `todo:delete` - Delete todo
- `todo:toggle` - Toggle completion status
- `todos:bulk-import` - Import multiple todos
- `todos:reorder` - Reorder todos

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **@dnd-kit** - Modern drag and drop library
- **Socket.IO Client** - Real-time communication
- **Lucide React** - Beautiful icon library
- **React DatePicker** - Date selection component
- **react-markdown** - Markdown rendering with remark-gfm
- **@ltd/j-toml** - TOML parsing and stringification

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe server code
- **Socket.IO** - Real-time WebSocket communication
- **better-sqlite3** - High-performance SQLite driver
- **cors** - Cross-origin resource sharing

### Desktop (Tauri v2)
- **Tauri v2** - Modern Rust-based desktop framework
- **Rust** - Systems programming language for performance and security
- **tauri-plugin-dialog** - Native file save/open dialogs
- **tauri-plugin-fs** - Secure file system operations
- **tauri-plugin-opener** - System integration and URL handling
- **tauri-plugin-clipboard-manager** - Native clipboard operations
- **Capability-based Security** - Fine-grained permission system

### Development Tools
- **ts-node** - TypeScript execution for development
- **Vite** - Modern build tooling with hot reload
- **Cargo** - Rust package manager and build system

## File System Integration

### Tauri Plugins Configuration
The app uses Tauri v2's plugin system for secure native operations:

```json
{
  "permissions": [
    "opener:allow-open-url",
    "dialog:allow-save",
    "dialog:allow-open",
    "dialog:allow-message",
    "fs:allow-write-text-file",
    "fs:allow-read-text-file",
    "clipboard-manager:allow-read-text",
    "clipboard-manager:allow-write-text"
  ]
}
```

### Cross-Platform File Operations
- **Native Save Dialogs**: System-appropriate file save dialogs
- **File Type Filtering**: Automatic file extension filtering (.json, .csv, .toml)
- **Error Handling**: Graceful fallback to clipboard operations
- **Path Management**: Secure file path handling with Tauri's sandboxed approach
- **WSLg Support**: Automatic detection and clipboard fallbacks for WSL environments

## WSLg Environment Support

### Automatic Detection
The app automatically detects WSLg (Windows Subsystem for Linux GUI) environments and provides appropriate fallbacks:

### URL Handling
- **Native Attempt**: First tries to open URLs in default browser
- **Clipboard Fallback**: Automatically copies URLs to clipboard with user notification
- **Right-click Option**: Alternative method to copy URLs manually

### File Operations
- **Native Dialogs**: Attempts to use system native file dialogs
- **Clipboard Export**: Falls back to clipboard copy when file operations fail
- **User Guidance**: Clear messages about WSLg limitations and workarounds

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [WebStorm](https://www.jetbrains.com/webstorm/) for React/TypeScript development
- [RustRover](https://www.jetbrains.com/rust/) for Rust development

## Troubleshooting

### Common Issues

1. **Export/Import not working**: Ensure Tauri plugins are properly configured in `capabilities/default.json`
2. **Database connection issues**: Check that the server is running on port 3001
3. **Build failures**: Verify Rust toolchain is installed and up to date
4. **Permission errors**: Review Tauri capabilities configuration for required permissions
5. **URLs not opening**: In WSLg environments, URLs are copied to clipboard instead
6. **Always on top not working**: This feature may be limited in WSLg environments

### Debug Mode
Run the app in development mode to access browser developer tools:
```bash
npm run tauri dev
```

### WSLg Specific Issues
- **URL Opening**: Links will copy to clipboard instead of opening directly
- **File Dialogs**: May fall back to clipboard operations
- **Window Management**: Some features like "always on top" may not work
- **Solution**: Use the clipboard content in Windows applications
