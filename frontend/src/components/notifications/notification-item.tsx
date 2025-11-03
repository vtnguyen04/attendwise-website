
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Icons } from '@/components/ui/icons';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSafeImageUrl } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  className?: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
    const Icon = Icons[type as keyof typeof Icons] || Icons.notification; // Fallback icon

    if (!Icon) {
        console.error(`No icon found for type "${type}" and the default "notification" icon is also missing.`);
        return <Icons.default className="h-5 w-5 text-destructive" />;
    }
    
    return <Icon className="h-5 w-5 text-primary" />;
}

const renderContent = (notification: Notification) => {
  switch (notification.type) {
    case 'new_message':
      return (
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getSafeImageUrl(notification.related_user_avatar)} />
            <AvatarFallback>{notification.related_user_name?.String?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{notification.title}</p>
            <p className="text-sm text-muted-foreground truncate">{notification.message}</p>
          </div>
        </div>
      );
    case 'new_comment':
    case 'reaction':
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{notification.title}</p>
          <p className="text-sm text-muted-foreground truncate">{notification.message}</p>
        </div>
      );
    default:
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{notification.title}</p>
          <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: notification.message }} />
        </div>
      );
  }
};

export function NotificationItem({ notification, onClick, className }: NotificationItemProps) {
  return (
    <motion.div
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 p-4 cursor-pointer',
        className
      )}
      variants={{ 
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
      layout
    >
      <div className="flex-shrink-0 mt-1">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1">
        {renderContent(notification)}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2.5 h-2.5 bg-primary rounded-full self-center flex-shrink-0 shadow-[0_0_8px_theme(colors.primary)]" />
      )}
    </motion.div>
  );
}
