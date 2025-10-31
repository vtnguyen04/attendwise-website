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
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Edit from 'lucide-react/icons/edit';
import LogOut from 'lucide-react/icons/log-out';

// Define a type for the translation function for clarity
type TFunction = (key: string, options?: { [key: string]: string | number }) => string;

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
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t_data_table('select_all')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t_data_table('select_row')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: t_columns('name'),
      cell: ({ row }) => {
        const community = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={community.cover_image_url && community.cover_image_url.String ? community.cover_image_url.String : undefined} alt={community.name} />
              <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{community.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: t_columns('your_role'),
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        const roleKey = `role_${role.toLowerCase()}`;
        return <Badge variant={role === 'admin' ? 'default' : 'secondary'}>{t_columns(roleKey)}</Badge>;
      },
    },
    {
      accessorKey: 'member_count',
      header: t_columns('members'),
    },
    {
      accessorKey: 'created_at',
      header: t_columns('created_at'),
      cell: ({ row }) => {
        return new Date(row.getValue('created_at')).toLocaleDateString();
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const community = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 liquid-glass-button" onClick={(e) => e.stopPropagation()}>
                <span className="sr-only">{t_data_table('open_menu')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t_columns('actions')}</DropdownMenuLabel>
              {(community.role === 'community_admin') && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(community); }}>
                  <Edit className="mr-2 h-4 w-4" /> {t_data_table('edit_button')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onLeave(community); }}
                className="text-destructive focus:text-destructive"
                disabled={community.role === 'community_admin'} // Disable if user is admin
              >
                <LogOut className="mr-2 h-4 w-4" /> {t_data_table('leave_button')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}