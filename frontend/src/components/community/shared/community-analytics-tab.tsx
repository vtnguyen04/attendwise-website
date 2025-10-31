'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import Users from 'lucide-react/icons/users';
import MessageSquare from 'lucide-react/icons/message-square';
import CalendarDays from 'lucide-react/icons/calendar-days';
import TrendingUp from 'lucide-react/icons/trending-up';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme
import { cn } from '@/lib/utils';

interface CommunityAnalyticsTabProps {
  communityId: string;
}

// Placeholder for fetching analytics data
async function fetchCommunityAnalytics(communityId: string) {
  // Simulate API call
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        totalMembers: 120,
        newMembersLastMonth: 15,
        totalPosts: 500,
        newPostsLastMonth: 50,
        totalEvents: 10,
        avgEventAttendance: 75,
      });
    }, 1000);
  });
}

export default function CommunityAnalyticsTab({ communityId }: CommunityAnalyticsTabProps) {
  const { t } = useTranslation('communities');
  const theme = useTheme(); // 👈 Lấy theme hiện tại
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchCommunityAnalytics(communityId).then(data => {
      setAnalytics(data);
      setIsLoading(false);
    });
  }, [communityId]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card 
            key={i}
            className={cn(
              "transform-gpu transition-all duration-300 hover:translate-y-[-5px] glass-card"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <p className={cn(
        "text-muted-foreground",
        theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
      )}>
        {t('analytics.no_data')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-glass-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className={cn(
              "text-sm font-medium",
              theme === 'dark' ? 'dark:text-gray-300' : 'light:text-gray-700'
            )}>
              {t('analytics.total_members')}
            </CardTitle>
            <Users className={cn(
              "h-4 w-4",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              theme === 'dark' ? 'dark:text-white' : 'light:text-gray-900'
            )}>
              {analytics.totalMembers}
            </div>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )}>
              {t('analytics.new_members_last_month', { count: analytics.newMembersLastMonth })}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-glass-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className={cn(
              "text-sm font-medium",
              theme === 'dark' ? 'dark:text-gray-300' : 'light:text-gray-700'
            )}>
              {t('analytics.total_posts')}
            </CardTitle>
            <MessageSquare className={cn(
              "h-4 w-4",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              theme === 'dark' ? 'dark:text-white' : 'light:text-gray-900'
            )}>
              {analytics.totalPosts}
            </div>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )}>
              {t('analytics.new_posts_last_month', { count: analytics.newPostsLastMonth })}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-glass-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className={cn(
              "text-sm font-medium",
              theme === 'dark' ? 'dark:text-gray-300' : 'light:text-gray-700'
            )}>
              {t('analytics.total_events')}
            </CardTitle>
            <CalendarDays className={cn(
              "h-4 w-4",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              theme === 'dark' ? 'dark:text-white' : 'light:text-gray-900'
            )}>
              {analytics.totalEvents}
            </div>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )}>
              {t('analytics.avg_event_attendance', { rate: analytics.avgEventAttendance })}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-glass-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className={cn(
              "text-sm font-medium",
              theme === 'dark' ? 'dark:text-gray-300' : 'light:text-gray-700'
            )}>
              {t('analytics.engagement_rate')}
            </CardTitle>
            <TrendingUp className={cn(
              "h-4 w-4",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              theme === 'dark' ? 'dark:text-white' : 'light:text-gray-900'
            )}>
              {analytics.avgEventAttendance}%
            </div>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )}>
              {t('analytics.engagement_description')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for charts/graphs */}
      <Card className="bg-glass-interactive">
        <CardHeader>
          <CardTitle className={cn(
            theme === 'dark' ? 'dark:text-white' : 'light:text-gray-900'
          )}>
            {t('analytics.member_growth_chart_title')}
          </CardTitle>
          <CardDescription className={cn(
            theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
          )}>
            {t('analytics.member_growth_chart_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "h-[300px] flex items-center justify-center rounded-md",
            theme === 'dark' ? 'dark:bg-slate-800/50' : 'light:bg-gray-100'
          )}>
            <p className={cn(
              "text-muted-foreground",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )}>
              {t('analytics.chart_placeholder')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-glass-interactive">
        <CardHeader>
          <CardTitle className={cn(
            theme === 'dark' ? 'dark:text-white' : 'light:text-gray-900'
          )}>
            {t('analytics.post_engagement_chart_title')}
          </CardTitle>
          <CardDescription className={cn(
            theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
          )}>
            {t('analytics.post_engagement_chart_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "h-[300px] flex items-center justify-center rounded-md",
            theme === 'dark' ? 'dark:bg-slate-800/50' : 'light:bg-gray-100'
          )}>
            <p className={cn(
              "text-muted-foreground",
              theme === 'dark' ? 'dark:text-gray-400' : 'light:text-gray-600'
            )}>
              {t('analytics.chart_placeholder')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}