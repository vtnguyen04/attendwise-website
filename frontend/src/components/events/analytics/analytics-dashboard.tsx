'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileDown, Users, UserCheck, UserX, Percent } from 'lucide-react';
import BarChart3 from 'lucide-react/icons/bar-chart-3';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { AppEvent, EventAttendee, EventAttendanceReport } from '@/lib/types';
import { motion } from 'framer-motion';

import * as EventService from '@/lib/services/event.client.service';
import * as ReportService from '@/lib/services/report.service';

import AttendeeDataTable from '@/components/events/attendee-table/attendee-data-table';
import { SessionSelector } from './session-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StatCard = ({
  title,
  value,
  icon: Icon,
  suffix = '',
  index = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  suffix?: string;
  index?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1, duration: 0.3 }}
  >
    <Card className="dashboard-mini-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {value}
          <span className="text-xl text-primary">{suffix}</span>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface AnalyticsDashboardProps {
  event: AppEvent;
}

export default function AnalyticsDashboard({ event }: AnalyticsDashboardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedSessionId = searchParams.get('sessionId') || event.sessions?.[0]?.id || '';
  const canManage = user?.id === event.created_by;

  const { data: stats, isLoading: isLoadingStats } = useQuery<EventAttendanceReport>({
    queryKey: ['event_report_stats', event.id],
    queryFn: () => ReportService.getEventAttendanceReport(event.id),
  });

  const { data: attendees, isLoading: isLoadingAttendees } = useQuery<EventAttendee[]>({
    queryKey: ['event-attendees', event.id, selectedSessionId],
    queryFn: () => EventService.getEventAttendees(event.id, selectedSessionId),
    enabled: !!selectedSessionId,
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
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export Failed', description: 'Could not generate the report.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-panel p-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 backdrop-glass flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Attendee Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Overall statistics and insights for this event
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('csv')} 
              className="liquid-glass-button"
            >
              <FileDown className="h-4 w-4" />
              <span>CSV</span>
            </button>
            <button 
              onClick={() => handleExport('pdf')} 
              className="liquid-glass-button"
            >
              <FileDown className="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      {isLoadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6">
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Registrations" 
              value={stats.total_registrations} 
              icon={Users} 
              index={0}
            />
            <StatCard 
              title="Total Attendees" 
              value={stats.total_attendees} 
              icon={UserCheck} 
              index={1}
            />
            <StatCard 
              title="Absence Rate" 
              value={stats.absence_rate.toFixed(1)} 
              icon={UserX} 
              suffix="%" 
              index={2}
            />
            <StatCard 
              title="Attendance Rate" 
              value={stats.attendance_rate.toFixed(1)} 
              icon={Percent} 
              suffix="%" 
              index={3}
            />
          </div>
        )
      )}

      {/* Attendee Details Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="dashboard-panel p-6"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="text-xl font-bold">Attendee Details by Session</h4>
              <p className="text-sm text-muted-foreground">
                View and manage attendees for each session
              </p>
            </div>
          </div>

          <SessionSelector
            sessions={event.sessions || []}
            selectedSessionId={selectedSessionId}
            onSessionChange={handleSessionChange}
            disabled={isLoadingAttendees}
            timezone={event.timezone}
          />

          {isLoadingAttendees ? (
            <div className="glass-card p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <AttendeeDataTable
              attendees={attendees || []}
              eventId={event.id}
              sessionId={selectedSessionId}
              canManage={canManage}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
