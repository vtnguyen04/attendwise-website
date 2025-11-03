'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getEventById } from '@/lib/services/event.client.service';
import AnalyticsDashboard from '@/components/events/analytics/analytics-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import AlertCircle from 'lucide-react/icons/alert-circle';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme
import { cn } from '@/lib/utils';

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const theme = useTheme(); // 👈 Lấy theme hiện tại


  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Skeleton className="h-10 w-1/3 rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-10 w-1/4 rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );
  }

  if (isError || !event) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-20 text-center rounded-2xl backdrop-blur-xl transition-all duration-300 transform-gpu",
            theme === 'dark' 
                ? 'bg-slate-900/50 border border-white/5' 
                : 'bg-white/50 border border-gray-200'
        )}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/20 rounded-full mb-4 transform-gpu hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className={cn(
                "text-2xl font-bold mb-2 transition-colors duration-300",
                theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>Error Loading Event Analytics</h2>
            <p className={cn(
                "text-sm transition-colors duration-300",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>Could not load the data for this event.</p>
        </div>
    );
  }

  return <AnalyticsDashboard event={event} />;
}