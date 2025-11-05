'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/context/user-provider';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface CommentInputProps {
  postId: string;
  onCommentPosted: () => void;
}

export function CommentInput({ postId, onCommentPosted }: CommentInputProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/posts/${postId}/comments`, { content: newComment });
      setNewComment('');
      toast({ title: 'Success', description: 'Comment posted successfully' });
      onCommentPosted();
    } catch {
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-4 border-t flex-shrink-0 bg-background">
      <div className="flex gap-3 items-start">
        <Avatar className="h-10 w-10 flex-shrink-0 mt-1">
          <AvatarImage src={user?.profile_picture_url.String || null} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 relative flex items-center">
          <Textarea
            placeholder='Write a comment...'
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={1}
            className="resize-none text-sm rounded-3xl pr-12 min-h-[44px] max-h-32 bg-muted border-0 focus-visible:ring-1 w-full"
            style={{ paddingTop: '12px', paddingBottom: '12px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
          />
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
            size="icon"
            className="absolute right-2 h-8 w-8 rounded-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}