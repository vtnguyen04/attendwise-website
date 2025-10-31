import { notFound } from 'next/navigation';
import { getUserById, getPostsByUserId, getUserRelationship } from '@/lib/services/user.server.service';
import { getCurrentUser } from '@/lib/session';
import ProfileClientPage from './client-page';
import { cookies } from 'next/headers';

interface ProfilePageProps {
  params: { userId: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = params;
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const [profileUser, currentUser, posts, relationship] = await Promise.all([
    getUserById(userId, token),
    getCurrentUser(),
    getPostsByUserId(userId, token),
    getUserRelationship(userId, token),
  ]);

  if (!profileUser) {
    notFound();
  }

  return (
    <ProfileClientPage 
      profileUser={profileUser} 
      currentUser={currentUser} 
      posts={posts || []} 
      isFollowing={relationship?.is_following || false} 
    />
  );
}
