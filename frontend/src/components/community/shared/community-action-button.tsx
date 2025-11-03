'use client';

import { useCommunityAuth } from '@/hooks/use-community-auth';
import { useUser } from '@/context/user-provider';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import Settings from 'lucide-react/icons/settings';
import Eye from 'lucide-react/icons/eye';
import LogIn from 'lucide-react/icons/log-in';
import PlusCircle from 'lucide-react/icons/plus-circle';
import Clock from 'lucide-react/icons/clock';
import LogOut from 'lucide-react/icons/log-out';
import type { Community } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';

interface CommunityActionButtonProps {
  community: Community | null;
}

import { cva } from 'class-variance-authority';

const actionButtonVariants = cva(
  "transform-gpu transition-all duration-300 hover:scale-105 liquid-glass-button",
  {
    variants: {
      action: {
        MANAGE: "hover:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 light:border-gray-300",
        VIEW: "hover:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 light:border-gray-300",
        PENDING: "hover:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 light:border-gray-300",
        LEAVE: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        JOIN: "hover:shadow-lg hover:shadow-purple-500/20",
        REQUEST_TO_JOIN: "hover:shadow-lg hover:shadow-purple-500/20",
        LOGIN_TO_JOIN: "hover:shadow-lg hover:shadow-purple-500/20",
        HIDDEN: "",
      },
    },
  }
);

export function CommunityActionButton({ community }: CommunityActionButtonProps) {
  const { user } = useUser();
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const { t } = useTranslation('community');

  const {
    action,
    actionLabel,
    handleAction,
    handleLeave,
    isLoading,
  } = useCommunityAuth({
    community,
    currentUser: user,
  });

  if (!community || action === 'HIDDEN') {
    return null; // Render nothing if there is no community or action is hidden
  }

  const renderIcon = () => {
    if (isLoading) {
      return <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />;
    }
    switch (action) {
      case 'MANAGE':
        return <Settings className="mr-2 h-4 w-4" />;
      case 'VIEW':
        return <Eye className="mr-2 h-4 w-4" />;
      case 'JOIN':
      case 'REQUEST_TO_JOIN':
        return <PlusCircle className="mr-2 h-4 w-4" />;
      case 'PENDING':
        return <Clock className="mr-2 h-4 w-4" />;
      case 'LOGIN_TO_JOIN':
        return <LogIn className="mr-2 h-4 w-4" />;
      case 'LEAVE':
        return <LogOut className="mr-2 h-4 w-4" />;
      default:
        return null;
    }
  };

  const getButtonVariant = () => {
    switch (action) {
      case 'MANAGE':
        return 'secondary';
      case 'VIEW':
      case 'PENDING':
        return 'outline';
      case 'LEAVE':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handleClick = () => {
    if (action === 'LEAVE') {
      setIsLeaveConfirmOpen(true);
    } else if (action === 'MANAGE') {
      if (community) {
        window.location.href = `/dashboard/communities/${community.id}/admin`;
      }
    } else {
      handleAction();
    }
  };

  const handleConfirmLeave = () => {
    handleLeave();
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleClick}
        disabled={isLoading || action === 'PENDING'}
        variant={getButtonVariant()}
        className={actionButtonVariants({ action })}
      >
        {renderIcon()}
        {actionLabel}
      </Button>

      <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('leave_confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('leave_confirm.description')}
              <span className="font-bold"> {community?.name} </span>
              community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('leave_confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>
              {t('leave_confirm.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}