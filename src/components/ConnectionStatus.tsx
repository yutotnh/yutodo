import React from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

interface ConnectionStatusProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  isSlimMode: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionStatus,
  reconnectAttempts,
  isSlimMode,
  className = ''
}) => {
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          text: 'Connected',
          shortText: '●'
        };
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          text: reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts})` : 'Connecting',
          shortText: '○'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/20',
          text: 'Disconnected',
          shortText: '×'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500/20',
          text: 'Connection Error',
          shortText: '!'
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/20',
          text: 'Unknown',
          shortText: '?'
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (isSlimMode) {
    return (
      <div 
        data-testid="connection-status"
        className={`inline-flex items-center justify-center ${className}`}
        title={statusInfo.text}
      >
        <span 
          className={`text-xs font-bold ${statusInfo.color}`}
          style={{ fontSize: '10px' }}
        >
          {statusInfo.shortText}
        </span>
      </div>
    );
  }

  return (
    <div data-testid="connection-status" className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${statusInfo.bgColor} ${className}`}>
      <span className={statusInfo.color}>
        {statusInfo.icon}
      </span>
      <span className={`text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    </div>
  );
};