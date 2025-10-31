'use client';

import { useQuery } from '@tanstack/react-query';
import { getMessages } from '@/lib/services/messaging.service';
import type { Message, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageItem } from './message-item';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import Loader2 from 'lucide-react/icons/loader-2';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}

// ... (Skeleton component remains the same)

export function MessageList({ messages, currentUser, fetchNextPage, hasNextPage, isFetchingNextPage }: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtTop, setIsAtTop] = useState(false);

    // Scroll to bottom when new messages are added, but only if the user is near the bottom.
    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // If user is near the bottom, auto-scroll. 100px threshold.
            if (scrollHeight - scrollTop - clientHeight < 100) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages]);

    const handleScroll = () => {
        if (scrollRef.current) {
            setIsAtTop(scrollRef.current.scrollTop === 0);
        }
    };

    return (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 p-4 space-y-4 overflow-y-auto flex flex-col-reverse">
            <div className="space-y-4">
                {messages.length > 0 ? (
                    messages.map(msg => (
                        <MessageItem 
                            key={msg.id}
                            message={msg}
                            currentUser={currentUser}
                        />
                    ))
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                )}
            </div>
            {hasNextPage && (
                <div className="text-center">
                    <Button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        variant="outline"
                        size="sm"
                    >
                        {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
}
