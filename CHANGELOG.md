# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete YuToDo application with Tauri desktop framework
- React frontend with TypeScript and modern UI components
- Node.js backend server with Socket.IO real-time communication
- Todo management with SQLite database persistence
- Keyboard shortcuts with OS-aware labels (Ctrl/Cmd)
- Dark/light/auto theme system with system preference detection
- Internationalization support (English/Japanese)
- Comprehensive configuration system with TOML files
- Schedule management system with execution engine
- Multi-selection support with Excel-like interaction
- Completed tasks collapsible section
- Header menu system with keyboard navigation
- Export/import functionality with native file dialogs
- Cross-platform desktop integration with Tauri v2

### Changed
- Improved header visibility in detailed mode without content overlap
- Enhanced TodoItem component with selection and visual feedback
- Updated ScheduleView with improved UI and execution engine
- Refined application architecture and performance

### Fixed
- Header positioning to use static layout instead of overlay in detailed mode
- CSS class application for proper mode switching
- Test coverage for header visibility behavior

### Security
- Added automated security scanning with CodeQL
- Implemented NPM and Cargo audit workflows
- Configured Dependabot for automated dependency updates

## [0.1.0] - 2025-06-14

### Added
- Initial release of YuToDo application
- Basic todo management functionality
- Tauri desktop application framework
- Real-time synchronization with WebSockets
- SQLite database persistence
- Comprehensive test coverage (Frontend: 257 tests, Backend: comprehensive coverage)

[Unreleased]: https://github.com/yutotnh/yutodo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yutotnh/yutodo/releases/tag/v0.1.0