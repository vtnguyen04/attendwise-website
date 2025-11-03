// message-item.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  File as FileIcon,
  Download,
  ExternalLink,
} from 'lucide-react';
import type { Message, User } from '@/lib/types';
import { getNullableStringValue, getAbsoluteUrl } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  isFirstInGroup: boolean;
}

export function MessageItem({ message, currentUser, isFirstInGroup }: MessageItemProps) {
  console.log("Message in MessageItem:", message);
  const isCurrentUser = message.sender_id === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const updateMutation = useUpdateMessage();
  const deleteMutation = useDeleteMessage();

  const senderName = isCurrentUser
    ? currentUser.name
    : message.author?.name || 'Unknown User';
  const senderAvatar = isCurrentUser
    ? getNullableStringValue(currentUser.profile_picture_url)
    : getNullableStringValue(
        message.author?.profile_picture_url,
        `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`
      );

  const getAttachmentUrl = (objectName: string) => {
    return getAbsoluteUrl(`/api/files/${objectName}`);
  };

  const handleUpdate = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      updateMutation.mutate({
        messageId: message.id,
        content: editContent.trim(),
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

  const handleImageClick = () => {
    window.open(getAttachmentUrl(message.content), '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-2 transition-all duration-200',
        isCurrentUser ? 'justify-end' : 'justify-start',
        !isFirstInGroup && (isCurrentUser ? 'pr-14' : 'pl-14'),
        'hover:bg-muted/30'
      )}
    >
      {/* Left Avatar (for other users) */}
      {!isCurrentUser && isFirstInGroup && (
        <Link href={`/dashboard/profile/${message.sender_id}`} className="flex-shrink-0">
          <Avatar className="h-8 w-8 ring-2 ring-border/30 hover:ring-primary/50 transition-all">
            <AvatarImage src={senderAvatar} alt={senderName} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {senderName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}
      {!isCurrentUser && !isFirstInGroup && <div className="h-8 w-8 flex-shrink-0" />}

      {/* Current User Actions Menu */}
      {isCurrentUser && (
        <div className="flex items-center self-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 liquid-glass-button"
                aria-label="Message actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 glass-card">
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                className="cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
              >
                <Pencil className="h-4 w-4 mr-2" />
                <span className="text-sm">Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span className="text-sm">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg rounded-2xl transition-all duration-200',
          isCurrentUser
            ? 'dashboard-panel-accent shadow-md'
            : 'dashboard-panel shadow-sm'
        )}
      >
        {isEditing ? (
          <div className="p-3 space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input-elevated text-sm min-h-[80px] resize-none"
              autoFocus
              placeholder="Edit your message..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="liquid-glass-button h-8 px-3 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={updateMutation.isPending || !editContent.trim()}
                className="cta-button h-8 px-3 text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            {/* Sender Name for grouped messages */}
            {!message.is_deleted && !isCurrentUser && isFirstInGroup && (
              <p className="text-xs font-semibold text-primary mb-1.5">
                {senderName}
              </p>
            )}

            {/* Image Message */}
            {message.message_type === 'image' && !message.is_deleted ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-colors cursor-pointer group/image">
                  {!imageError ? (
                    <Image
                      src={getAttachmentUrl(message.content)}
                      alt="Attachment"
                      width={300}
                      height={300}
                      className="max-w-full h-auto object-cover"
                      onClick={handleImageClick}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-muted/30">
                      <p className="text-sm text-muted-foreground">Image failed to load</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover/image:opacity-100 transition-opacity" />
                  </div>
                </div>
                <time className="text-[10px] font-medium text-muted-foreground block">
                  {format(new Date(message.created_at), 'HH:mm')}
                </time>
              </div>
            ) : message.message_type === 'file' && !message.is_deleted ? (
              /* File Message */
              <div className="space-y-2">
                <a
                  href={getAttachmentUrl(message.content)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feed-card flex items-center gap-3 p-3 hover:shadow-lg transition-all duration-300 group/file"
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover/file:bg-primary/20 transition-colors">
                    <FileIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover/file:text-primary transition-colors">
                      {message.content.split('/').pop()}
                    </p>
                    <p className="text-xs text-muted-foreground">Click to download</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground group-hover/file:text-primary transition-colors" />
                </a>
                <time className="text-[10px] font-medium text-muted-foreground block">
                  {format(new Date(message.created_at), 'HH:mm')}
                </time>
              </div>
            ) : (
              /* Text Message */
              <div className="space-y-1">
                <p
                  className={cn(
                    'text-sm whitespace-pre-wrap leading-relaxed',
                    message.is_deleted && 'italic opacity-60 text-muted-foreground'
                  )}
                >
                  {message.is_deleted ? 'This message was deleted' : message.content}
                </p>
                <time className="text-[10px] font-medium text-muted-foreground block">
                  {format(new Date(message.created_at), 'HH:mm')}
                </time>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Avatar (for current user) */}
      {isCurrentUser && isFirstInGroup && (
        <Link href={`/dashboard/profile/${currentUser.id}`} className="flex-shrink-0">
          <Avatar className="h-8 w-8 ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
            <AvatarImage src={senderAvatar} alt={senderName} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {senderName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}
      {isCurrentUser && !isFirstInGroup && <div className="h-8 w-8 flex-shrink-0" />}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass-card max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Delete Message
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this message? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="liquid-glass-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="cta-button bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}