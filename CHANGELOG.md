# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Comprehensive server configuration system** - Complete server-side configuration management with validation and hot-reloading
- **100% E2E test coverage** - Achieved full WebdriverIO test suite pass rate with cross-platform compatibility
- **VSCode-style command palette** - Quick access to all application commands with Ctrl+Shift+P
- **Centralized keyboard shortcut management** - Single source of truth for all shortcuts with automatic synchronization
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

### Enhanced
- **Command palette integration** - All commands now dynamically reference actual keyboard shortcuts
- **OS-aware shortcut display** - Command palette and help automatically show Ctrl/Cmd based on platform
- **Unified shortcut system** - Eliminated inconsistencies between displayed and actual shortcuts
- Completed tasks collapsible section
- Header menu system with keyboard navigation (Alt+F/E/V/H shortcuts)
- Export/import functionality with native file dialogs
- Cross-platform desktop integration with Tauri v2
- Comprehensive CI/CD pipeline with GitHub Actions
- Automated dependency updates with Dependabot
- Security scanning (NPM audit, Cargo audit, CodeQL)
- Development workflow documentation and contribution guidelines

### Changed
- Improved header visibility in detailed mode without content overlap
- Enhanced TodoItem component with selection and visual feedback
- Updated ScheduleView with improved UI and execution engine
- Refined application architecture and performance
- Updated all commit messages to use proper conventional format
- Improved menu bar implementation with comprehensive keyboard navigation
- Enhanced CHANGELOG maintenance approach to use Claude Code assistance
- Enhanced slim mode to display priority, date, and description with small text while maintaining compact design
- Improved slim mode to display full datetime instead of date-only in task list for better scheduling visibility

### Fixed
- **Development server port conflicts** - Vite now automatically selects available ports (1420, 1421, 1422...) instead of failing when 1420 is in use
- **E2E test reliability** - Resolved Edge WebDriver version conflicts in GitHub Actions CI/CD pipeline by using tauri-driver exclusively
- **Cross-platform E2E testing** - Fixed Windows/Linux compatibility issues in WebdriverIO test configuration 
- **Add todo button UI** - Simplified button to icon-only ("+") design for cleaner interface
- Header positioning to use static layout instead of overlay in detailed mode
- CSS class application for proper mode switching
- Test coverage for header visibility behavior
- Commit message consistency across the project history
- Dark mode support for search bar and filter components with proper CSS scoping
- Dark mode theme selection logic to properly respect user settings instead of always following OS preferences

### Security
- Added automated security scanning with CodeQL
- Implemented NPM and Cargo audit workflows
- Configured Dependabot for automated dependency updates
- Added commit message validation to ensure quality

### Documentation
- Added comprehensive CONTRIBUTING.md with development guidelines
- Created issue and pull request templates
- Updated CLAUDE.md with CI/CD and release management documentation
- Added detailed testing requirements and architectural patterns

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