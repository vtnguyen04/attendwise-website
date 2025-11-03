'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Check, LogIn, Trash2, ArrowUpDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EventAttendee, User } from '@/lib/types';
import { extractStringValue, getSafeImageUrl } from '@/lib/utils';
import { UseMutationResult } from '@tanstack/react-query';

// Props to pass mutation handlers and permissions down to the actions cell
type GetColumnsProps = {
  canManage: boolean;
  approveMutation: UseMutationResult<void, Error, { eventId: string; registrationId: string }>;
  checkinMutation: UseMutationResult<void, Error, { sessionId: string; userId: string }>;
  removeMutation: UseMutationResult<void, Error, string>;
  eventId: string;
  sessionId: string;
  currentUser: User | null;
};

// Badge variant helper with proper typing
const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    registered: 'default',
    attended: 'default',
    pending: 'outline',
    cancelled: 'destructive',
    no_show: 'destructive',
  };
  return statusMap[status] || 'secondary';
};

// Role badge variant helper
const getRoleBadgeConfig = (role: string): { variant: 'default' | 'secondary' | 'outline'; icon?: typeof Shield } => {
  const roleMap: Record<string, { variant: 'default' | 'secondary' | 'outline'; icon?: typeof Shield }> = {
    organizer: { variant: 'default', icon: Shield },
    admin: { variant: 'default', icon: Shield },
    moderator: { variant: 'secondary', icon: Shield },
    attendee: { variant: 'outline' },
    member: { variant: 'outline' },
  };
  return roleMap[role] || { variant: 'secondary' };
};

export const getAttendeeColumns = ({
  canManage,
  approveMutation,
  checkinMutation,
  removeMutation,
  eventId,
  sessionId,
  currentUser,
}: GetColumnsProps): ColumnDef<EventAttendee>[] => {
  return [
    {
      accessorKey: 'user_name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">Name</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const profilePictureUrl = getSafeImageUrl(
          extractStringValue(row.original.user_profile_picture_url)
        );
        const userName = row.original.user_name || 'Unknown User';
        const initial = userName.charAt(0).toUpperCase();

        return (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-9 w-9 ring-2 ring-border/50">
              <AvatarImage src={profilePictureUrl} alt={userName} />
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{userName}</span>
              {row.original.user_id === currentUser?.id && (
                <span className="text-xs text-muted-foreground">(You)</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'user_email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">Email</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue('user_email')}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">Role</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = (row.getValue('role') as string)?.toLowerCase() || 'attendee';
        const config = getRoleBadgeConfig(role);
        const Icon = config.icon;

        return (
          <Badge 
            variant={config.variant} 
            className="capitalize font-medium gap-1.5"
          >
            {Icon && <Icon className="h-3 w-3" />}
            {role.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">Status</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = (row.getValue('status') as string)?.toLowerCase() || 'pending';
        const variant = getStatusBadgeVariant(status);
        const displayStatus = status.replace('_', ' ');

        return (
          <Badge variant={variant} className="capitalize font-medium">
            {displayStatus}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="font-semibold">Actions</span>,
      cell: ({ row }) => {
        const attendee = row.original;
        const isSelf = attendee.user_id === currentUser?.id;

        // Don't show actions if user can't manage
        if (!canManage) {
          return (
            <div className="text-xs text-muted-foreground italic">
              No actions
            </div>
          );
        }

        // Check if any action is available
        const canApprove = attendee.status === 'pending';
        const canCheckin = attendee.status === 'registered' || attendee.status === 'pending';
        const canRemove = !isSelf;
        const hasAnyAction = canApprove || canCheckin || canRemove;

        if (!hasAnyAction) {
          return (
            <div className="text-xs text-muted-foreground italic">
              No actions
            </div>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-8 w-8 p-0 liquid-glass-button"
                aria-label={`Actions for ${attendee.user_name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card">
              <DropdownMenuLabel className="font-semibold text-foreground">
                Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />

              {canApprove && (
                <DropdownMenuItem
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ eventId, registrationId: attendee.id })}
                  className="cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
                >
                  <Check className="mr-2 h-4 w-4" />
                  <span>Approve Registration</span>
                </DropdownMenuItem>
              )}

              {canCheckin && (
                <DropdownMenuItem
                  disabled={checkinMutation.isPending}
                  onClick={() => checkinMutation.mutate({ sessionId, userId: attendee.user_id })}
                  className="cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>Manual Check-in</span>
                </DropdownMenuItem>
              )}

              {canRemove && (
                <>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(attendee.id)}
                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Remove Attendee</span>
                  </DropdownMenuItem>
                </>
              )}

              {isSelf && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  You cannot remove yourself
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};