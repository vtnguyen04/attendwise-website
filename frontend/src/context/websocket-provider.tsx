'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from './user-provider';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner'; // Assuming sonner is used for toasts
import type { Message } from '@/lib/types'; // Import Message type

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

interface WebSocketContextType {
  isConnected: boolean;
  onlineUsers: { [userId: string]: boolean };
  typingUsers: { [conversationId: string]: { [userId: string]: boolean } };
  sendJsonMessage: (message: object) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: boolean }>({});
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: { [userId: string]: boolean } }>({});
  const pathname = usePathname();

  const sendJsonMessage = useCallback((message: object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Message not sent:", message);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    console.log("WebSocketProvider: Attempting connection...");
    console.log("WebSocketProvider: Token found:", !!token);
    console.log("WebSocketProvider: WS_URL:", WS_URL);

    if (!token || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      console.log("WebSocketProvider: Connection skipped due to missing token or existing open connection.");
      return;
    }

    console.log("WebSocketProvider: Establishing new WebSocket connection...");
    try {
      const socket = new WebSocket(`${WS_URL}?token=${token}`);

      socket.onopen = () => {
        console.log("WebSocket: Connection established");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket: Received message:", data);

          if (data.type === 'new_message' && data.conversation_id && data.message) {
            console.log("WebSocket: Received new message:", data.message);
            console.log("WebSocket: Full message object received:", JSON.stringify(data.message, null, 2));

            // Directly update the messages query cache
            queryClient.setQueryData(['messages', data.conversation_id], (old: { pages: Message[][], pageParams: any[] } | undefined) => {
              if (!old) return { pages: [[data.message]], pageParams: [undefined] };

              const newPages = [...old.pages];
              // Add the new message to the first page
              newPages[0] = [data.message, ...newPages[0]];
              return { ...old, pages: newPages };
            });

            // Invalidate messages query to ensure consistency, but direct update is primary
            queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] });

            if (data.sender_id !== user?.id) {
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }

            const currentConversationPath = `/dashboard/messages/${data.conversation_id}`;
            if (pathname !== currentConversationPath && data.sender_id !== user?.id) {
              toast.info(`New message from ${data.author?.name || 'Someone'}`, {
                description: data.content,
                action: {
                  label: "View",
                  onClick: () => window.location.href = currentConversationPath,
                },
              });
            }
          } else if (data.type === 'user_status' && data.user_id) {
            console.log("WebSocket: Received user_status:", data);
            setOnlineUsers(prev => ({
              ...prev,
              [data.user_id]: data.status === 'online',
            }));
            console.log(`User ${data.user_id} is now ${data.status}`);
          } else if (data.type === 'typing_event' && data.conversation_id && data.user_id) {
            console.log("WebSocket: Received typing_event:", data);
            setTypingUsers(prev => {
              const newConversationTyping = { ...prev[data.conversation_id] };
              if (data.is_typing) {
                newConversationTyping[data.user_id] = true;
              } else {
                delete newConversationTyping[data.user_id];
              }
              return { ...prev, [data.conversation_id]: newConversationTyping };
            });
          } else if (data.type === 'new_comment' && data.comment) {
            const customEvent = new CustomEvent('realtime-comment', { detail: data.comment });
            window.dispatchEvent(customEvent);
          } else if (data.type === 'new_post' && data.post) {
            const customEvent = new CustomEvent('realtime-new-post', { detail: data.post });
            window.dispatchEvent(customEvent);
          } else if (data.type === 'post_updated' && data.post) {
            const customEvent = new CustomEvent('realtime-post-update', { detail: data.post });
            window.dispatchEvent(customEvent);
          } else if (data.type === 'post_deleted' && data.post_id) {
            const customEvent = new CustomEvent('realtime-post-delete', { detail: { id: data.post_id } });
            window.dispatchEvent(customEvent);
          } else if (data.type === 'new_reaction' && data.reaction) {
            const customEvent = new CustomEvent('realtime-reaction', { detail: data.reaction });
            window.dispatchEvent(customEvent);
          }
        } catch (error) {
          console.error("WebSocket: Failed to parse incoming message:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket: Connection closed");
        setIsConnected(false);
        ws.current = null;
      };

      socket.onerror = (error) => {
        console.error("WebSocket: Error:", error);
        setIsConnected(false);
        ws.current = null;
      };

      ws.current = socket;
    } catch (error) {
      console.error("WebSocketProvider: Error creating WebSocket:", error);
      setTimeout(() => setIsConnected(false), 0); // Defer setState to avoid cascading renders
      ws.current = null;
    }

    return () => {
      if (ws.current) {
        console.log("WebSocketProvider: Cleaning up WebSocket connection.");
        ws.current.close();
        ws.current = null;
      }
    };
  }, [queryClient, pathname, user?.id]);

  return (
    <WebSocketContext.Provider value={{ isConnected, onlineUsers, typingUsers, sendJsonMessage }}>
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