// ./src/components/messaging/message-view.tsx

'use client';

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getConversationDetails, getMessages } from '@/lib/services/messaging.service';
import { useSendMessage, useMarkConversationAsRead } from '@/hooks/use-messaging';
import type { Conversation } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageComposer } from './message-composer';
import { useUser } from '@/context/user-provider';
import { MessageViewHeader } from './message-view-header';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import AlertCircle from 'lucide-react/icons/alert-circle';
import { useTranslation } from '@/hooks/use-translation';

interface MessageViewProps {
  conversationId: string;
}

export function MessageView({ conversationId }: MessageViewProps) {
  const { user: currentUser, isLoading: isLoadingUser } = useUser();
  const theme = useTheme();
  const { t } = useTranslation('messenger');
  const queryClient = useQueryClient();
  console.log("QueryClient instance from MessageView:", queryClient);

  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkConversationAsRead();
  const hasMarkedAsReadRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversationId && hasMarkedAsReadRef.current !== conversationId) {
      markAsReadMutation.mutate(conversationId);
      hasMarkedAsReadRef.current = conversationId;
    }
  }, [conversationId, markAsReadMutation]);

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
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    // ✅ ĐÃ SỬA LỖI: Truyền trực tiếp hàm getMessages
    queryFn: getMessages,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined;
      return allPages.flat().length;
    },
  });

  console.log("Infinite query state:", { hasNextPage, isFetchingNextPage });

  const messages = paginatedMessages?.pages.flat() || [];

  const handleSendMessage = (content: string, messageType?: "text" | "image" | "file") => {
    if (!content.trim()) return;
    sendMessageMutation.mutate({ conversationId, content, messageType, author: currentUser });
  };

  const isLoading = isLoadingUser || isLoadingConversation;

  // Trạng thái tải ban đầu
  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col h-full",
        "bg-transparent"
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
          "bg-transparent"
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

  // Trạng thái chưa đăng nhập
  if (!currentUser) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        "bg-transparent"
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
            {t('pleaseLogIn')}
          </p>
        </div>
      </div>
    );
  }

  // Trạng thái lỗi
  if (isConversationError || !conversation) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        "bg-transparent"
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
            {t('failedToLoadConversation')}
          </p>
          <p className={cn(
            "text-xs",
            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
          )}>
            {t('pleaseTryAgain')}
          </p>
        </div>
      </div>
    );
  }

  // Trạng thái thành công
  return (
    <div className={cn(
      "flex flex-col h-full",
      "bg-transparent"
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
        conversationId={conversationId}
      />
    </div>
  );
}