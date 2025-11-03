import { notFound } from 'next/navigation';
import { 
  getUserById, 
  getPostsByUserId, 
  getUserRelationship,
  getUserExperience,
  getUserEducation,
  getUserSkills
} from '@/lib/services/user.server.service';
import { getCurrentUser } from '@/lib/session';
import ProfileClientPage from './client-page';
import { cookies } from 'next/headers';

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const [profileUser, currentUser, posts, relationship, experience, education, skills] = await Promise.all([
    getUserById(userId, token),
    getCurrentUser(),
    getPostsByUserId(userId, token),
    getUserRelationship(userId, token),
    getUserExperience(userId, token),
    getUserEducation(userId, token),
    getUserSkills(userId, token),
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
      experience={experience || []}
      education={education || []}
      skills={skills || []}
    />
  );
}