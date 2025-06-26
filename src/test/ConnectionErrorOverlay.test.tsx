import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConnectionErrorOverlay } from '../components/ConnectionErrorOverlay';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string, options?: any) => {
      const translations: Record<string, string> = {
        'connectionError.connecting': 'Connecting to server...',
        'connectionError.reconnecting': 'Reconnecting to server...',
        'connectionError.failed': 'Connection Failed',
        'connectionError.disconnected': 'Server Disconnected',
        'connectionError.initialConnection': 'Establishing connection',
        'connectionError.failedDescription': 'Unable to connect to the server. Please check your network connection and server settings.',
        'connectionError.disconnectedDescription': 'Lost connection to the server. Your changes will not be synchronized.',
        'connectionError.serverUrl': 'Server',
        'connectionError.retryNow': 'Retry Now',
        'connectionError.settings': 'Server Settings',
        'connectionError.closeTemporary': 'Close temporarily (Press Esc)',
        'connectionError.helpText': 'Press Esc to work offline temporarily. Changes will not be synchronized until reconnected.'
      };
      
      if (key === 'connectionError.attemptCount') {
        return `Attempt ${options?.count} of 5`;
      }
      if (key === 'connectionError.nextRetry') {
        return `Next retry in ${options?.seconds} seconds`;
      }
      
      return translations[key] || defaultValue || key;
    },
  }),
}));

describe('ConnectionErrorOverlay', () => {
  const defaultProps = {
    connectionStatus: 'error' as const,
    reconnectAttempts: 0,
    onRetry: vi.fn(),
    onOpenSettings: vi.fn(),
    serverUrl: 'http://localhost:3001'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when connected', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="connected" />);
    
    expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server. Please check your network connection and server settings.')).toBeInTheDocument();
    expect(screen.getByText('Retry Now')).toBeInTheDocument();
    expect(screen.getByText('Server Settings')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:3001')).toBeInTheDocument();
  });

  it('renders disconnected state correctly', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="disconnected" />);
    
    expect(screen.getByText('Server Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Lost connection to the server. Your changes will not be synchronized.')).toBeInTheDocument();
  });

  it('renders connecting state correctly', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="connecting" reconnectAttempts={3} />);
    
    expect(screen.getByText('Reconnecting to server...')).toBeInTheDocument();
    expect(screen.getByText('Attempt 3 of 5')).toBeInTheDocument();
  });

  it('renders initial connecting state correctly', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="connecting" reconnectAttempts={0} />);
    
    expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
    expect(screen.getByText('Establishing connection')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    const retryButton = screen.getByText('Retry Now');
    fireEvent.click(retryButton);
    
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenSettings when settings button is clicked', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    const settingsButton = screen.getByText('Server Settings');
    fireEvent.click(settingsButton);
    
    expect(defaultProps.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('can be closed temporarily with close button', async () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    
    const closeButton = screen.getByTitle('Close temporarily (Press Esc)');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
    });
  });

  it('can be closed temporarily with Escape key', async () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
    });
  });

  it('does not show retry button when connecting', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="connecting" />);
    
    expect(screen.queryByText('Retry Now')).not.toBeInTheDocument();
    expect(screen.getByText('Server Settings')).toBeInTheDocument();
  });

  it('shows correct server URL', () => {
    const customServerUrl = 'https://my-custom-server.com:8080';
    render(<ConnectionErrorOverlay {...defaultProps} serverUrl={customServerUrl} />);
    
    expect(screen.getByText(customServerUrl)).toBeInTheDocument();
  });

  it('reappears when connection status changes from connected to error', async () => {
    const { rerender } = render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="connected" />);
    
    // Should not be visible when connected
    expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
    
    // Change to error state
    rerender(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    // Should now be visible
    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });
  });

  it('shows help text', () => {
    render(<ConnectionErrorOverlay {...defaultProps} connectionStatus="error" />);
    
    expect(screen.getByText('Press Esc to work offline temporarily. Changes will not be synchronized until reconnected.')).toBeInTheDocument();
  });
});