'use client';

import { useWebSocket } from '@/context/websocket-provider';

/**
 * A hook to provide access to the global WebSocket connection status.
 */
export function useChatWebSocket() {
  const { isConnected } = useWebSocket();

  return { isConnected };
}
