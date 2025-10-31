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
import { useTheme } from '@/hooks/use-theme';
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

interface CommunityActionButtonProps {
  community: Community | null;
}

export function CommunityActionButton({ community }: CommunityActionButtonProps) {
  const { user } = useUser();
  const theme = useTheme();
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

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

  const getButtonClass = () => {
    const baseClass = "transform-gpu transition-all duration-300 hover:scale-105 liquid-glass-button";
    
    switch (action) {
      case 'MANAGE':
      case 'VIEW':
      case 'PENDING':
        return `${baseClass} ${
          theme === 'dark' 
            ? 'hover:bg-gray-700 dark:border-gray-600' 
            : 'hover:bg-gray-100 light:border-gray-300'
        }`;
      case 'LEAVE':
        return `${baseClass} bg-destructive text-destructive-foreground hover:bg-destructive/90`;
      default:
        return `${baseClass} ${
          theme === 'dark' 
            ? 'hover:shadow-lg hover:shadow-purple-500/20' 
            : 'hover:shadow-lg hover:shadow-purple-400/20'
        }`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (action === 'LEAVE') {
      setIsLeaveConfirmOpen(true);
    } else if (action === 'MANAGE') {
      // For manage action, we want to navigate to the admin page directly
      // The handleAction in useCommunityAuth does not handle navigation for MANAGE
      // So we handle it here.
      if (community) {
        window.location.href = `/dashboard/communities/${community.id}/admin`;
      }
    } else {
      handleAction();
    }
  };

  const handleConfirmLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleLeave();
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleClick}
        disabled={isLoading || action === 'PENDING'}
        variant={getButtonVariant()}
        className={getButtonClass()}
      >
        {renderIcon()}
        {actionLabel}
      </Button>

      <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will no longer be a member of the
              <span className="font-bold"> {community?.name} </span>
              community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}