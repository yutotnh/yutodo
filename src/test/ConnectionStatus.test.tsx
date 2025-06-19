import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConnectionStatus } from '../components/ConnectionStatus';

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders connected status', () => {
    render(<ConnectionStatus connectionStatus="connected" reconnectAttempts={0} isSlimMode={false} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders connecting status', () => {
    render(<ConnectionStatus connectionStatus="connecting" reconnectAttempts={0} isSlimMode={false} />);
    
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('renders disconnected status', () => {
    render(<ConnectionStatus connectionStatus="disconnected" reconnectAttempts={0} isSlimMode={false} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders error status', () => {
    render(<ConnectionStatus connectionStatus="error" reconnectAttempts={0} isSlimMode={false} />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('renders reconnecting status with attempt number', () => {
    render(<ConnectionStatus connectionStatus="connecting" reconnectAttempts={3} isSlimMode={false} />);
    
    expect(screen.getByText('Reconnecting (3)')).toBeInTheDocument();
  });

  it('renders in slim mode', () => {
    const { container } = render(<ConnectionStatus connectionStatus="connected" reconnectAttempts={0} isSlimMode={true} />);
    
    // In slim mode, should show short symbol
    expect(screen.getByText('●')).toBeInTheDocument();
    
    // Should have title attribute with full text
    const element = container.querySelector('[title="Connected"]');
    expect(element).toBeInTheDocument();
  });

  it('renders in detailed mode', () => {
    const { container } = render(<ConnectionStatus connectionStatus="connected" reconnectAttempts={0} isSlimMode={false} />);
    
    // In detailed mode, should show full text
    expect(screen.getByText('Connected')).toBeInTheDocument();
    
    // Should have background color styling
    const statusElement = container.querySelector('.bg-green-500\\/20');
    expect(statusElement).toBeInTheDocument();
  });

  it('applies correct CSS classes for different statuses', () => {
    const { rerender, container } = render(<ConnectionStatus connectionStatus="connected" reconnectAttempts={0} isSlimMode={false} />);
    
    let statusElement = container.querySelector('.bg-green-500\\/20');
    expect(statusElement).toBeInTheDocument();

    rerender(<ConnectionStatus connectionStatus="error" reconnectAttempts={0} isSlimMode={false} />);
    statusElement = container.querySelector('.bg-red-500\\/20');
    expect(statusElement).toBeInTheDocument();

    rerender(<ConnectionStatus connectionStatus="connecting" reconnectAttempts={0} isSlimMode={false} />);
    statusElement = container.querySelector('.bg-blue-500\\/20');
    expect(statusElement).toBeInTheDocument();
  });
});