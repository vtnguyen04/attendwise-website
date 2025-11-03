
// new-conversation-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import apiClient from '@/lib/api-client';
import type { User, Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import Search from 'lucide-react/icons/search';
import Loader2 from 'lucide-react/icons/loader-2';
import UserPlus from 'lucide-react/icons/user-plus';
import Users from 'lucide-react/icons/users';
import Check from 'lucide-react/icons/check';
import X from 'lucide-react/icons/x';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import { getConversations } from '@/lib/services/messaging.service';
import { Button } from '@/components/ui/button';

type ConversationMode = 'direct' | 'group';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

async function searchUsers(query: string): Promise<User[]> {
  if (!query) return [];
  const response = await apiClient.get('/search/users', { 
    params: { q: query, limit: 10 } 
  });
  return response.data.results.map((r: { result: User }) => r.result);
}

async function createConversation(payload: { type: ConversationMode; participant_ids: string[]; name?: string }): Promise<{ conversation: { id: string } }> {
  const response = await apiClient.post('/conversations', payload);
  return response.data;
}

export function NewConversationDialog({ 
  open, 
  onOpenChange, 
  onConversationCreated 
}: NewConversationDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();
  const { user: currentUser } = useUser();
  const [mode, setMode] = useState<ConversationMode>('direct');
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const { t } = useTranslation('messenger');

  const { data: users, isLoading } = useQuery({
    queryKey: ['user_search', debouncedSearchTerm],
    queryFn: () => searchUsers(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm,
  });

  const { data: existingConversations } = useQuery<Conversation[]>({ 
    queryKey: ['conversations'], 
    queryFn: getConversations,
    enabled: open, // Only fetch when dialog is open
  });

  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onConversationCreated(data.conversation.id);
      onOpenChange(false);
      setMode('direct'); // Reset mode
      setSelectedParticipants([]); // Clear selected participants
      setGroupName(''); // Clear group name
    },
  });

  const handleUserSelect = (selectedUser: User) => {
    if (!currentUser || createConversationMutation.isPending) return;

    if (mode === 'direct') {
      // Check if a direct conversation already exists with this user
      const existingDirectConversation = existingConversations?.find(convo => 
        convo.type === 'direct' && 
        convo.participants.some(p => p.user_id === selectedUser.id) &&
        convo.participants.some(p => p.user_id === currentUser.id)
      );

      if (existingDirectConversation) {
        onConversationCreated(existingDirectConversation.id);
        onOpenChange(false);
      } else {
        createConversationMutation.mutate({ type: 'direct', participant_ids: [selectedUser.id] });
      }
    } else { // Group mode
      setSelectedParticipants(prev => {
        if (prev.some(p => p.id === selectedUser.id)) {
          return prev.filter(p => p.id !== selectedUser.id);
        } else {
          return [...prev, selectedUser];
        }
      });
    }
  };

  const handleCreateGroup = () => {
    if (!currentUser || selectedParticipants.length === 0 || !groupName.trim()) return;

    const participantIds = selectedParticipants.map(p => p.id);
    createConversationMutation.mutate({ type: 'group', participant_ids: participantIds, name: groupName.trim() });
  };

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSearchTerm('');
        setSelectedParticipants([]);
        setGroupName('');
        setMode('direct');
      }, 0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[1190] bg-background/80 backdrop-blur"
        className="z-[1200] w-full max-w-md space-y-5 rounded-3xl border border-border/60 bg-background/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {mode === 'direct' ? t('newConversation.directTitle') : t('newConversation.groupTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === 'direct' ? t('newConversation.directDescription') : t('newConversation.groupDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={mode === 'direct' ? 'default' : 'ghost'}
            onClick={() => setMode('direct')}
            className={cn(
              "flex-1 justify-center gap-2 rounded-xl border border-transparent transition-colors",
              mode === 'direct'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-border/60'
            )}
          >
            <UserPlus className="h-4 w-4" />
            {t('newConversation.directLabel')}
          </Button>
          <Button
            variant={mode === 'group' ? 'default' : 'ghost'}
            onClick={() => setMode('group')}
            className={cn(
              "flex-1 justify-center gap-2 rounded-xl border border-transparent transition-colors",
              mode === 'group'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-border/60'
            )}
          >
            <Users className="h-4 w-4" />
            {t('newConversation.groupLabel')}
          </Button>
        </div>

        {mode === 'group' && (
          <div className="space-y-2">
            <Input
              placeholder={t('newConversation.groupNamePlaceholder')}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-10 text-sm liquid-glass-input"
            />
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((participant) => (
                  <span
                    key={participant.id}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  >
                    {participant.name}
                    <X
                      className="h-3 w-3 cursor-pointer text-primary/70 hover:text-primary"
                      onClick={() =>
                        setSelectedParticipants((prev) =>
                          prev.filter((user) => user.id !== participant.id)
                        )
                      }
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('newConversation.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-10 text-sm liquid-glass-input"
            autoFocus
          />
        </div>

        <div className="h-64 overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-2 backdrop-blur-sm">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl bg-background/60 p-2">
                  <Skeleton className="h-9 w-9 rounded-full bg-muted/60" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24 bg-muted/60" />
                    <Skeleton className="h-2.5 w-32 bg-muted/50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {users && users.length > 0 && (
            <div className="space-y-1">
              {users.map((user) => {
                const isSelected = mode === 'group' && selectedParticipants.some((participant) => participant.id === user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserSelect(user)}
                    disabled={createConversationMutation.isPending}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      isSelected ? 'border-primary/40 bg-primary/10 text-primary' : 'hover:bg-muted/60'
                    )}
                  >
                    <Link href={`/dashboard/profile/${user.id}`} onClick={(event) => event.stopPropagation()}>
                      <Avatar className="h-9 w-9 border border-border/60">
                        <AvatarImage src={user.profile_picture_url} alt={user.name} />
                        <AvatarFallback className="bg-muted text-xs font-medium">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      {user.email && (
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    {mode === 'group' && isSelected && <Check className="h-4 w-4 text-primary" />}
                    {createConversationMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          )}

          {debouncedSearchTerm && !isLoading && users?.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <UserPlus className="h-6 w-6 text-muted-foreground/70" />
              <p className="font-medium text-foreground/80">{t('newConversation.noResultsTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('newConversation.noResultsDescription')}</p>
            </div>
          )}

          {!debouncedSearchTerm && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Search className="h-6 w-6 text-muted-foreground/70" />
              <p className="font-medium text-foreground/80">{t('newConversation.startSearchingTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('newConversation.startSearchingSubtitle')}</p>
            </div>
          )}
        </div>

        {mode === 'group' && (
          <DialogFooter className="pt-2">
            <Button
              onClick={handleCreateGroup}
              disabled={selectedParticipants.length === 0 || !groupName.trim() || createConversationMutation.isPending}
              className="w-full"
            >
              {createConversationMutation.isPending ? t('newConversation.creatingGroup') : t('newConversation.createGroup')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
