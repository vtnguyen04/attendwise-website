
// new-conversation-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import apiClient from '@/lib/api-client';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import Search from 'lucide-react/icons/search';
import Loader2 from 'lucide-react/icons/loader-2';
import UserPlus from 'lucide-react/icons/user-plus';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

async function searchUsers(query: string): Promise<User[]> {
  if (!query) return [];
  const response = await apiClient.get('/api/v1/search/users', { 
    params: { q: query, limit: 10 } 
  });
  return response.data.results.map((r: any) => r.result);
}

async function createConversation(participantId: string): Promise<{ conversation: { id: string } }> {
  const response = await apiClient.post('/api/v1/conversations', {
    type: 'direct',
    participant_ids: [participantId],
  });
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
  const theme = useTheme();

  const { data: users, isLoading } = useQuery({
    queryKey: ['user_search', debouncedSearchTerm],
    queryFn: () => searchUsers(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm,
  });

  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onConversationCreated(data.conversation.id);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-md",
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200'
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            "text-base font-semibold",
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          )}>
            New Message
          </DialogTitle>
          <DialogDescription className={cn(
            "text-[13px]",
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Search for a user to start a conversation
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          )} />
          <Input 
            placeholder="Search for a user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "h-9 pl-9 text-[13px] transition-colors duration-150",
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 placeholder:text-slate-600'
                : 'bg-slate-50 border-slate-200 placeholder:text-slate-400'
            )}
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className={cn(
          "space-y-1 h-64 overflow-y-auto rounded-lg border",
          theme === 'dark'
            ? 'bg-slate-950 border-slate-800'
            : 'bg-slate-50 border-slate-200'
        )}>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className={cn(
                    "h-9 w-9 rounded-full",
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                  )} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className={cn(
                      "h-3 w-24",
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                    )} />
                    <Skeleton className={cn(
                      "h-2.5 w-32",
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                    )} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Results */}
          {users && users.length > 0 && (
            <div className="p-2 space-y-1">
              {users.map(user => (
                <button 
                  key={user.id}
                  onClick={() => createConversationMutation.mutate(user.id)}
                  disabled={createConversationMutation.isPending}
                  className={cn(
                    "flex items-center gap-3 p-2 w-full text-left rounded-lg transition-all duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    theme === 'dark'
                      ? 'hover:bg-slate-900'
                      : 'hover:bg-slate-100'
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profile_picture_url} alt={user.name} />
                    <AvatarFallback className={cn(
                      "text-xs font-medium",
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                    )}>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] font-medium truncate",
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
                    )}>
                      {user.name}
                    </p>
                    {user.email && (
                      <p className={cn(
                        "text-[11px] truncate",
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                      )}>
                        {user.email}
                      </p>
                    )}
                  </div>
                  {createConversationMutation.isPending && (
                    <Loader2 className={cn(
                      "h-4 w-4 animate-spin",
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Results State */}
          {debouncedSearchTerm && !isLoading && users?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className={cn(
                "p-3 rounded-full mb-3",
                theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
              )}>
                <UserPlus className={cn(
                  "h-6 w-6",
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )} />
              </div>
              <p className={cn(
                "text-[13px] font-medium",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                No users found
              </p>
              <p className={cn(
                "text-[11px] mt-1",
                theme === 'dark' ? 'text-slate-600' : 'text-slate-500'
              )}>
                Try a different search term
              </p>
            </div>
          )}

          {/* Empty State */}
          {!debouncedSearchTerm && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className={cn(
                "p-3 rounded-full mb-3",
                theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
              )}>
                <Search className={cn(
                  "h-6 w-6",
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )} />
              </div>
              <p className={cn(
                "text-[13px] font-medium",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Start searching
              </p>
              <p className={cn(
                "text-[11px] mt-1 text-center",
                theme === 'dark' ? 'text-slate-600' : 'text-slate-500'
              )}>
                Enter a name to find users
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}