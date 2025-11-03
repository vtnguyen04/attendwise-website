
'use client';

import { useState } from 'react';
import Bell from 'lucide-react/icons/bell';
import CheckCheck from 'lucide-react/icons/check-check';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/use-notifications';
import { NotificationItem } from './notification-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Notification as AppNotification } from '@/lib/types';

import { useTranslation } from '@/hooks/use-translation';

function NotificationSkeleton() {
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        </div>
    )
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error } = useNotifications(15, 0);
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const { t } = useTranslation('notifications');

  const notifications = data || [];
  const unreadCount = notifications.filter((n: AppNotification) => !n.is_read).length;

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
        markAsReadMutation.mutate(notification.id);
    }
    if (notification.link?.String) {
        router.push(notification.link.String);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 md:w-96 p-0 rounded-2xl border border-border/60 bg-card/95 shadow-glass backdrop-blur-md"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="font-semibold text-lg">{t('bell.title')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="text-muted-foreground hover:text-foreground"
            >
                <CheckCheck className="h-4 w-4 mr-2" />
                {t('bell.mark_all_as_read')}
            </Button>
        </div>
        <ScrollArea className="h-96">
            {isLoading ? (
                <NotificationSkeleton />
            ) : error ? (
                <div className="text-center p-4 text-sm text-destructive">
                    {t('bell.load_failed')}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center p-8 text-sm text-muted-foreground">
                    {t('bell.no_notifications')}
                </div>
            ) : (
                <div className="divide-y divide-border/40">
                    {notifications.map(notification => (
                        <NotificationItem 
                            key={notification.id} 
                            notification={notification} 
                            onClick={() => handleNotificationClick(notification)}
                            className="px-4 py-3 transition-colors hover:bg-muted/20 focus:bg-muted/30"
                        />
                    ))}
                </div>
            )}
        </ScrollArea>
        <div className="px-4 py-3 border-t border-border/50 text-center">
            <Link href="/dashboard/notifications" passHref>
                <Button variant="link" className="w-full" onClick={() => setIsOpen(false)}>
                    {t('bell.view_all')}
                </Button>
            </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
