'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Community } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  LogOut,
  ArrowUpDown,
  Shield,
  Users,
  Calendar,
  Crown,
  UserCheck,
} from 'lucide-react';
import { getSafeImageUrl, extractStringValue } from '@/lib/utils';

// Define a type for the translation function for clarity
type TFunction = (key: string, options?: Record<string, string | number>) => string;

// Role configuration with icons and variants
const getRoleConfig = (role: string): { 
  variant: 'default' | 'secondary' | 'outline'; 
  icon: typeof Shield;
  label: string;
} => {
  const roleMap: Record<string, { 
    variant: 'default' | 'secondary' | 'outline'; 
    icon: typeof Shield;
    label: string;
  }> = {
    community_admin: { variant: 'default', icon: Crown, label: 'Admin' },
    moderator: { variant: 'secondary', icon: Shield, label: 'Moderator' },
    member: { variant: 'outline', icon: UserCheck, label: 'Member' },
    pending: { variant: 'outline', icon: UserCheck, label: 'Pending' },
  };
  return roleMap[role.toLowerCase()] || { variant: 'outline', icon: UserCheck, label: role };
};

// Format date with better formatting
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

// Format member count
const formatMemberCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const createColumns = (
  t_columns: TFunction,
  t_data_table: TFunction,
  onEdit: (community: Community) => void,
  onLeave: (community: Community) => void
): ColumnDef<Community>[] => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t_data_table('select_all') || 'Select all'}
          className="border-border/60"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t_data_table('select_row') || 'Select row'}
          className="border-border/60"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">{t_columns('name') || 'Name'}</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const community = row.original;
        const imageUrl = getSafeImageUrl(
          community.cover_image_url && 
          typeof community.cover_image_url === 'object' && 
          'String' in community.cover_image_url
            ? community.cover_image_url.String
            : extractStringValue(community.cover_image_url)
        );
        const initial = community.name.charAt(0).toUpperCase();

        return (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-10 w-10 ring-2 ring-border/50">
              <AvatarImage src={imageUrl} alt={community.name} />
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                {community.name}
              </span>
              {community.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {extractStringValue(community.description)}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">{t_columns('your_role') || 'Your Role'}</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = (row.getValue('role') as string) || 'member';
        const config = getRoleConfig(role);
        const Icon = config.icon;

        return (
          <Badge 
            variant={config.variant} 
            className="font-medium gap-1.5 capitalize"
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'member_count',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">{t_columns('members') || 'Members'}</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.getValue('member_count') as number;
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                {formatMemberCount(count)}
              </span>
              <span className="text-xs text-muted-foreground">
                {count.toLocaleString()} total
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">{t_columns('created_at') || 'Created'}</span>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateString = row.getValue('created_at') as string;
        const formattedDate = formatDate(dateString);
        const fullDate = new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {formattedDate}
              </span>
              <span className="text-xs text-muted-foreground" title={fullDate}>
                {fullDate}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="font-semibold">Actions</span>,
      cell: ({ row }) => {
        const community = row.original;
        const isAdmin = community.role === 'community_admin';
        const canEdit = isAdmin;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 liquid-glass-button"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Actions for ${community.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card">
              <DropdownMenuLabel className="font-semibold text-foreground">
                {t_columns('actions') || 'Actions'}
              </DropdownMenuLabel>

              {canEdit && (
                <>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(community);
                    }}
                    className="cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    <span>{t_data_table('edit_button') || 'Edit Community'}</span>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave(community);
                }}
                disabled={isAdmin}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t_data_table('leave_button') || 'Leave Community'}</span>
              </DropdownMenuItem>

              {isAdmin && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Admins cannot leave
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};