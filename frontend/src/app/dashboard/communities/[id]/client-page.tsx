'use client';

import type { Post, Community } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';
import { PostComposer } from '@/components/community/feed/PostComposer';
import Lock from 'lucide-react/icons/lock';
import MessageCircle from 'lucide-react/icons/message-circle';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { useEffect, useState } from 'react';

interface CommunityFeedClientPageProps {
  posts: Post[];
  community: Community | null;
  id: string;
  handlePostCreated: () => void;
}

export default function CommunityFeedClientPage({ posts: initialPosts, community, id, handlePostCreated }: CommunityFeedClientPageProps) {
  const { t } = useTranslation('community');
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  useEffect(() => {
    const element = document.querySelector('[data-scroll-anchor]');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const handleNewPost = (event: Event) => {
      const customEvent = event as CustomEvent<Post>;
      const newPost = customEvent.detail;
      if (newPost.community_id === id) {
        setPosts((prevPosts) => [newPost, ...prevPosts]);
      }
    };

    const handlePostUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Post>;
      const updatedPost = customEvent.detail;
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
      );
    };

    const handlePostDelete = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      const { id: deletedPostId } = customEvent.detail;
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
    };

    window.addEventListener('realtime-new-post', handleNewPost as EventListener);
    window.addEventListener('realtime-post-update', handlePostUpdate as EventListener);
    window.addEventListener('realtime-post-delete', handlePostDelete as EventListener);

    return () => {
      window.removeEventListener('realtime-new-post', handleNewPost as EventListener);
      window.removeEventListener('realtime-post-update', handlePostUpdate as EventListener);
      window.removeEventListener('realtime-post-delete', handlePostDelete as EventListener);
    };
  }, [id]);

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 light:bg-white rounded-2xl border-2 border-amber-200 dark:border-amber-900/30 light:border-amber-200 p-8 shadow-lg dark:shadow-xl dark:shadow-black/20 light:shadow-md light:shadow-gray-100">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 light:bg-amber-100 rounded-xl">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400 light:text-amber-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold dark:text-white light:text-gray-900">
                {t('members_only')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 light:text-gray-600">
                {t('restricted_content')}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 light:text-gray-600 pt-4 border-t border-gray-200 dark:border-gray-700 light:border-gray-200 w-full">
              {t('join_to_view')}
            </p>
            <Link
              href="/dashboard/communities"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 mt-2 transform hover:scale-105"
            >
              {t('browse_communities')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" data-scroll-anchor>
      {/* Post Composer - NOT sticky, always visible at top */}
      <div className="mb-6 w-full">
        <PostComposer communityId={id} onPostCreated={handlePostCreated} />
      </div>

      {/* Feed Section - Stretches full width below composer */}
      <div className="space-y-4 w-full">
        {posts.length > 0 ? (
          <>
            <div className="flex items-center gap-2 px-2 py-1">
              <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 light:text-blue-600" />
              <p className="text-sm font-semibold dark:text-gray-400 light:text-gray-600">
                {posts.length === 1
                  ? t('post_count_single')
                  : t('post_count_plural', { count: posts.length })}
              </p>
            </div>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} viewerRole={community?.role} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800/50 dark:to-slate-900/50 light:from-gray-50 light:to-gray-100 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 light:border-gray-200">
            <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 light:text-gray-400 mb-4" />
            <h3 className="text-xl font-bold dark:text-white light:text-gray-900 mb-2">
              {t('no_posts_yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 light:text-gray-600 text-center max-w-xs">
              {t('be_the_first_to_post')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
