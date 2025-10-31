import CommunityEventsTab from '@/components/community/shared/community-events-tab';
import apiClient from '@/lib/api-client';
import { Community, EventItem } from '@/lib/types';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import AlertCircle from 'lucide-react/icons/alert-circle';

async function getCommunity(id: string): Promise<Community | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;

  try {
    const response = await apiClient.get(`/api/v1/communities/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.community;
  } catch (error) {
    console.error('Error fetching community:', error);
    return null;
  }
}

async function getCommunityEvents(id: string): Promise<EventItem[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return [];

  try {
    const response = await apiClient.get(`/api/v1/events/by-community/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.events || [];
  } catch (error) {
    console.error('Error fetching community events:', error);
    return [];
  }
}

export default async function CommunityEventsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Fetch data in parallel
  const [community, events, user] = await Promise.all([
    getCommunity(id),
    getCommunityEvents(id),
    getCurrentUser(),
  ]);

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-red-200 dark:border-red-900/30 p-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Community Not Found
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  The community you're looking for doesn't exist or has been deleted.
                </p>
                <a
                  href="/dashboard/communities"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Back to Communities
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CommunityEventsTab
      community={community}
      initialEvents={events}
      currentUser={user}
    />
  );
}