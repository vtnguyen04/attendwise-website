'use client';

import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';


import { EditPostModal } from './EditPostModal';

import Heart from 'lucide-react/icons/heart';
import MessageSquare from 'lucide-react/icons/message-square';
import Share2 from 'lucide-react/icons/share-2';
import Pin from 'lucide-react/icons/pin';
import FileIcon from 'lucide-react/icons/file';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Edit from 'lucide-react/icons/edit';
import Trash2 from 'lucide-react/icons/trash-2';
import Bookmark from 'lucide-react/icons/bookmark';
import ExternalLink from 'lucide-react/icons/external-link';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/user-provider';
import { Post, Comment } from '@/lib/types';
import { pinPost } from '@/lib/services/community.client.service';
import { useQueryClient } from '@tanstack/react-query';
import { PostDetailModal } from './PostDetailModal';

type CommunityRole = 'community_admin' | 'moderator' | 'member' | 'pending' | undefined;

interface PostCardProps {
  post: Post;
  viewerRole?: CommunityRole;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: Post) => void;
  className?: string;
}

export function PostCard({ 
  post: initialPost, 
  viewerRole, 
  onPostDeleted, 
  onPostUpdated, 
  className
}: PostCardProps) {
  const { user } = useUser();
  const { t } = useTranslation('community');
  const [post, setPost] = useState(initialPost);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.reaction_count || 0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [isPinning, setIsPinning] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const processedCommentIdsRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const authorName = post.author?.name || t('post.unknown_author');
  const authorInitial = authorName.charAt(0).toUpperCase();

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
  }, [post.created_at]);

  useEffect(() => {
    processedCommentIdsRef.current.clear();
  }, [post.id]);

  useEffect(() => {
    const handleRealtimeComment = (event: Event) => {
      const customEvent = event as CustomEvent<Comment>;
      const incoming = customEvent.detail;
      if (!incoming || incoming.post_id !== post.id) return;
      if (processedCommentIdsRef.current.has(incoming.id)) return;
      processedCommentIdsRef.current.add(incoming.id);
      console.log('New comment received, invalidating queries for post:', post.id);
      setPost((prev) => ({
        ...prev,
        comment_count: (prev.comment_count ?? 0) + 1,
      }));
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
    };

    window.addEventListener('realtime-comment', handleRealtimeComment as EventListener);
    return () => window.removeEventListener('realtime-comment', handleRealtimeComment as EventListener);
  }, [post.id, queryClient]);

  useEffect(() => {
    const handleRealtimeReaction = (event: Event) => {
      const customEvent = event as CustomEvent<any>; // Type for reaction can be improved
      const reaction = customEvent.detail;
      if (reaction.post_id === post.id) {
        setLikeCount(reaction.total_reactions);
        if (reaction.user_id === user?.id) {
          setIsLiked(reaction.is_liked);
        }
      }
    };

    window.addEventListener('realtime-reaction', handleRealtimeReaction as EventListener);
    return () => window.removeEventListener('realtime-reaction', handleRealtimeReaction as EventListener);
  }, [post.id, user?.id]);

  const handleCardClick = () => setIsModalOpen(true);

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const originalIsLiked = isLiked;
    const originalLikeCount = likeCount;

    setIsLiked(!originalIsLiked);
    setLikeCount(originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1);

    try {
      if (originalIsLiked) {
        await apiClient.delete(`/posts/${post.id}/reactions`);
      } else {
        await apiClient.post(`/posts/${post.id}/reactions`, { reaction_type: 'like' });
      }
    } catch {
      setIsLiked(originalIsLiked);
      setLikeCount(originalLikeCount);
      toast({ title: t('toast.error'), description: t('toast.reaction_error'), variant: 'destructive' });
    }
  };

  const handleShare = (event: React.MouseEvent) => {
    event.stopPropagation();
    const postUrl = `${window.location.origin}/dashboard/communities/${post.community_id}/posts/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({ title: t('toast.link_copied'), description: t('toast.link_copied_description') });
    });
  };

  const handleSave = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsSaved(!isSaved);
    toast({ 
      title: isSaved ? 'Unsaved' : 'Saved',
      description: isSaved ? 'Removed from saved' : 'Added to saved'
    });
  };

  const handleCommentClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsModalOpen(true);
  };

  const handleDeletePost = async () => {
    try {
      await apiClient.delete(`/posts/${post.id}`);
      toast({ title: t('toast.success'), description: t('toast.post_deleted_successfully') });
      onPostDeleted?.(post.id);
    } catch {
      toast({ title: t('toast.error'), description: t('toast.post_delete_failed'), variant: 'destructive' });
    }
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPost(updatedPost);
    onPostUpdated?.(updatedPost);
  };

  const handleTogglePin = async () => {
    const targetPinnedState = !post.is_pinned;
    if (isPinning) return;

    setIsPinning(true);
    const originalPost = post;
    setPost(prev => ({ ...prev, is_pinned: targetPinnedState }));
    try {
      await pinPost(post.id, targetPinnedState);
      const updatedPost = { ...originalPost, is_pinned: targetPinnedState };
      setPost(updatedPost);
      onPostUpdated?.(updatedPost);
      toast({
        title: targetPinnedState ? t('toast.post_pinned') : t('toast.post_unpinned'),
        description: targetPinnedState ? t('toast.post_pinned_description') : t('toast.post_unpinned_description'),
      });
    } catch {
      setPost(originalPost);
      toast({ title: t('toast.action_failed'), description: t('toast.pin_status_error'), variant: 'destructive' });
    } finally {
      setIsPinning(false);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  const getAttachmentType = (attachment: Post['file_attachments'][number]) =>
    attachment?.Type || attachment?.type || '';
  const getAttachmentUrl = (attachment: Post['file_attachments'][number]) =>
    attachment?.Url || attachment?.url || '';
  const getAttachmentName = (attachment: Post['file_attachments'][number]) =>
    attachment?.Name || attachment?.name || getAttachmentUrl(attachment) || 'Attachment';

  const rawAttachments = post.file_attachments || 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((post as any).fileAttachments as typeof post.file_attachments | undefined) || [];
  const rawMediaUrls = post.media_urls || 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((post as any).mediaUrls as typeof post.media_urls | undefined) || [];

  const imageAttachments = rawAttachments.filter((attachment) =>
    getAttachmentType(attachment).toLowerCase().startsWith('image/')
  ) || [];
  const otherAttachments = rawAttachments.filter(
    (attachment) => !getAttachmentType(attachment).toLowerCase().startsWith('image/')
  ) || [];

  const imageSourceMap = new Map<string, { url: string; name: string }>();
  imageAttachments.forEach((attachment) => {
    const url = getAttachmentUrl(attachment)?.trim();
    if (!url) return;
    imageSourceMap.set(url, { url, name: getAttachmentName(attachment) });
  });
  rawMediaUrls.forEach((rawUrl) => {
    const url = rawUrl?.trim();
    if (!url || imageSourceMap.has(url)) return;
    const fallbackName = url.split(/[/?#]/).filter(Boolean).pop() || 'Image';
    imageSourceMap.set(url, { url, name: fallbackName });
  });

  const imageSources = Array.from(imageSourceMap.values());
  const userRole: CommunityRole = viewerRole ?? post.community_role;
  const canManagePost = Boolean(
    user?.id === post.author_id || userRole === 'community_admin' || userRole === 'moderator'
  );

  const TRUNCATE_LENGTH = 400;
  const isTruncated = post.content.length > TRUNCATE_LENGTH;
  const displayedContent = isTruncated
    ? `${post.content.slice(0, TRUNCATE_LENGTH)}…`
    : post.content;

  return (
    <>

      <PostDetailModal post={post} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      <EditPostModal
        post={post}
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onPostUpdated={handlePostUpdated}
      />
      
      <div
        ref={cardRef}
        className={cn(
          'group overflow-hidden rounded-lg border border-border/60 bg-card transition-all duration-200 hover:border-border hover:shadow-md',
          post.is_pinned && 'border-primary/40 ring-1 ring-primary/20',
          className,
        )}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 pb-2">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/profile/${post.author_id}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author?.profile_picture_url.String || null} alt={authorName} />
                <AvatarFallback className="text-xs">{authorInitial}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <Link href={`/dashboard/profile/${post.author_id}`}>
                  <span className="text-xs font-semibold text-foreground hover:underline">{authorName}</span>
                </Link>
                {post.is_pinned && (
                  <Badge variant="secondary" className="h-4 gap-1 px-1.5 text-[10px] font-semibold">
                    <Pin className="h-2.5 w-2.5" />
                    Pinned
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSave}
            >
              <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
            </Button>
            {canManagePost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}>
                    <Pin className="mr-2 h-4 w-4" />
                    {post.is_pinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content Text */}
        {post.content && (
          <div className="px-3 pb-2">
            <div className="text-sm leading-relaxed text-foreground">
              {displayedContent}
              {isTruncated && (
                <button
                  type="button"
                  onClick={handleCardClick}
                  className="ml-1 text-primary hover:underline"
                >
                  Read more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media - Full Width */}
        {imageSources.length > 0 && (
          <div className="w-full">
            {imageSources.length === 1 ? (
              <div className="relative w-full bg-muted" style={{ maxHeight: '512px' }}>
                <Image
                  src={imageSources[0].url}
                  alt={imageSources[0].name}
                  width={800}
                  height={512}
                  className="w-full object-contain"
                  style={{ maxHeight: '512px' }}
                />
              </div>
            ) : (
              <div className={cn(
                "grid w-full gap-0.5",
                imageSources.length === 2 && "grid-cols-2",
                imageSources.length >= 3 && "grid-cols-2"
              )}>
                {imageSources.slice(0, 4).map(({ url, name }, index) => (
                  <div
                    key={`${url}-${index}`}
                    className={cn(
                      "relative bg-muted",
                      imageSources.length === 3 && index === 0 ? "col-span-2 aspect-video" : "aspect-square"
                    )}
                  >
                    <Image
                      src={url}
                      alt={name}
                      fill
                      className="object-cover"
                    />
                    {imageSources.length > 4 && index === 3 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white">
                        +{imageSources.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File Attachments */}
        {otherAttachments.length > 0 && (
          <div className="space-y-1.5 px-3 pb-2">
            {otherAttachments.map((attachment, index) => {
              const url = getAttachmentUrl(attachment);
              const name = getAttachmentName(attachment);
              const type = getAttachmentType(attachment) || 'File';
              if (!url) return null;

              return (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm transition-colors hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">{type}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-1 border-t border-border/40 px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            onClick={handleLike}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
            {likeCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            onClick={handleCommentClick}
          >
            <MessageSquare className="h-4 w-4" />
            {post.comment_count}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            onClick={(e) => { e.stopPropagation(); handleShare(e); }}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete_confirm.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost}>{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}