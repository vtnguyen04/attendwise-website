'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Check, LogIn, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EventAttendee } from '@/lib/types';
import { extractStringValue } from '@/lib/utils';
import { useUser } from '@/context/user-provider';
import { UseMutationResult } from '@tanstack/react-query';

// Props to pass mutation handlers and permissions down to the actions cell
import { User } from '@/lib/types'; // Import User type

// Props to pass mutation handlers and permissions down to the actions cell
type GetColumnsProps = {
  canManage: boolean;
  approveMutation: UseMutationResult<void, Error, { eventId: string; registrationId: string; }>;
  checkinMutation: UseMutationResult<void, Error, { sessionId: string; userId: string; }>;
  removeMutation: UseMutationResult<void, Error, string>;
  eventId: string;
  sessionId: string;
  currentUser: User | null; // Add currentUser to props
};

export const getAttendeeColumns = ({
  canManage,
  approveMutation,
  checkinMutation,
  removeMutation,
  eventId,
  sessionId,
  currentUser, // Destructure currentUser
}: GetColumnsProps): ColumnDef<EventAttendee>[] => {
  // const { user } = useUser(); // REMOVE THIS LINE

  return [
    {
      accessorKey: 'user_name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage
              src={extractStringValue(row.original.user_profile_picture_url) || ''}
              alt={row.original.user_name}
            />
            <AvatarFallback>
              {row.original.user_name ? row.original.user_name.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.user_name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'user_email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return <Badge variant="secondary" className="capitalize">{role}</Badge>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Registration Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
        if (status === 'registered' || status === 'attended') variant = 'default';
        if (status === 'pending') variant = 'outline';
        if (status === 'cancelled' || status === 'no_show') variant = 'destructive';
        return <Badge variant={variant} className="capitalize">{status.replace('_', ' ')}</Badge>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const attendee = row.original;

        // An admin can't perform actions on themselves
        const isSelf = attendee.user_id === currentUser?.id; // Use currentUser

        if (!canManage) {
          return null; // Don't show the menu if the user has no management permissions
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              
              {attendee.status === 'pending' && (
                <DropdownMenuItem
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ eventId, registrationId: attendee.id })}
                >
                  <Check className="mr-2 h-4 w-4" /> Approve
                </DropdownMenuItem>
              )}

              {/* Can check-in anyone who is registered but not yet attended */}
              {(attendee.status === 'registered' || attendee.status === 'pending') && (
                <DropdownMenuItem
                  disabled={checkinMutation.isPending}
                  onClick={() => checkinMutation.mutate({ sessionId, userId: attendee.user_id })}
                >
                  <LogIn className="mr-2 h-4 w-4" /> Manual Check-in
                </DropdownMenuItem>
              )}

              {/* Admin can remove anyone except themselves */}
              {!isSelf && (
                <DropdownMenuItem
                  className="text-red-600"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(attendee.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};