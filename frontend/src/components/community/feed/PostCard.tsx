'use client';

import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import dynamic from 'next/dynamic';

const PostDetailModal = dynamic(() => import('./PostDetailModal').then(mod => mod.PostDetailModal));
import { EditPostModal } from './EditPostModal';

import Heart from 'lucide-react/icons/heart';
import MessageSquare from 'lucide-react/icons/message-square';
import Share2 from 'lucide-react/icons/share-2';
import Pin from 'lucide-react/icons/pin';
import FileIcon from 'lucide-react/icons/file';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Edit from 'lucide-react/icons/edit';
import Trash2 from 'lucide-react/icons/trash-2';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/user-provider';
import { Post } from '@/lib/types';
import { pinPost } from '@/lib/services/community.client.service';

type CommunityRole = 'community_admin' | 'moderator' | 'member' | 'pending' | undefined;

interface PostCardProps {
  post: Post;
  viewerRole?: CommunityRole;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: Post) => void;
  className?: string;
}

export function PostCard({ post: initialPost, viewerRole, onPostDeleted, onPostUpdated, className }: PostCardProps) {
  const { user } = useUser();
  const [post, setPost] = useState(initialPost);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.reaction_count || 0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [isPinning, setIsPinning] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const authorName = post.author?.name || 'Unknown Author';
  const authorInitial = authorName.charAt(0).toUpperCase();

  useEffect(() => {
    setTimeAgo(formatDistanceToNow(new Date(post.created_at), { addSuffix: true }));
  }, [post.created_at]);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const originalIsLiked = isLiked;
    const originalLikeCount = likeCount;

    setIsLiked(!originalIsLiked);
    setLikeCount(originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1);

    try {
      if (originalIsLiked) {
        await apiClient.delete(`/api/v1/posts/${post.id}/reactions`);
      } else {
        await apiClient.post(`/api/v1/posts/${post.id}/reactions`, { reaction_type: 'like' });
      }
    } catch (error) {
      setIsLiked(originalIsLiked);
      setLikeCount(originalLikeCount);
      toast({ title: 'Error', description: 'Could not update your reaction.', variant: 'destructive' });
    }
  };

  const handleShare = (event: React.MouseEvent) => {
    event.stopPropagation();
    const postUrl = `${window.location.origin}/dashboard/communities/${post.community_id}/posts/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({ title: 'Link Copied', description: 'Post link copied to clipboard.' });
    });
  };

  const handleCommentClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsModalOpen(true);
  };

  const handleDeletePost = async () => {
    try {
      await apiClient.delete(`/api/v1/posts/${post.id}`);
      toast({ title: 'Success', description: 'Post deleted successfully.' });
      onPostDeleted?.(post.id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete post.', variant: 'destructive' });
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
        title: targetPinnedState ? 'Post pinned' : 'Post unpinned',
        description: targetPinnedState
          ? 'This post is now pinned to the top.'
          : 'The post is no longer pinned.',
      });
    } catch (error) {
      setPost(originalPost);
      toast({
        title: 'Action failed',
        description: 'We could not update the pin status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPinning(false);
    }
  };

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--spotlight-x', `${x}%`);
    cardRef.current.style.setProperty('--spotlight-y', `${y}%`);
    cardRef.current.style.setProperty('--spotlight-opacity', '1');
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.removeProperty('--spotlight-x');
    cardRef.current.style.removeProperty('--spotlight-y');
    cardRef.current.style.removeProperty('--spotlight-opacity');
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

  const imageAttachments =
    post.file_attachments?.filter((attachment) =>
      getAttachmentType(attachment).startsWith('image/')
    ) || [];

  const otherAttachments =
    post.file_attachments?.filter(
      (attachment) => !getAttachmentType(attachment).startsWith('image/')
    ) || [];

  const userRole: CommunityRole = viewerRole ?? post.community_role;
  const canManagePost = Boolean(
    user?.id === post.author_id ||
      userRole === 'community_admin' ||
      userRole === 'moderator'
  );

  const TRUNCATE_LENGTH = 320;
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
          'group relative overflow-hidden rounded-3xl border border-border/70 bg-background/90 p-6 shadow-sm transition-all duration-300',
          'hover:border-primary/40 hover:shadow-[0_18px_45px_-24px_rgba(99,102,241,0.4)]',
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--focus-ring)]',
          post.is_pinned && 'border-primary/50 shadow-[0_18px_45px_-20px_rgba(99,102,241,0.45)]',
          className,
        )}
        onClick={handleCardClick}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onFocus={() => cardRef.current?.style.setProperty('--spotlight-opacity', '1')}
        onBlur={handlePointerLeave}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
        data-active={post.is_pinned}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="shadow-[0_6px_18px_-8px_rgba(15,23,42,0.65)]">
              <AvatarImage src={post.author?.profile_picture_url.String} alt={authorName} />
              <AvatarFallback>{authorInitial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground/95">{authorName}</p>
              <p className="text-xs text-muted-foreground">{timeAgo || 'Loading...'}</p>
            </div>
          </div>
          {canManagePost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="backdrop-blur-xl bg-background/70 border-border/40 shadow-glass">
                <DropdownMenuItem
                  disabled={isPinning}
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleTogglePin();
                  }}
                >
                  <Pin className="mr-2 h-4 w-4" />
                  {post.is_pinned ? 'Unpin Post' : 'Pin Post'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsEditModalOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-3">
          {post.is_pinned && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-[0_10px_30px_-20px_rgba(99,102,241,0.5)]">
              <Pin className="h-3.5 w-3.5" />
              Pinned
            </div>
          )}
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
            {displayedContent}
            {isTruncated && (
              <button
                type="button"
                onClick={handleCardClick}
                className="ml-1 inline-flex items-center text-primary transition-colors hover:underline"
              >
                Read More
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {imageAttachments.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imageAttachments.map((attachment, index) => {
                const url = getAttachmentUrl(attachment);
                const name = getAttachmentName(attachment);

                if (!url) return null;

                return (
                  <div
                    key={`${url}-${index}`}
                    className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/20"
                  >
                    <Image
                      src={url}
                      alt={name}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-black/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                );
              })}
            </div>
          )}
          {otherAttachments.length > 0 && (
            <div className="space-y-2 pt-2">
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
                    className="flex items-center space-x-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 transition-all duration-300 hover:border-white/20 hover:bg-black/20"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <FileIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-muted-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground/70">{type}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center text-sm font-medium">
              <Heart
                className={cn(
                  'mr-1.5 h-4 w-4 transition-transform duration-300',
                  isLiked && 'scale-110 fill-red-500 text-red-500'
                )}
              />
              {likeCount}
            </div>
            <div className="flex items-center text-sm font-medium">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              {post.comment_count}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className="rounded-full border border-transparent px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Heart
                className={cn(
                  'mr-2 h-4 w-4 transition-transform duration-300',
                  isLiked && 'scale-110 fill-red-500 text-red-500'
                )}
              />
              Like
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCommentClick}
              className="rounded-full border border-transparent px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Comment
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="rounded-full border border-transparent text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(event) => event.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
