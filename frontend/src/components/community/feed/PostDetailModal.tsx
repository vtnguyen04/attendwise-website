'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Loader2 from 'lucide-react/icons/loader-2';
import Send from 'lucide-react/icons/send';
import File from 'lucide-react/icons/file';
import MessageCircle from 'lucide-react/icons/message-circle';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Edit from 'lucide-react/icons/edit';
import Trash2 from 'lucide-react/icons/trash-2';

const FileIcon = File;
import { Post, Comment } from '@/lib/types';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { MarkdownPreview } from '@/components/ui/markdown-preview';
import Image from 'next/image';
import { useUser } from '@/context/user-provider';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const CommentCard = ({ comment, onCommentDeleted, onCommentUpdated }: { comment: Comment, onCommentDeleted: (commentId: string) => void, onCommentUpdated: (updatedComment: Comment) => void }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const isAuthor = user?.id === comment.author?.id;

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/api/v1/comments/${comment.id}`);
      onCommentDeleted(comment.id);
      toast({ title: 'Success', description: 'Comment deleted successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete comment.', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await apiClient.patch(`/api/v1/comments/${comment.id}`, { content: editedContent });
      onCommentUpdated(response.data.comment);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Comment updated successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update comment.', variant: 'destructive' });
    }
  };

  return (
    <div className="py-4 px-3 -mx-3 rounded-lg transition-colors hover:bg-glass-interactive">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author?.profile_picture_url?.String} />
          <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            {comment.author?.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {comment.author?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </p>
          </div>
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdate}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none mt-2 text-gray-700 dark:text-gray-300">
              <MarkdownPreview content={comment.content} />
            </div>
          )}
        </div>
        {isAuthor && !isEditing && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="liquid-glass-button">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-background rounded-lg shadow-lg z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="liquid-glass-button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 liquid-glass-button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export function PostDetailModal({ post, isOpen, onOpenChange }: PostDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    if (!post?.id) return;
    setIsLoading(true);
    try {
      const commentsRes = await apiClient.get(`/api/v1/posts/${post.id}/comments`);
      setComments(commentsRes.data.comments || []);
    } catch (error) {
      console.error("Failed to fetch post comments", error);
      toast({ title: 'Error', description: 'Could not load comments for this post.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [post?.id, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !post?.id) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/api/v1/posts/${post.id}/comments`, { content: newComment });
      setComments(prev => [response.data.comment, ...prev]);
      setNewComment('');
      toast({ title: 'Success', description: 'Your comment has been posted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not post your comment.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(prev => prev.map(c => c.id === updatedComment.id ? updatedComment : c));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background max-w-3xl h-[90vh] flex flex-col p-0 rounded-lg shadow-lg z-50">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground">
            {post?.author?.name ? `${post.author.name}'s Post` : 'Loading Post...'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed view of a community post with comments.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !post ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Post Content */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-6">
                {/* Post Header */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.profile_picture_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {post.author?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {post.author?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                <div className="prose prose-base dark:prose-invert max-w-none text-foreground">
                  <MarkdownPreview
                    content={post.content}
                    remarkPlugins={[]}
                    rehypePlugins={[]}
                    components={{
                      table: ({node, children, ...props}) => {
                        const { ref, ...restProps } = props;
                        return (
                          <div className="overflow-x-auto rounded-lg border border-border/50">
                            <table {...restProps} className="w-full">{children}</table>
                          </div>
                        );
                      }
                    }}
                  />
                </div>

                {/* Media Attachments */}
                {post.file_attachments && post.file_attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {post.file_attachments.map((attachment, index) => {
                      const type = attachment?.Type || attachment?.type || '';
                      const url = attachment?.Url || attachment?.url || '';
                      const name =
                        attachment?.Name || attachment?.name || url || `attachment-${index + 1}`;
                      const isImage = type.startsWith('image/');

                      if (!url) return null;

                      return (
                        <div 
                          key={`${url}-${index}`} 
                          className="bg-glass-interactive relative aspect-video overflow-hidden hover:border-primary/50 transition-colors"
                        >
                          {isImage ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                              <Image 
                                src={url} 
                                alt={name} 
                                layout="fill" 
                                className="object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </a>
                          ) : (
                            <a 
                              href={url} 
                              download 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-full w-full flex flex-col items-center justify-center p-4 space-y-3 transition-colors"
                            >
                              <div className="p-3 bg-primary/10 rounded-lg">
                                <FileIcon className="h-6 w-6 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-muted-foreground text-center break-all">
                                {name}
                              </span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Divider */}
                <Separator className="bg-border/50" />

                {/* Comments Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-bold text-foreground">
                      Comments ({comments.length})
                    </h3>
                  </div>
                  
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    <div className="space-y-2 -mx-3">
                      {comments.map(comment => (
                        <CommentCard key={comment.id} comment={comment} onCommentDeleted={handleCommentDeleted} onCommentUpdated={handleCommentUpdated} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="px-6 py-4 border-t border-border/50 flex-shrink-0">
              <div className="flex gap-3 items-end">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="liquid-glass-input"
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={isSubmitting || !newComment.trim()} 
                  size="icon"
                  className="h-10 w-10 flex-shrink-0 liquid-glass-button"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
