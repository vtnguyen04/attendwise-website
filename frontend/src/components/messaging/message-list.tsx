// ./src/components/messaging/message-list.tsx

'use client';

// Đã xóa các import không cần thiết: useQuery, getMessages, Skeleton
import { useEffect, useRef } from 'react';
import type { Message, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Loader2 from 'lucide-react/icons/loader-2';
import { MessageItem } from './message-item';


interface MessageListProps {
  // Đã xóa prop 'conversationId' không cần thiết
  messages: Message[];
  currentUser: User;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}

export function MessageList({ messages, currentUser, fetchNextPage, hasNextPage, isFetchingNextPage }: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef(0);

    // Auto-scroll to bottom on initial load
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []); // Chỉ chạy một lần khi component được mount

    // Auto-scroll when new messages arrive from the current user or user is near the bottom
    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const lastMessage = messages[messages.length - 1];

            if (lastMessage?.sender_id === currentUser.id || (scrollHeight - scrollTop - clientHeight < 100)) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages, currentUser.id]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      console.log("Scrolling:", { scrollTop, hasNextPage, isFetchingNextPage });
      if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

    // Adjust scroll position to maintain view when new messages are loaded at the top
    useEffect(() => {
        if (scrollRef.current && isFetchingNextPage) {
            const currentScrollHeight = scrollRef.current.scrollHeight;
            const heightDifference = currentScrollHeight - prevScrollHeight.current;
            if (heightDifference > 0) { // Ensure scroll only adjusts when height actually increases
                scrollRef.current.scrollTop += heightDifference;
            }
        }
        if (!isFetchingNextPage && scrollRef.current) {
             prevScrollHeight.current = scrollRef.current.scrollHeight;
        }
    }, [isFetchingNextPage, messages]);


    return (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 p-4 space-y-4 overflow-y-auto flex flex-col-reverse">
            {isFetchingNextPage && (
                <div className="text-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
            )}
            <div className="space-y-4">
                {messages.length > 0 ? (
                    messages.slice().reverse().map((msg, index) => {
                        const previousMessage = messages[index + 1];
                        const isSameSenderAsPrevious = previousMessage && msg.sender_id === previousMessage.sender_id;
                        const isFirstInGroup = !isSameSenderAsPrevious;

                        return (
                            <MessageItem
                                key={msg.id}
                                message={msg}
                                currentUser={currentUser}
                                isFirstInGroup={isFirstInGroup}
                            />
                        );
                    })
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                )}
            </div>
             {/* This part seems redundant if you already have infinite scroll on top, but keeping as per original logic */}
            {hasNextPage && !isFetchingNextPage && (
                <div className="text-center py-2">
                    <Button
                        onClick={() => fetchNextPage()}
                        variant="outline"
                        size="sm"
                    >
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
}