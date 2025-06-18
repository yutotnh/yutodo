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

### Fixed
- Header positioning to use static layout instead of overlay in detailed mode
- CSS class application for proper mode switching
- Test coverage for header visibility behavior
- Commit message consistency across the project history

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