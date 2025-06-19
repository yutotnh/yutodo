# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2025-06-19)


### Features

* add automated CHANGELOG and CI/CD workflows ([ddc0282](https://github.com/yutotnh/yutodo/commit/ddc02827c4522cae5bb25182d3e7730a3b95b85f))
* add comprehensive menu bar system with keyboard navigation ([53abac6](https://github.com/yutotnh/yutodo/commit/53abac65bc7cc32ee6e7292b8272da2b99419447))
* add ESLint configuration and integrate with build process ([59dbbbf](https://github.com/yutotnh/yutodo/commit/59dbbbfb1f46304b108451d2f0b37ef7096b1fbe))
* display full datetime in slim mode task list ([428a5ba](https://github.com/yutotnh/yutodo/commit/428a5ba98fc5844a8c9fd0a61b849c5616141175))
* enable automated releases with Windows binary builds ([054bbfe](https://github.com/yutotnh/yutodo/commit/054bbfeb46dfab629f0cc206331c82af32d0d829))
* enhance slim mode to display priority, date, and description with small text ([85a9f1e](https://github.com/yutotnh/yutodo/commit/85a9f1e6cc6b152d9eb4b23fede130134ac3950d))
* implement modern schedule UI with active/inactive sections and glassmorphism design ([51983e4](https://github.com/yutotnh/yutodo/commit/51983e4ddc38da9fe556c5111082edbf3aa02d3e))


### Bug Fixes

* add @vitest/coverage-v8 dependency for CI test coverage ([5baf8e3](https://github.com/yutotnh/yutodo/commit/5baf8e3ef5c7388c07f0f49f9a204a564d97ee7c))
* add coverage/ to .gitignore ([e4e8e0e](https://github.com/yutotnh/yutodo/commit/e4e8e0ed1577810e70349c9636cf24b206198b26))
* add missing Shift+click range selection for completed tasks ([50624f7](https://github.com/yutotnh/yutodo/commit/50624f7a808d4cf2c8e372138abf5ab6ec12635d))
* add proper dark mode support for search and filter components ([3ae1bfb](https://github.com/yutotnh/yutodo/commit/3ae1bfba48c936aa9a8c98f57e2cd1372915a6d4))
* change release workflow to manual trigger only ([0d2c13c](https://github.com/yutotnh/yutodo/commit/0d2c13c8c4fedb85ea35c4e0530002fe222ddb25))
* implement standard Shift+click range selection behavior ([ec4dc6c](https://github.com/yutotnh/yutodo/commit/ec4dc6cee68224de5ff90a309c61608490a45396))
* increase CSS selector specificity for dark mode search and filter styles ([e516a43](https://github.com/yutotnh/yutodo/commit/e516a4333ffb1f01073d9f102320899cd2ad1a36))
* remove 'Generated from schedule' text when creating todos from schedules ([ebdfc40](https://github.com/yutotnh/yutodo/commit/ebdfc40264dbb5d0455409e304a41966906e90ad))
* remove unused lastSelectedIndex variable and its setters ([2628910](https://github.com/yutotnh/yutodo/commit/262891090f272e2f8b9d47672571bfc69420d547))
* resolve dark mode theme precedence issues for search and filter components ([7556e37](https://github.com/yutotnh/yutodo/commit/7556e37aafe6a7fa3d7d7da58fbe80d4fd3271e1))
* resolve TypeScript compilation errors in test files ([91d4b1c](https://github.com/yutotnh/yutodo/commit/91d4b1cb13b5301b4d56d0bb4bb77b75a287d474))
* sync package-lock.json with package.json dependencies ([74b04f8](https://github.com/yutotnh/yutodo/commit/74b04f8a62aa63369f8f5b7ea2743635405c5de3))
* update CI to use ubuntu-latest instead of deprecated ubuntu-20.04 ([6627ff9](https://github.com/yutotnh/yutodo/commit/6627ff92140a5d8d7e88edb7b419189110681e7b))
* update GitHub Actions workflows for security and Ubuntu dependencies ([4c2767b](https://github.com/yutotnh/yutodo/commit/4c2767bfd5524c147be472effda5638f7d88b48d))
* update ScheduleView tests for active/inactive schedule sections ([9a33f49](https://github.com/yutotnh/yutodo/commit/9a33f49aafe1cd94dcfe6452fc6bfc4b17312c9e))

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
- Enhanced slim mode to display priority, date, and description with small text while maintaining compact design
- Improved slim mode to display full datetime instead of date-only in task list for better scheduling visibility

### Fixed
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
