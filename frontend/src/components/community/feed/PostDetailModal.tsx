'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, File, MessageCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Post, Comment } from '@/lib/types';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { MarkdownPreview } from '@/components/ui/markdown-preview';
import { useUser } from '@/context/user-provider';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-translation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CommentInput } from './CommentInput';
import { Textarea } from '@/components/ui/textarea';

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const CommentCard = React.memo(({ 
  comment, 
  onCommentDeleted, 
  onCommentUpdated 
}: { 
  comment: Comment;
  onCommentDeleted: (commentId: string) => void;
  onCommentUpdated: (updatedComment: Comment) => void;
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation('post_detail');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const isAuthor = user?.id === comment.author?.id;

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/comments/${comment.id}`);
      onCommentDeleted(comment.id);
      toast({ title: t('success'), description: t('comment_deleted') });
    } catch {
      toast({ title: t('error'), description: t('delete_failed'), variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await apiClient.patch(`/comments/${comment.id}`, { content: editedContent });
      onCommentUpdated(response.data.comment);
      setIsEditing(false);
      toast({ title: t('success'), description: t('comment_updated') });
    } catch {
      toast({ title: t('error'), description: t('update_failed'), variant: 'destructive' });
    }
  };

  return (
    <div className="group py-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={comment.author?.profile_picture_url?.String} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {comment.author?.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground">
                {comment.author?.name}
              </p>
              {isAuthor && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={() => setIsEditing(true)} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => setIsDeleteDialogOpen(true)} 
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <Textarea 
                  value={editedContent} 
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="text-sm bg-background"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate} className="h-8">
                    {t('save')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-8">
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownPreview content={comment.content} />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-4">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export function PostDetailModal({ post, isOpen, onOpenChange }: PostDetailModalProps) {
  const { user } = useUser();
  const { t } = useTranslation('post_detail');
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    staleTime: 0,
    queryKey: ['comments', post?.id],
    queryFn: () => apiClient.get(`/posts/${post.id}/comments`).then(res => res.data.comments || []),

    enabled: isOpen && !!post?.id,
  });



  const handleCommentDeleted = (commentId: string) => {
    queryClient.setQueryData<Comment[]>(['comments', post?.id], (oldData) => {
      if (!oldData) return [];
      return oldData.filter(c => c.id !== commentId);
    });
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    queryClient.setQueryData<Comment[]>(['comments', post?.id], (oldData) => {
      if (!oldData) return [];
      return oldData.map(c => c.id === updatedComment.id ? updatedComment : c);
    });
  };

  const handleCommentPosted = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
  };

  const rawAttachments =
    post?.file_attachments ||
    ((post as { fileAttachments?: Post['file_attachments'] })?.fileAttachments) ||
    [];

  const rawMediaUrls =
    post?.media_urls ||
    ((post as { mediaUrls?: Post['media_urls'] })?.mediaUrls) ||
    [];

  const imageSourceMap = new Map<
    string,
    {
      url: string;
      name: string;
      type: string;
    }
  >();

  rawAttachments.forEach((attachment) => {
    const url = (attachment?.Url || attachment?.url || '').trim();
    if (!url) return;

    const type = (attachment?.Type || attachment?.type || '').trim();
    const name = attachment?.Name || attachment?.name || url;

    if (type.toLowerCase().startsWith('image/')) {
      imageSourceMap.set(url, { url, name, type });
    }
  });

  rawMediaUrls.forEach((rawUrl) => {
    const url = rawUrl?.trim();
    if (!url || imageSourceMap.has(url)) {
      return;
    }
    const fallbackName = url.split(/[/?#]/).filter(Boolean).pop() || 'Image';
    imageSourceMap.set(url, { url, name: fallbackName, type: 'image/unknown' });
  });

  const imageSources = Array.from(imageSourceMap.values());

  const fileAttachments = rawAttachments.filter((attachment) => {
    const url = (attachment?.Url || attachment?.url || '').trim();
    if (!url) return false;
    const type = (attachment?.Type || attachment?.type || '').trim().toLowerCase();
    return !type.startsWith('image/');
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={post?.author?.profile_picture_url.String} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {post?.author?.name ? post.author.name.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-base font-bold text-foreground">
                {post?.author?.name || t('loading')}
              </DialogTitle>
              {post && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            {t('dialog_description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !post ? (
          <div className="flex-1 flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-5">
                <div className="prose prose-base dark:prose-invert max-w-none text-foreground">
                  <MarkdownPreview
                    content={post.content}
                    remarkPlugins={[]}
                    rehypePlugins={[]}
                    components={{
                      table: ({children, ...props}: {children: React.ReactNode}) => {
                        return (
                          <div className="overflow-x-auto rounded-lg border border-border/50">
                            <table {...props as any} className="w-full">{children}</table>
                          </div>
                        );
                      }
                    }}
                  />
                </div>

                {(imageSources.length > 0 || fileAttachments.length > 0) && (
                  <div className="space-y-4">
                    {imageSources.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {imageSources.map(({ url, name }, index) => (
                          <div
                            key={`${url}-${index}`}
                            className="relative aspect-video overflow-hidden rounded-xl bg-muted group cursor-pointer"
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                              <img
                                src={url}
                                alt={name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {fileAttachments.length > 0 && (
                      <div className="space-y-2">
                        {fileAttachments.map((attachment, index) => {
                          const url = (attachment?.Url || attachment?.url || '').trim();
                          if (!url) return null;
                          const name = attachment?.Name || attachment?.name || url || `attachment-${index + 1}`;
                          const type = (attachment?.Type || attachment?.type || '').trim() || 'File';

                          return (
                            <a
                              key={`${url}-${index}`}
                              href={url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                            >
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <File className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{name}</p>
                                <p className="text-xs text-muted-foreground">{type}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {t('comments')}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {comments.length}
                    </Badge>
                  </div>
                  
                  {comments.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('no_comments')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {comments.map(comment => (
                        <CommentCard 
                          key={comment.id} 
                          comment={comment} 
                          onCommentDeleted={handleCommentDeleted} 
                          onCommentUpdated={handleCommentUpdated}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {user && (
              <CommentInput postId={post.id} onCommentPosted={handleCommentPosted} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
