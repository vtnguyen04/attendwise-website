'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Message, Conversation } from '@/lib/types';
import { useUser } from './user-provider';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!user || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error("WebSocket: No access token found");
      return;
    }

    const socket = new WebSocket(`${WS_URL}?token=${token}`);

    socket.onopen = () => {
      console.log("WebSocket: Connection established");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket: Data received", data);

        if (data.conversation_id && data.sender_id) {
          // A new message has arrived for a conversation.
          // We invalidate the query for that conversation's messages.
          // The useInfiniteQuery hook in MessageView will then automatically refetch.
          queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] });

          // We also invalidate the conversations list to update the "last message" preview.
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } else {
          // Handle notification events by invalidating the notifications query.
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      } catch (error) {
        console.error("WebSocket: Failed to parse incoming message:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket: Connection closed");
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket: Error:", error);
      setIsConnected(false);
    };

    ws.current = socket;
  }, [user, queryClient]);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [user, connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
