'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Post } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Check from 'lucide-react/icons/check';
import X from 'lucide-react/icons/x';
import Loader2 from 'lucide-react/icons/loader-2';
import ListTodo from 'lucide-react/icons/list-todo';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';

export default function PendingPostsPage() {
  const params = useParams();
  const communityId = params.id as string;

  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { t } = useTranslation('community');

  const fetchPendingPosts = useCallback(async () => {
    if (!communityId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/communities/${communityId}/posts?status=pending`);
      setPendingPosts(response.data.posts || []);
    } catch {
      toast({ title: t('error'), description: t('admin.pending_posts.toast.fetch_error'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast, t]);

  useEffect(() => {
    fetchPendingPosts();
  }, [fetchPendingPosts]);

  const handleAction = async (postId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [postId]: true }));
    try {
      await apiClient.post(`/posts/${postId}/${action}`);
      toast({ title: t('toast.success'), description: t('admin.pending_posts.toast.action_success', { action }) });
      setPendingPosts(prev => prev.filter(post => post.id !== postId));
    } catch {
      toast({ title: t('error'), description: t('admin.pending_posts.toast.action_error', { action }), variant: 'destructive' });
    } finally {
      setActionLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const PostSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
        </CardHeader>
        <CardContent><Skeleton className="h-12 w-full" /></CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
        </CardFooter>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.pending_posts.title')}</CardTitle>
        <CardDescription>{t('admin.pending_posts.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="space-y-4">
                <PostSkeleton />
                <PostSkeleton />
            </div>
        ) : pendingPosts.length > 0 ? (


            pendingPosts.map(post => (
              <Card key={post.id}>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Link href={`/dashboard/profile/${post.author_id}`}>
                        <Avatar>
                            <AvatarImage src={post.author.profile_picture_url} />
                            <AvatarFallback>{post.author.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div>
                        <Link href={`/dashboard/profile/${post.author_id}`}>
                            <p className="font-semibold hover:underline">{post.author.name || t('admin.pending_posts.unnamed_user')}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap">{post.content}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(post.id, 'reject')}
                    disabled={actionLoading[post.id]}
                  >
                    {actionLoading[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    {t('admin.pending_posts.reject_button')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(post.id, 'approve')}
                    disabled={actionLoading[post.id]}
                  >
                    {actionLoading[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {t('admin.pending_posts.approve_button')}
                  </Button>
                </CardFooter>
              </Card>
            ))
        ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                <ListTodo className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">{t('admin.pending_posts.no_pending_posts_title')}</h3>
                <p className="mt-2">{t('admin.pending_posts.no_pending_posts_description')}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
