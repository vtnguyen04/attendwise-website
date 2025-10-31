import EventForm from '@/components/events/event-form/event-form';
import apiClient from '@/lib/api-client';
import { Community } from '@/lib/types';
import { getCurrentUser } from '@/lib/session';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AlertCircle from 'lucide-react/icons/alert-circle';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import Link from 'next/link';

async function getCommunity(id: string): Promise<Community | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) {
    console.error("Authentication token not found");
    return null;
  }

  try {
    const response = await apiClient.get(`/api/v1/communities/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.community;
  } catch (error) {
    console.error("Failed to fetch community", error);
    return null;
  }
}

export default async function NewEventPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const [community, currentUser] = await Promise.all([
    getCommunity(id),
    getCurrentUser(),
  ]);

  if (!community) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200">Community Not Found</h3>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                  The community you're looking for could not be found or has been deleted.
                </p>
                <Link 
                  href="/dashboard/communities"
                  className="text-sm font-semibold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mt-3 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Communities
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCommunityAdmin = community.role === 'community_admin';
  if (!isCommunityAdmin) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Card className="border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">Permission Denied</h3>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  You don't have permission to create events in this community. Only community administrators can create events.
                </p>
                <Link 
                  href={`/dashboard/communities/${id}`}
                  className="text-sm font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 mt-3 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Community
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      {/* Header Section */}
      <div className="space-y-4 mb-8">
        <Link 
          href={`/dashboard/communities/${id}`}
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </Link>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create a New Event</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Setting up a new event for <span className="font-semibold text-blue-600 dark:text-blue-400">"{community.name}"</span>
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Event Details</CardTitle>
          </div>
        </CardHeader>
        <div className="p-6">
          <EventForm mode="create" community={community} />
        </div>
      </Card>
    </div>
  );
}