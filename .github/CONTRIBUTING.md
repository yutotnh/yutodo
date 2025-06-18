# Contributing to YuToDo

Thank you for your interest in contributing to YuToDo! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 20 or later
- Rust (latest stable)
- Git

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/yutodo.git
   cd yutodo
   ```

3. Install dependencies:
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd server
   npm install
   cd ..
   ```

4. Set up the development environment:
   ```bash
   # Start the backend server
   cd server
   npm run dev
   
   # In a new terminal, start the Tauri app
   npm run tauri dev
   ```

## Development Workflow

### Running Tests

```bash
# Frontend tests (Vitest)
npm test

# Backend tests (Jest)
cd server
npm test

# Run all tests in watch mode
npm run test:watch
cd server
npm run test:watch
```

### Code Quality

- All code must pass TypeScript compilation
- All tests must pass before submitting PR
- Follow existing code style and patterns
- Add tests for new functionality

### Commit Messages

We follow conventional commit format for automated CHANGELOG generation:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions or modifications
- `refactor:` - Code refactoring
- `style:` - Code style changes
- `ci:` - CI/CD changes
- `deps:` - Dependency updates
- `perf:` - Performance improvements
- `build:` - Build system changes
- `revert:` - Revert previous commits

Example: `feat: add dark mode toggle in settings`

**IMPORTANT**: Conventional commits are required for automatic CHANGELOG.md generation via Release Please.

### CHANGELOG Maintenance

The CHANGELOG.md is automatically maintained using Release Please based on conventional commit messages:

1. **Automatic Updates**: When you merge to `main` with conventional commits, Release Please creates a PR with updated CHANGELOG.md and version bumps
2. **Manual Updates**: For significant changes, you can manually edit CHANGELOG.md in the "Unreleased" section
3. **Breaking Changes**: Use `feat!:` or `fix!:` for breaking changes, or add `BREAKING CHANGE:` in the commit body

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure all tests pass

3. Commit your changes with descriptive messages

4. Push to your fork and create a pull request

5. Fill out the PR template completely

6. Wait for review and address feedback

## Testing Requirements

### Mandatory Testing Policy

**IMPORTANT**: Always write or update tests when adding features or making modifications. This is a strict requirement for this codebase.

- **Component Tests**: Create comprehensive tests for new UI components
- **Hook Tests**: Create tests for custom hooks
- **Integration Tests**: Create feature integration tests when needed
- **100% Pass Rate**: All tests must pass before any commit or deployment

### Test File Structure

```
src/test/
├── ComponentName.test.tsx     # Component tests
├── useHookName.test.ts       # Hook tests
└── utilityName.test.ts       # Utility tests

server/__tests__/
├── feature.test.ts           # Backend feature tests
└── integration.test.ts       # Integration tests
```

## Code Architecture

### Frontend (React + TypeScript + Tauri)

- **Components**: Reusable UI components in `src/components/`
- **Hooks**: Custom React hooks in `src/hooks/`
- **Types**: TypeScript interfaces in `src/types/`
- **Utils**: Utility functions in `src/utils/`
- **i18n**: Internationalization in `src/i18n/`

### Backend (Node.js + Express + Socket.IO)

- **Server**: Main server logic in `server/server.ts`
- **Database**: SQLite operations and schema
- **Tests**: Backend tests in `server/__tests__/`

### Desktop (Tauri + Rust)

- **Configuration**: Tauri config in `src-tauri/`
- **Plugins**: Native plugin integrations
- **Build**: Cross-platform build configuration

## Feature Guidelines

### UI/UX Principles

- **Accessibility**: All components must be keyboard navigable
- **Internationalization**: All user-facing text must use i18n keys
- **Theme Support**: Support for light/dark/auto themes
- **Responsive**: Works well in different window sizes

### Performance

- **Real-time Updates**: Efficient WebSocket communication
- **Database**: Optimized SQLite queries
- **Testing**: Fast test execution with proper mocking

## Security

- Never commit secrets or API keys
- Follow security best practices for dependencies
- All dependencies are automatically scanned
- Report security issues privately

## Documentation

- Update CHANGELOG.md for notable changes
- Add JSDoc comments for public APIs
- Update README.md if adding new features
- Include examples for complex functionality

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions about architecture
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.