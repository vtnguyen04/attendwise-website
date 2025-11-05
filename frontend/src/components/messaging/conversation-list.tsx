
// conversation-list.tsx
'use client';

import { useState} from 'react';
import { useQuery } from '@tanstack/react-query';
import { getConversations } from '@/lib/services/messaging.service';
import type { Conversation } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Search } from 'lucide-react';
import { NewConversationDialog } from './new-conversation-dialog';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { getNullableStringValue } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useUser } from '@/context/user-provider';
import Link from 'next/link';
import { useChatWebSocket } from "@/hooks/use-chat-websocket";

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onlineUsers: { [userId: string]: boolean };
}

const ConversationListItem = ({
  conversation,
  isSelected,
  onSelect,
  onlineUsers
}: ConversationListItemProps) => {
  const { t } = useTranslation('messenger');
  const { user: currentUser } = useUser();

  console.log("ConversationListItem - conversation:", conversation);
  console.log("ConversationListItem - conversation.participants:", conversation.participants);
  console.log("ConversationListItem - currentUser:", currentUser);
  console.log("ConversationListItem - onlineUsers:", onlineUsers);

  const otherParticipant = conversation.participants?.find(
    (p) => p.user_id !== currentUser?.id
  );
  const otherUserId = otherParticipant?.user_id || "";

  console.log("ConversationListItem - otherParticipant:", otherParticipant);
  console.log("ConversationListItem - otherUserId:", otherUserId);

  const displayName = conversation.name || t('conversation');
  const displayAvatar = getNullableStringValue(conversation.avatar_url, `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`);

  return (
    <motion.button 
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 p-2.5 w-full text-left rounded-lg transition-all duration-150 glass-interactive",
        isSelected && "bg-muted/80"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative">
        {conversation.type === "direct" && otherUserId ? (
          <Link href={`/dashboard/profile/${otherUserId}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-10 w-10 border-2 border-border/50">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="text-xs font-medium bg-muted/50">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {onlineUsers[otherUserId] && (
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                  "bg-emerald-500"
                )}
              />
            )}
          </Link>
        ) : (
          <Avatar className="h-10 w-10 border-2 border-border/50">
            <AvatarImage src={displayAvatar} alt={displayName} />
            <AvatarFallback className="text-xs font-medium bg-muted/50">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        {conversation.unread_count > 0 && (
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground shadow-md">
            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 mb-0.5">
          <p className="font-medium truncate text-sm text-foreground flex-1 min-w-0">
            {displayName}
          </p>
          {conversation.last_message_at && (
            <time className="text-xs font-medium whitespace-nowrap text-muted-foreground hidden lg:block">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
            </time>
          )}
        </div>
        <p className={cn(
          "text-xs truncate text-muted-foreground"
        )}>
          {conversation.last_message || t('noMessagesYet')}
        </p>
        {conversation.last_message_at && (
          <time className="text-[11px] font-medium text-muted-foreground/80 lg:hidden block mt-0.5">
            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
          </time>
        )}
      </div>
    </motion.button>
  );
}

const ConversationListSkeleton = () => (
  <div className="space-y-1 p-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2.5 glass-interactive rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full bg-muted/50" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4 bg-muted/50" />
          <Skeleton className="h-3 w-full bg-muted/50" />
        </div>
      </div>
    ))}
  </div>
)

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({ selectedConversationId, onSelectConversation }: ConversationListProps) {
  const { data: conversations, isLoading, isError } = useQuery<Conversation[]>({ 
    queryKey: ['conversations'], 
    queryFn: getConversations 
  });

  const { onlineUsers } = useChatWebSocket();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation('messenger');

  const filteredConversations = conversations?.filter(convo => 
    convo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    convo.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <ConversationListSkeleton />;
  
  if (isError) return (
    <div className="p-4 h-full flex items-center justify-center">
      <p className="text-sm text-center text-destructive">
        {t('failedToLoad')}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="p-3 border-b border-border/50 space-y-2">
        <Button 
          variant="outline" 
          className="w-full h-9 text-sm font-medium liquid-glass-button"
          onClick={() => setIsDialogOpen(true)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {t('newMessage')}
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm bg-transparent border-border/50"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map(convo => (
            <ConversationListItem 
              key={convo.id}
              conversation={convo}
              isSelected={selectedConversationId === convo.id}
              onSelect={() => onSelectConversation(convo.id)}
              onlineUsers={onlineUsers}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <p className="text-sm text-center text-muted-foreground">
              {searchQuery ? t('noConversationsFound') : t('noConversationsYet')}
            </p>
          </div>
        )}
      </div>

      <NewConversationDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConversationCreated={onSelectConversation}
      />
    </div>
  );
}
