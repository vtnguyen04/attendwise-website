
// frontend/src/components/calendar/CalendarClientWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { RegistrationWithEventDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// Component Skeleton
function CalendarSkeleton() {
    return (
        <div className="glass-container p-6 rounded-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold">My Registered Events</h2>
                <p className="text-muted-foreground text-sm">Loading your event schedule...</p>
            </div>
            <Skeleton className="h-[700px] w-full rounded-md bg-muted/50" />
        </div>
    )
}

const MainCalendar = dynamic(() => import('./main-calendar'), {
  ssr: false, // This library depends on `window`
  loading: () => <CalendarSkeleton />,
});

interface CalendarClientWrapperProps {
  registrations: RegistrationWithEventDetails[];
}

export default function CalendarClientWrapper({ registrations }: CalendarClientWrapperProps) {
  return <MainCalendar registrations={registrations} />;
}

