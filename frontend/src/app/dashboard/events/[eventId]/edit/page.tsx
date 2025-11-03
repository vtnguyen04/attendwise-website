'use client';

import { useQuery } from '@tanstack/react-query';
import EventForm from '@/components/events/event-form/event-form';
import { getEventById } from '@/lib/services/event.client.service';
import { Skeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumb';
import { useParams } from 'next/navigation';
import AlertCircle from 'lucide-react/icons/alert-circle';
import Loader from 'lucide-react/icons/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function EditEventPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-56 w-full rounded-xl" />
            </div>
            <div className="flex gap-3">
                <Skeleton className="h-12 w-32 rounded-lg" />
                <Skeleton className="h-12 w-32 rounded-lg" />
            </div>
        </div>
    );
}

export default function EditEventPage() {
    const params = useParams();
    const eventId = params.id as string;

    const { data: event, isLoading, error } = useQuery({
        queryKey: ['event', eventId],
        queryFn: () => getEventById(eventId),
        enabled: !!eventId,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3 py-2">
                    <Loader className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Loading event data...</span>
                </div>
                <EditEventPageSkeleton />
            </div>
        );
    }

    if (error || !event) {
        return (
            <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900 dark:text-red-200">Failed to Load Event</h3>
                            <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                                The event data could not be loaded. It may have been deleted or you don&apos;t have permission to access it.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs />

            {/* Header Section */}
            <div className="space-y-3">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Manage Event</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    Editing <span className="font-semibold text-blue-600 dark:text-blue-400">&quot;{event.name}&quot;</span>
                </p>
            </div>

            {/* Form Card */}
            <Card className="border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Event Details</CardTitle>
                    </div>
                </CardHeader>
                <div className="p-6">
                    <EventForm mode="edit" initialData={event} />
                </div>
            </Card>
        </div>
    );
}