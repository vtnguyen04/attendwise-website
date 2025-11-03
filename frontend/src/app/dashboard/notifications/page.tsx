
'use client';

import { useState } from 'react';
import { useNotifications, useMarkNotificationAsRead } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notifications/notification-item';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { CheckCheck, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIFICATIONS_PER_PAGE = 15;

import { Notification as AppNotification } from '@/lib/types';

const cardBaseClasses =
  'rounded-xl border border-border/60 bg-card/90 shadow-sm transition-colors hover:border-primary/40 hover:bg-card/95';

function NotificationsPageSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`${cardBaseClasses} flex items-start gap-3 p-4`}>
                    <Skeleton className="h-6 w-6 rounded-full mt-1 bg-muted/40" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full bg-muted/40" />
                        <Skeleton className="h-3 w-1/2 bg-muted/30" />
                    </div>
                    <Skeleton className="h-2.5 w-2.5 rounded-full bg-muted/40" />
                </div>
            ))}
        </div>
    )
}

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useNotifications(NOTIFICATIONS_PER_PAGE, page * NOTIFICATIONS_PER_PAGE);
  const markAsReadMutation = useMarkNotificationAsRead();

  const notifications = data || [];

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link?.String) {
      router.push(notification.link.String);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  return (
    <div
      className="rounded-3xl border border-border/50 bg-card/95 shadow-glass backdrop-blur-md p-4 sm:p-6"
      data-scroll-anchor
    >
      <div className="flex flex-row items-center justify-between pb-6 border-b border-border/40 mb-6">
        <div>
            <h1 className="text-2xl font-bold">All Notifications</h1>
            <p className="text-muted-foreground text-sm">Here is a list of all your notifications.</p>
        </div>
        <Button variant="outline" disabled> 
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
        </Button>
      </div>
      <div>
        {isLoading ? (
          <NotificationsPageSkeleton />
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
            <BellOff className="h-12 w-12" />
            <p>You don&apos;t have any notifications yet.</p>
          </div>
        ) : (
          <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
            <AnimatePresence>
              {notifications.map((notification: AppNotification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onClick={() => handleNotificationClick(notification)}
                  className={`${cardBaseClasses} p-4 cursor-pointer`}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/40">
            <Button 
                variant="outline" 
                onClick={() => setPage(p => p - 1)} 
                disabled={page === 0 || isLoading}
            >
                Previous
            </Button>
            <span className="text-sm text-muted-foreground">
                Page {page + 1}
            </span>
            <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)} 
                disabled={notifications.length < NOTIFICATIONS_PER_PAGE || isLoading}
            >
                Next
            </Button>
        </div>
      </div>
    </div>
  );
}
