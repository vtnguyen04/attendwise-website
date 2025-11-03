'use client';

import { useWebSocket } from '@/context/websocket-provider';

/**
 * A hook to provide access to the global WebSocket connection status.
 */
export function useChatWebSocket() {
  const { isConnected, onlineUsers, typingUsers, sendJsonMessage } = useWebSocket();

  return { isConnected, onlineUsers, typingUsers, sendJsonMessage };
}
