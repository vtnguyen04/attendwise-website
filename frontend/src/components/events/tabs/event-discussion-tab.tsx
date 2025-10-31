'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Post } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const PostCard = ({ post }: { post: Post }) => (
    <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <div className="space-y-2">
            <p>{post.content}</p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    </div>
);

// Placeholder for CreatePostForm
const CreatePostForm = ({ communityId, eventId, onPostCreated }: { communityId: string, eventId: string, onPostCreated: () => void }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/v1/communities/${communityId}/posts`, { content, event_id: eventId, visibility: 'event_only' });
            setContent('');
            onPostCreated();
        } catch (error) {
            console.error("Failed to create post", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
            <textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Start a discussion..." 
                className="w-full p-2 border rounded bg-background"
                rows={3}
            />
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50">
                {isSubmitting ? 'Posting...' : 'Post'}
            </button>
        </form>
    );
};


interface EventDiscussionTabProps {
    eventId: string;
    communityId: string;
}

export default function EventDiscussionTab({ eventId, communityId }: EventDiscussionTabProps) {

    const fetchEventPosts = async () => {
        const response = await apiClient.get(`/api/v1/communities/${communityId}/posts`, {
            params: { event_id: eventId }
        });
        return response.data.posts || [];
    };

    const { data: posts, isLoading, refetch } = useQuery<Post[]>({ 
        queryKey: ['posts', 'event', eventId], 
        queryFn: fetchEventPosts 
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CreatePostForm communityId={communityId} eventId={eventId} onPostCreated={refetch} />
            <div className="space-y-4">
                {posts && posts.length > 0 ? (
                    posts.map(post => <PostCard key={post.id} post={post} />)
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No discussions yet.</p>
                        <p>Be the first to start a conversation!</p>
                    </div>
                )}
            </div>
        </div>
    );
}