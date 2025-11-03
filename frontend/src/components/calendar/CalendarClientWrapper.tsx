// frontend/src/components/calendar/CalendarClientWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { RegistrationWithEventDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Sparkles } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

// Component Skeleton
function CalendarSkeleton() {
    const { t } = useTranslation('events');
    return (
        <div className="dashboard-panel p-6 sm:p-8 animate-pulse">
            <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-64 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30" />
                        <Skeleton className="h-4 w-80 rounded-md bg-muted/30" />
                    </div>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="dashboard-toolbar p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-9 rounded-lg bg-muted/40" />
                            <Skeleton className="h-9 w-20 rounded-lg bg-muted/40" />
                            <Skeleton className="h-9 w-9 rounded-lg bg-muted/40" />
                        </div>
                        <Skeleton className="h-8 w-48 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20" />
                        <div className="flex gap-1.5">
                            <Skeleton className="h-9 w-16 rounded-lg bg-muted/40" />
                            <Skeleton className="h-9 w-16 rounded-lg bg-muted/40" />
                            <Skeleton className="h-9 w-16 rounded-lg bg-muted/40" />
                            <Skeleton className="h-9 w-20 rounded-lg bg-muted/40" />
                        </div>
                    </div>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-border/50 backdrop-blur-sm bg-card/30">
                    <div className="grid grid-cols-7 gap-px bg-border/20">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 bg-muted/30" />
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-border/20">
                        {Array.from({ length: 35 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 bg-card/50" />
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <CalendarIcon className="h-4 w-4 animate-pulse" />
                <span className="animate-pulse">{t('calendar.loading_schedule')}</span>
            </div>
        </div>
    )
}

const MainCalendar = dynamic(() => import('./main-calendar'), {
  ssr: false,
  loading: () => <CalendarSkeleton />,
});

interface CalendarClientWrapperProps {
  registrations: RegistrationWithEventDetails[];
}

export default function CalendarClientWrapper({ registrations }: CalendarClientWrapperProps) {
  return <MainCalendar registrations={registrations} />;
}