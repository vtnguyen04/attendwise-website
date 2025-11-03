'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

import { Input } from '@/components/ui/input';
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
  const router = useRouter();
  const { toast } = useToast();
  
  // State management
  const [data, setData] = useState(initialData);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [communityToLeave, setCommunityToLeave] = useState<Community | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Memoized handlers wrapped in useCallback
  const handleEdit = useCallback((community: Community) => {
    router.push(`/dashboard/communities/${community.id}/admin`);
  }, [router]);

  const handleLeave = useCallback((community: Community) => {
    setCommunityToLeave(community);
  }, []);

  const handleLeaveCommunity = useCallback(async () => {
    if (!communityToLeave || isLeaving) return;
    
    setIsLeaving(true);
    try {
      await apiClient.delete(`/communities/${communityToLeave.id}/members/me`);
      
      toast({
        title: t('leave_success_title') || 'Success',
        description: t('leave_success_description', { name: communityToLeave.name }) || `You have left ${communityToLeave.name}.`,
      });
      
      setData(prev => prev.filter(c => c.id !== communityToLeave.id));
      router.refresh();
    } catch (error) {
      console.error('Failed to leave community:', error);
      toast({
        title: t('leave_error_title') || 'Error',
        description: t('leave_error_description') || 'Failed to leave community. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
      setCommunityToLeave(null);
    }
  }, [communityToLeave, isLeaving, toast, t, router]);

  const handleRowClick = useCallback((row: Community) => {
    router.push(`/dashboard/communities/${row.id}`);
  }, [router]);

  // Translation helpers
  const t_columns = useCallback((key: string) => {
    const map: Record<string, string> = {
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
  }, []);

  const t_data_table = useCallback((key: string) => {
    return key.replace('_', ' ');
  }, []);

  // Memoized columns - now stable because handlers are wrapped in useCallback
  const columns = useMemo(
    () => createColumns(t_columns, t_data_table, handleEdit, handleLeave),
    [t_columns, t_data_table, handleEdit, handleLeave]
  );

  // Table instance - warnings are suppressed as TanStack Table's API is designed this way
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      rowSelection,
      globalFilter,
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Calculate pagination info
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const startRow = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1;
  const endRow = Math.min(startRow + table.getState().pagination.pageSize - 1, data.length);
  const filteredRowsCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-6">
      {/* Toolbar với Dashboard Toolbar Style */}
      <div className="dashboard-toolbar">
        <div className="relative w-full max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
          <Input
            placeholder={t('search_placeholder') || 'Search your communities...'}
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9 input-elevated"
          />
        </div>
        
        {/* Results counter */}
        <div className="flex items-center gap-2">
          <span className="caps-label text-xs text-muted-foreground">
            {filteredRowsCount} {t('communities_found') || 'communities'}
          </span>
        </div>
      </div>

      {/* Table với Feed Card Style */}
      <div className="feed-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="font-semibold text-foreground/90 bg-muted/20 backdrop-glass"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
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
                  className="cursor-pointer border-border/30 transition-all duration-300 hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {t('no_results') || 'No communities found'}
                      </p>
                      {globalFilter && (
                        <p className="text-sm text-muted-foreground">
                          {t('no_results_for') || 'Try adjusting your search'}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination với Dashboard Panel Style */}
      {table.getPageCount() > 0 && (
        <div className="dashboard-panel p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page info */}
            <div className="text-sm text-muted-foreground">
              {t('showing') || 'Showing'}{' '}
              <span className="font-semibold text-foreground">{startRow}</span>
              {' '}{t('to') || 'to'}{' '}
              <span className="font-semibold text-foreground">{endRow}</span>
              {' '}{t('of') || 'of'}{' '}
              <span className="font-semibold text-foreground">{data.length}</span>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="hidden sm:flex h-9 w-9 liquid-glass-button"
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="liquid-glass-button"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('previous_button') || 'Previous'}
              </Button>
              
              {/* Page indicator với Glass Card Style */}
              <div className="glass-card px-4 py-2 min-w-[80px] text-center">
                <span className="text-sm font-semibold text-foreground">
                  {currentPage} / {totalPages}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="liquid-glass-button"
              >
                {t('next_button') || 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="hidden sm:flex h-9 w-9 liquid-glass-button"
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog với Glass Card Style */}
      <AlertDialog open={!!communityToLeave} onOpenChange={() => !isLeaving && setCommunityToLeave(null)}>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              {t('leave_confirm_title') || 'Are you sure?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed text-muted-foreground">
              {t('leave_confirm_description') || 'You are about to leave'}{' '}
              <span className="font-bold text-foreground">{communityToLeave?.name}</span>.{' '}
              {t('leave_confirm_note') || 'You will need to be invited back to rejoin.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              disabled={isLeaving}
              className="liquid-glass-button"
            >
              {t('cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveCommunity}
              disabled={isLeaving}
              className="cta-button bg-destructive hover:bg-destructive/90"
            >
              {isLeaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('leaving') || 'Leaving...'}
                </>
              ) : (
                t('leave') || 'Leave'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}