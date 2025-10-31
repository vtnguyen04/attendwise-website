// message-view.tsx
'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getConversationDetails, getMessages } from '@/lib/services/messaging.service';
import { useSendMessage } from '@/hooks/use-messaging';
import type { Conversation } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageComposer } from './message-composer';
import { useUser } from '@/context/user-provider';
import { MessageViewHeader } from './message-view-header';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import AlertCircle from 'lucide-react/icons/alert-circle';

interface MessageViewProps {
  conversationId: string;
}

export function MessageView({ conversationId }: MessageViewProps) {
  const { user: currentUser, isLoading: isLoadingUser } = useUser();
  const theme = useTheme();
  
  const sendMessageMutation = useSendMessage();

  const { 
    data: conversation, 
    isLoading: isLoadingConversation,
    isError: isConversationError 
  } = useQuery<Conversation | null>({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversationDetails(conversationId),
    enabled: !!conversationId,
  });

  const { 
    data: paginatedMessages, 
    isLoading: isLoadingMessages, 
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: getMessages,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined;
      return allPages.reduce((acc, page) => acc + page.length, 0);
    },
  });

  const messages = paginatedMessages?.pages.flat().reverse() || [];

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate({ conversationId, content });
  };

  const isLoading = isLoadingUser || isLoadingConversation;

  // Loading State
  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col h-full",
        theme === 'dark' ? 'bg-slate-950' : 'bg-white'
      )}>
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
        )}>
          <div className="flex items-center gap-3">
            <Skeleton className={cn(
              "h-9 w-9 rounded-full",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
            <div className="space-y-1.5">
              <Skeleton className={cn(
                "h-4 w-32",
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
              )} />
              <Skeleton className={cn(
                "h-3 w-20",
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
              )} />
            </div>
          </div>
        </div>
        
        <div className={cn(
          "flex-1 flex items-center justify-center",
          theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
        )}>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className={cn(
                  "h-7 w-7 rounded-full",
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                )} />
                <Skeleton className={cn(
                  "h-12 w-64 rounded-lg",
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                )} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not Logged In State
  if (!currentUser) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      )}>
        <div className="text-center space-y-2">
          <div className={cn(
            "inline-flex p-3 rounded-full mb-2",
            theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
          )}>
            <AlertCircle className={cn(
              "h-6 w-6",
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            )} />
          </div>
          <p className={cn(
            "text-sm font-medium",
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Please log in to view messages
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (isConversationError || !conversation) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      )}>
        <div className="text-center space-y-2">
          <div className={cn(
            "inline-flex p-3 rounded-full mb-2",
            theme === 'dark' ? 'bg-red-950/30' : 'bg-red-50'
          )}>
            <AlertCircle className={cn(
              "h-6 w-6",
              theme === 'dark' ? 'text-red-400' : 'text-red-600'
            )} />
          </div>
          <p className={cn(
            "text-sm font-medium",
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          )}>
            Failed to load conversation
          </p>
          <p className={cn(
            "text-xs",
            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
          )}>
            Please try again later
          </p>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className={cn(
      "flex flex-col h-full",
      theme === 'dark' ? 'bg-slate-950' : 'bg-white'
    )}>
      <MessageViewHeader conversation={conversation} />
      <MessageList 
        messages={messages} 
        currentUser={currentUser} 
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
      <MessageComposer 
        onSendMessage={handleSendMessage} 
        isLoading={sendMessageMutation.isPending} 
      />
    </div>
  );
}
