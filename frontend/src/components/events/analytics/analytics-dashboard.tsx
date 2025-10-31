'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Percent, Users, UserCheck, UserX } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider'; // Assume this provides the current user
import { AppEvent, EventAttendee, EventAttendanceReport } from '@/lib/types';

import * as EventService from '@/lib/services/event.client.service';
import * as ReportService from '@/lib/services/report.service';

import AttendeeDataTable from '@/components/events/attendee-table/attendee-data-table';
import { SessionSelector } from './session-selector';

// A leaner, reusable StatCard component.
const StatCard = ({
  title,
  value,
  icon: Icon,
  suffix = '',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  suffix?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {value}
        {suffix}
      </div>
    </CardContent>
  </Card>
);

interface AnalyticsDashboardProps {
  event: AppEvent;
}

export default function AnalyticsDashboard({ event }: AnalyticsDashboardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State Management: Use URL state for the selected session.
  // This makes the state shareable and persistent on refresh.
  const selectedSessionId = searchParams.get('sessionId') || event.sessions?.[0]?.id || '';

  // Derived State: Calculate permissions here, once.
  const canManage = user?.id === event.created_by;

  const { data: stats, isLoading: isLoadingStats } = useQuery<EventAttendanceReport>({
    // REASON: Corrected queryKey and queryFn to fetch event-level stats.
    queryKey: ['event_report_stats', event.id],
    queryFn: () => ReportService.getEventAttendanceReport(event.id),
  });

  const { data: attendees, isLoading: isLoadingAttendees } = useQuery<EventAttendee[]>({
    queryKey: ['event-attendees', event.id, selectedSessionId],
    queryFn: () => EventService.getEventAttendees(event.id, selectedSessionId),
    enabled: !!selectedSessionId, // Only fetch if a session is selected
  });

  const handleSessionChange = (newSessionId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sessionId', newSessionId);
    router.push(`?${params.toString()}`);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    toast({ title: 'Exporting...', description: `Your ${format.toUpperCase()} report is being generated.` });
    try {
      const fileBlob = await ReportService.downloadEventReport(event.id, format);
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${event.id}_${selectedSessionId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Clean up
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not generate the report.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold">Attendee Analytics</h3>
          <p className="text-muted-foreground">
            Overall statistics for the event.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      {isLoadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Registrations" value={stats.total_registrations} icon={Users} />
            <StatCard title="Total Attendees" value={stats.total_attendees} icon={UserCheck} />
            <StatCard title="Absence Rate" value={stats.absence_rate.toFixed(1)} icon={UserX} suffix="%" />
            <StatCard title="Attendance Rate" value={stats.attendance_rate.toFixed(1)} icon={Percent} suffix="%" />
          </div>
        )
      )}

      {/* Attendee Details Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xl font-bold">Attendee Details by Session</h4>
          <p className="text-muted-foreground">
            View the list of attendees for a specific session.
          </p>
        </div>

        <SessionSelector
          sessions={event.sessions || []}
          selectedSessionId={selectedSessionId}
          onSessionChange={handleSessionChange}
          disabled={isLoadingAttendees}
        />

        {isLoadingAttendees ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <AttendeeDataTable
            attendees={attendees || []}
            eventId={event.id}
            sessionId={selectedSessionId}
            canManage={canManage} // Pass down the calculated permission
          />
        )}
      </div>
    </div>
  );
}