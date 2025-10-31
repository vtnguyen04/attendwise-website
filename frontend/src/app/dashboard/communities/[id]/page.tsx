import type { Post } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';
import { PostComposer } from '@/components/community/feed/PostComposer';
import { revalidatePath } from 'next/cache';
import Lock from 'lucide-react/icons/lock';
import MessageCircle from 'lucide-react/icons/message-circle';
import { listCommunityPosts, getCommunityById } from '@/lib/services/community.server.service';

export default async function CommunityFeedPage({
  params
}: {
  params: { id: string }
}) {
  const { id } = params;

  const [postsData, community] = await Promise.all([
    listCommunityPosts(id, 1, 10),
    getCommunityById(id),
  ]);

  async function handlePostCreated() {
    'use server';
    revalidatePath(`/dashboard/communities/${id}`);
  }

  if (!postsData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 light:bg-white rounded-2xl border-2 border-amber-200 dark:border-amber-900/30 light:border-amber-200 p-8 shadow-lg dark:shadow-xl dark:shadow-black/20 light:shadow-md light:shadow-gray-100">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 light:bg-amber-100 rounded-xl">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400 light:text-amber-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold dark:text-white light:text-gray-900">
                Members Only
              </h3>
              <p className="text-gray-600 dark:text-gray-400 light:text-gray-600">
                This community content is restricted to members only.
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 light:text-gray-600 pt-4 border-t border-gray-200 dark:border-gray-700 light:border-gray-200 w-full">
              Join this community to view posts and participate in discussions.
            </p>
            <a
              href="/dashboard/communities"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 mt-2 transform hover:scale-105"
            >
              Browse Communities
            </a>
          </div>
        </div>
      </div>
    );
  }

  const posts: Post[] = postsData.posts || [];

  return (
    <div className="w-full">
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
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
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
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 light:text-gray-600 text-center max-w-xs">
              Be the first to share something with the community and start the conversation!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}