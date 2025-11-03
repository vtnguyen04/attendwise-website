import { getAdminCommunities } from '@/lib/services/community.server.service';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import CreateEventPageClient from './CreateEventPageClient';

export default async function CreateEventPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const adminCommunities = await getAdminCommunities();

  return <CreateEventPageClient adminCommunities={adminCommunities} />;
}
