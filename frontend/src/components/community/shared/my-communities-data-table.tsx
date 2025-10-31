'use client';

import { useState, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel, // Import necessary model
} from '@tanstack/react-table';

import { Input } from '@/components/ui/input'; // Import Input
import { Search } from 'lucide-react'; // Import Search Icon
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Community } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { createColumns } from '@/components/community/shared/my-communities-columns';
import { useRouter } from 'next/navigation';
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
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface DataTableProps {
  data: Community[];
}

export function MyCommunitiesDataTable({ data: initialData }: DataTableProps) {
  const { t } = useTranslation('data_table');
  const [rowSelection, setRowSelection] = useState({});
  const [data, setData] = useState(initialData);
  const [communityToLeave, setCommunityToLeave] = useState<Community | null>(null);
  const [globalFilter, setGlobalFilter] = useState(''); // State for the search filter
  const router = useRouter();
  const { toast } = useToast();

  const handleEdit = (community: Community) => {
    router.push(`/dashboard/communities/${community.id}/admin`);
  };

  const handleLeave = (community: Community) => {
    setCommunityToLeave(community);
  };

  const handleLeaveCommunity = async () => {
    if (!communityToLeave) return;
    try {
      await apiClient.delete(`/api/v1/communities/${communityToLeave.id}/members/me`);
      toast({ title: 'Success', description: `You have left ${communityToLeave.name}.` });
      setData(prev => prev.filter(c => c.id !== communityToLeave.id));
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to leave community.', variant: 'destructive' });
    }
    setCommunityToLeave(null);
  };

  const t_columns = (key: string) => {
    const map: { [key: string]: string } = {
      'name': 'Name',
      'your_role': 'Your Role',
      'members': 'Members',
      'created_at': 'Created On',
      'actions': 'Actions',
      'role_admin': 'Admin',
      'role_community_admin': 'Admin',
      'role_moderator': 'Moderator',
      'role_member': 'Member',
    };
    return map[key] || key;
  };

  const t_data_table = (key: string) => key.replace('_', ' ');

  const columns = useMemo(
    () => createColumns(t_columns, t_data_table, handleEdit, handleLeave),
    []
  );

  const handleRowClick = (row: Community) => {
    router.push(`/dashboard/communities/${row.id}`);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Enable filtering
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter, // Set filter state
    state: {
      rowSelection,
      globalFilter, // Pass filter state to table
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between py-4">
        <div className="relative w-full max-w-sm">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search your communities..."
             value={globalFilter ?? ''}
             onChange={(event) => setGlobalFilter(event.target.value)}
             className="pl-9 liquid-glass-input"
           />
        </div>
      </div>

      {/* Table */}
      <div className="bg-glass">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => handleRowClick(row.original)}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('no_results')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="bg-glass flex items-center justify-end space-x-2 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="liquid-glass-button"
        >
          {t('previous_button')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="liquid-glass-button"
        >
          {t('next_button')}
        </Button>
      </div>

      {/* Alert Dialog */}
      <AlertDialog open={!!communityToLeave} onOpenChange={() => setCommunityToLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave <span className="font-bold">{communityToLeave?.name}</span>. You will need to be invited back to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveCommunity} className="text-destructive-foreground liquid-glass-button">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}