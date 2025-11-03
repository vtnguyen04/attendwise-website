'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Post } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Loader2, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Enhanced Post Card Component
const PostCard = ({ post, index }: { post: Post; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
    className="liquid-glass-card p-6 group"
  >
    {/* Author Info */}
    <div className="flex items-start gap-4 mb-4">
      <Avatar className="h-12 w-12 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
        <AvatarImage src={post.author?.profile_picture_url} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-base truncate">
            {post.author?.name || 'Anonymous'}
          </h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Member
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>

    {/* Post Content */}
    <div className="ml-16 space-y-3">
      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Interaction Stats (Placeholder) */}
      <div className="flex items-center gap-4 pt-3 border-t border-glass-border">
        <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Reply
        </button>
      </div>
    </div>
  </motion.div>
);

// Enhanced Create Post Form
const CreatePostForm = ({ 
  communityId, 
  eventId, 
  onPostCreated 
}: { 
  communityId: string; 
  eventId: string; 
  onPostCreated: () => void;
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.post(`/communities/${communityId}/posts`, { 
        content, 
        event_id: eventId, 
        visibility: 'event_only' 
      });
      setContent('');
      onPostCreated();
    } catch (error) {
      console.error("Failed to create post", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass-card p-6 transition-all duration-300 ${
        isFocused ? 'ring-2 ring-primary/30' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Share your thoughts about this event..."
              className="w-full px-4 py-3 bg-background/50 border border-glass-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60 backdrop-glass"
              rows={isFocused ? 4 : 3}
            />
            
            {/* Character count */}
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {content.length} / 5000
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Event discussion only</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="liquid-glass-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.form>
  );
};

// Loading Skeleton
const DiscussionSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="glass-card p-12 text-center"
  >
    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 backdrop-glass flex items-center justify-center">
      <MessageSquare className="h-10 w-10 text-primary/60" />
    </div>
    <h3 className="text-xl font-semibold mb-2">No discussions yet</h3>
    <p className="text-muted-foreground max-w-md mx-auto">
      Be the first to start a conversation! Share your thoughts, questions, or excitement about this event.
    </p>
  </motion.div>
);

// Main Component
interface EventDiscussionTabProps {
  eventId: string;
  communityId: string;
}

export default function EventDiscussionTab({ eventId, communityId }: EventDiscussionTabProps) {
  const fetchEventPosts = async () => {
    const response = await apiClient.get(`/communities/${communityId}/posts`, {
      params: { event_id: eventId }
    });
    return response.data.posts || [];
  };

  const { data: posts, isLoading, refetch } = useQuery<Post[]>({ 
    queryKey: ['posts', 'event', eventId], 
    queryFn: fetchEventPosts 
  });

  if (isLoading) {
    return <DiscussionSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Event Discussion</h2>
            <p className="text-sm text-muted-foreground">
              {posts?.length || 0} {posts?.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Create Post Form */}
      <CreatePostForm 
        communityId={communityId} 
        eventId={eventId} 
        onPostCreated={refetch} 
      />

      {/* Posts List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {posts && posts.length > 0 ? (
            posts.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))
          ) : (
            <EmptyState />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}