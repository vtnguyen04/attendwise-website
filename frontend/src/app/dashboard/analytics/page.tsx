'use client';

import { useQuery } from '@tanstack/react-query';
import BarChart from 'lucide-react/icons/bar-chart';
import Users from 'lucide-react/icons/users';
import Calendar from 'lucide-react/icons/calendar';
import Percent from 'lucide-react/icons/percent';
import apiClient from '@/lib/api-client';
const MotionDiv = dynamic(() => import('framer-motion').then((mod) => mod.motion.div), { ssr: false });

import AnimatedStatCard from '@/components/analytics/animated-stat-card';
import dynamic from 'next/dynamic';

const TrendChart = dynamic(() => import('@/components/analytics/trend-chart').then(mod => mod.TrendChart), {
  loading: () => <Skeleton className="lg:col-span-4 h-96" />,
  ssr: false,
});
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';

interface MonthlySummary {
  month: string;
  total_events: number;
  total_attendees: number;
  average_attendance_rate: number;
}

const DashboardSkeleton = () => (
    <div className="space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            <Skeleton className="lg:col-span-4 h-96" />
            <Skeleton className="lg:col-span-3 h-96" />
        </div>
    </div>
);

export default function GlobalAnalyticsPage() {
  const { t } = useTranslation();

  const { data: summary, isLoading } = useQuery<MonthlySummary>({
    queryKey: ['global_monthly_summary'],
    queryFn: async () => (await apiClient.get('/reports/summary/monthly')).data,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    },
  };

  const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <MotionDiv 
        className="space-y-8"
        data-scroll-anchor
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <MotionDiv variants={itemVariants} className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart className="h-10 w-10"/>
            {t('analytics.dashboard_title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
          {t('analytics.dashboard_description')}
          </p>
        </MotionDiv>

        {summary ? (
            <MotionDiv variants={itemVariants} className="space-y-6">
                <h2 className="text-2xl font-semibold">{t('analytics.monthly_summary', { month: summary.month })}</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <AnimatedStatCard title={t('analytics.total_events')} value={summary.total_events.toLocaleString()} icon={Calendar} description={t('analytics.total_events_description')} />
                    <AnimatedStatCard title={t('analytics.total_attendees')} value={summary.total_attendees.toLocaleString()} icon={Users} description={t('analytics.total_attendees_description')} />
                    <AnimatedStatCard title={t('analytics.avg_attendance_rate')} value={`${summary.average_attendance_rate.toFixed(1)}%`} icon={Percent} description={t('analytics.avg_attendance_rate_description')} />
                    <AnimatedStatCard title={t('analytics.new_users')} value="N/A" icon={Users} description={t('analytics.new_users_description')} />
                </div>
            </MotionDiv>
        ) : (
            <p className="text-muted-foreground">{t('analytics.monthly_summary_error')}</p>
        )}

        {/* Placeholder for new components */}
        <MotionDiv variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="lg:col-span-4">
                <TrendChart />
            </div>
            <Card className="lg:col-span-3 h-96 flex items-center justify-center">
                <p className="text-muted-foreground">{t('analytics.top_lists_placeholder')}</p>
            </Card>
        </MotionDiv>
    </MotionDiv>
  );
}
