
// message-item.tsx
'use client';

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUpdateMessage, useDeleteMessage } from '@/hooks/use-messaging';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Pencil from 'lucide-react/icons/pencil';
import Trash2 from 'lucide-react/icons/trash-2';
import Check from 'lucide-react/icons/check';
import X from 'lucide-react/icons/x';
import type { Message, User } from "@/lib/types";
import { format } from 'date-fns';
import { useTheme } from '@/hooks/use-theme';

interface MessageItemProps {
  message: Message;
  currentUser: User;
}

import { getNullableStringValue } from '@/lib/utils';

export function MessageItem({ message, currentUser }: MessageItemProps) {
  const isCurrentUser = message.sender_id === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const theme = useTheme();

  const updateMutation = useUpdateMessage();
  const deleteMutation = useDeleteMessage();

  const senderName = isCurrentUser 
    ? currentUser.name 
    : (message.author?.name || 'Unknown User');
  const senderAvatar = isCurrentUser 
    ? getNullableStringValue(currentUser.profile_picture_url) 
    : getNullableStringValue(message.author?.profile_picture_url, `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`);

  const handleUpdate = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      updateMutation.mutate({ 
        messageId: message.id, 
        content: editContent.trim() 
      });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate(message.id);
    setIsDeleteDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={cn(
      "group flex items-start gap-2 px-3 py-1.5 transition-colors duration-150",
      isCurrentUser ? "justify-end" : "justify-start",
      theme === 'dark' 
        ? "hover:bg-slate-900/30" 
        : "hover:bg-slate-50/50"
    )}>
      {!isCurrentUser && (
        <Avatar className="h-7 w-7 mt-0.5 flex-shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className={cn(
            "text-[10px] font-medium",
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
          )}>
            {senderName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}

      {isCurrentUser && (
        <div className="flex items-center self-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-6 w-6",
                  theme === 'dark'
                    ? 'hover:bg-slate-800 text-slate-500'
                    : 'hover:bg-slate-100 text-slate-400'
                )}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn(
              "min-w-[140px]",
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            )}>
              <DropdownMenuItem 
                onClick={() => setIsEditing(true)}
                className={cn(
                  "text-[13px]",
                  theme === 'dark' 
                    ? 'focus:bg-slate-800' 
                    : 'focus:bg-slate-100'
                )}
              >
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className={cn(
                  "text-[13px]",
                  theme === 'dark'
                    ? 'text-red-400 focus:bg-red-950/30'
                    : 'text-red-600 focus:bg-red-50'
                )}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className={cn(
        "max-w-xs md:max-w-md lg:max-w-lg rounded-lg transition-colors duration-200",
        isCurrentUser 
          ? theme === 'dark'
            ? "bg-slate-800 text-slate-100"
            : "bg-slate-900 text-white"
          : theme === 'dark'
            ? "bg-slate-900 text-slate-100"
            : "bg-slate-100 text-slate-900"
      )}>
        {isEditing ? (
          <div className="p-2 space-y-2">
            <Textarea 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)}
              className={cn(
                "text-[13px] min-h-[60px] resize-none",
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              )}
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelEdit}
                className={cn(
                  "h-7 px-2 text-[12px]",
                  theme === 'dark'
                    ? 'hover:bg-slate-800'
                    : 'hover:bg-slate-200'
                )}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleUpdate} 
                disabled={updateMutation.isPending || !editContent.trim()}
                className={cn(
                  "h-7 px-2 text-[12px]",
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                )}
              >
                <Check className="h-3 w-3 mr-1" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2">
            {!message.is_deleted && !isCurrentUser && (
              <p className={cn(
                "text-[11px] font-medium mb-0.5",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                {senderName}
              </p>
            )}
            <p className={cn(
              "text-[13px] whitespace-pre-wrap leading-relaxed",
              message.is_deleted && "italic opacity-60"
            )}>
              {message.is_deleted ? 'This message was deleted' : message.content}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <time className={cn(
                "text-[10px] font-medium",
                isCurrentUser
                  ? theme === 'dark' ? 'text-slate-400' : 'text-slate-300'
                  : theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
              )}>
                {format(new Date(message.created_at), 'HH:mm')}
              </time>
              {message.is_edited && (
                <span className={cn(
                  "text-[10px] font-medium",
                  isCurrentUser
                    ? theme === 'dark' ? 'text-slate-400' : 'text-slate-300'
                    : theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                )}>
                  • edited
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {isCurrentUser && (
        <Avatar className="h-7 w-7 mt-0.5 flex-shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className={cn(
            "text-[10px] font-medium",
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
          )}>
            {senderName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={cn(
          theme === 'dark' 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white border-slate-200'
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className={cn(
              "text-base",
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            )}>
              Delete Message
            </AlertDialogTitle>
            <AlertDialogDescription className={cn(
              "text-[13px]",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              Are you sure you want to permanently delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={cn(
              "text-[13px]",
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            )}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteMutation.isPending}
              className={cn(
                "text-[13px]",
                theme === 'dark'
                  ? 'bg-red-900 hover:bg-red-800 text-red-100'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
