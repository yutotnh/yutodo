import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsErrorBanner } from '../components/SettingsErrorBanner';
import { SettingsFileError } from '../types/settings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key
  })
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn()
  }
}));

describe('SettingsErrorBanner', () => {
  const mockOnDismiss = vi.fn();
  const mockOnOpenFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when no errors', () => {
    const { container } = render(
      <SettingsErrorBanner
        errors={[]}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render settings file error', () => {
    const error: SettingsFileError = {
      type: 'settings',
      code: 'PARSE_ERROR',
      message: 'Failed to parse settings',
      userMessage: 'Settings configuration file has syntax errors. Check line 5.',
      filePath: '/path/to/settings.toml',
      details: {
        line: 5,
        column: 10,
        problemText: 'unexpected character',
        suggestion: 'Remove backslash escape characters'
      },
      canAutoFix: true,
      severity: 'error'
    };

    render(
      <SettingsErrorBanner
        errors={[error]}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    expect(screen.getByText('Settings File Error')).toBeInTheDocument();
    expect(screen.getByText('Settings configuration file has syntax errors. Check line 5.')).toBeInTheDocument();
    expect(screen.getByText('Line 5:10')).toBeInTheDocument();
    expect(screen.getByText('Problem: unexpected character')).toBeInTheDocument();
    expect(screen.getByText('Open File')).toBeInTheDocument();
    expect(screen.getByText('Auto Fix')).toBeInTheDocument();
  });

  it('should render keybindings file error', () => {
    const error: SettingsFileError = {
      type: 'keybindings',
      code: 'PARSE_ERROR',
      message: 'Failed to parse keybindings',
      userMessage: 'Keyboard shortcuts configuration file has syntax errors.',
      filePath: '/path/to/keybindings.toml',
      severity: 'error'
    };

    render(
      <SettingsErrorBanner
        errors={[error]}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    expect(screen.getByText('Keyboard Shortcuts Error')).toBeInTheDocument();
    expect(screen.getByText('Keyboard shortcuts configuration file has syntax errors.')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const error: SettingsFileError = {
      type: 'settings',
      code: 'PARSE_ERROR',
      message: 'Failed to parse settings',
      userMessage: 'Settings configuration file has syntax errors.',
      filePath: '/path/to/settings.toml',
      severity: 'error'
    };

    render(
      <SettingsErrorBanner
        errors={[error]}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    const dismissButton = screen.getByTitle('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('settings');
  });

  it('should call onOpenFile when open file button is clicked', async () => {
    const error: SettingsFileError = {
      type: 'keybindings',
      code: 'PARSE_ERROR',
      message: 'Failed to parse keybindings',
      userMessage: 'Keyboard shortcuts configuration file has syntax errors.',
      filePath: '/path/to/keybindings.toml',
      severity: 'error'
    };

    mockOnOpenFile.mockResolvedValue(undefined);

    render(
      <SettingsErrorBanner
        errors={[error]}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    const openFileButton = screen.getByText('Open File');
    fireEvent.click(openFileButton);

    expect(mockOnOpenFile).toHaveBeenCalledWith('/path/to/keybindings.toml');
  });

  it('should render multiple errors', () => {
    const errors: SettingsFileError[] = [
      {
        type: 'settings',
        code: 'PARSE_ERROR',
        message: 'Failed to parse settings',
        userMessage: 'Settings configuration file has syntax errors.',
        filePath: '/path/to/settings.toml',
        severity: 'error'
      },
      {
        type: 'keybindings',
        code: 'PARSE_ERROR',
        message: 'Failed to parse keybindings',
        userMessage: 'Keyboard shortcuts configuration file has syntax errors.',
        filePath: '/path/to/keybindings.toml',
        severity: 'warning'
      }
    ];

    render(
      <SettingsErrorBanner
        errors={errors}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    expect(screen.getByText('Settings File Error')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts Error')).toBeInTheDocument();
  });

  it('should apply correct CSS classes for error severity', () => {
    const errors: SettingsFileError[] = [
      {
        type: 'settings',
        code: 'PARSE_ERROR',
        message: 'Failed to parse settings',
        userMessage: 'Settings error message',
        filePath: '/path/to/settings.toml',
        severity: 'error'
      },
      {
        type: 'keybindings',
        code: 'PARSE_ERROR',
        message: 'Failed to parse keybindings',
        userMessage: 'Keybindings warning message',
        filePath: '/path/to/keybindings.toml',
        severity: 'warning'
      }
    ];

    const { container } = render(
      <SettingsErrorBanner
        errors={errors}
        onDismiss={mockOnDismiss}
        onOpenFile={mockOnOpenFile}
      />
    );

    const errorItems = container.querySelectorAll('.error-item');
    expect(errorItems[0]).toHaveClass('error-error');
    expect(errorItems[1]).toHaveClass('error-warning');
  });
});