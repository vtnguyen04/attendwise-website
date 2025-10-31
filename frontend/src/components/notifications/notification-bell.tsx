
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

  const notifications = data || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification: any) => {
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
      <PopoverContent align="end" className="w-80 md:w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0 || markAllAsReadMutation.isPending}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
            </Button>
        </div>
        <ScrollArea className="h-96">
            {isLoading ? (
                <NotificationSkeleton />
            ) : error ? (
                <div className="text-center p-4 text-sm text-destructive">
                    Failed to load notifications.
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center p-8 text-sm text-muted-foreground">
                    You have no new notifications.
                </div>
            ) : (
                <div className="divide-y">
                    {notifications.map(notification => (
                        <NotificationItem 
                            key={notification.id} 
                            notification={notification} 
                            onClick={() => handleNotificationClick(notification)}
                        />
                    ))}
                </div>
            )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
            <Link href="/dashboard/notifications" passHref>
                <Button variant="link" className="w-full" onClick={() => setIsOpen(false)}>
                    View all notifications
                </Button>
            </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
