'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAttendeeColumns } from './attendees-columns';
import { useUser } from '@/context/user-provider';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as EventService from '@/lib/services/event.client.service';
import type { EventAttendee } from '@/lib/types';

interface AttendeeDataTableProps {
  attendees: EventAttendee[];
  eventId: string;
  sessionId: string;
  canManage: boolean;
}

export default function AttendeeDataTable({
  attendees,
  eventId,
  sessionId,
  canManage,
}: AttendeeDataTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const { user: currentUser } = useUser();

  // Memoized mutation options factory
  const mutationOptions = React.useCallback(
    (successMessage: string, queryKey: (string | undefined)[]) => ({
      onSuccess: () => {
        toast({ title: 'Success', description: successMessage });
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (err: Error) =>
        toast({ title: 'Error', description: err.message, variant: 'destructive' }),
    }),
    [toast, queryClient]
  );

  // Mutations with stable options
  const approveMutation = useMutation({
    mutationFn: EventService.approveRegistration,
    ...mutationOptions('Registration approved.', ['event-attendees', eventId, sessionId]),
  });

  const checkinMutation = useMutation({
    mutationFn: EventService.manualCheckin,
    ...mutationOptions('User checked in manually.', ['event-attendees', eventId, sessionId]),
  });

  const removeMutation = useMutation({
    mutationFn: (registrationId: string) =>
      EventService.unregisterFromEvent(eventId, registrationId),
    ...mutationOptions('Attendee removed.', ['event-attendees', eventId, sessionId]),
  });

  // Memoized columns with stable dependencies
  const columns = React.useMemo(
    () =>
      getAttendeeColumns({
        canManage,
        approveMutation,
        checkinMutation,
        removeMutation,
        eventId,
        sessionId,
        currentUser,
      }),
    [canManage, approveMutation, checkinMutation, removeMutation, eventId, sessionId, currentUser]
  );

  // Table instance
  const table = useReactTable({
    data: attendees,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
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
  const pageSize = table.getState().pagination.pageSize;
  const startRow = table.getState().pagination.pageIndex * pageSize + 1;
  const endRow = Math.min((table.getState().pagination.pageIndex + 1) * pageSize, attendees.length);
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="w-full space-y-6">
      {/* Enhanced Toolbar */}
      <div className="dashboard-toolbar">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
          <Input
            placeholder="Search by email..."
            value={(table.getColumn('user_email')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('user_email')?.setFilterValue(event.target.value)
            }
            className="pl-10 input-elevated"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Filter indicator */}
          {columnFilters.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {columnFilters.length} filter{columnFilters.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Attendee count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs caps-label text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-foreground">
                {attendees.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="feed-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-border/50 hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="font-semibold text-foreground/90 bg-muted/20 backdrop-glass"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
                    className="border-border/30 transition-all duration-300 hover:bg-muted/30"
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
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <Users className="h-10 w-10 text-muted-foreground/40" />
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">No attendees found</p>
                        {columnFilters.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your filters
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
      </div>

      {/* Enhanced Pagination */}
      {table.getPageCount() > 0 && (
        <div className="dashboard-panel p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page info */}
            <div className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-foreground">{startRow}</span>
              {' '}-{' '}
              <span className="font-semibold text-foreground">{endRow}</span>
              {' '}of{' '}
              <span className="font-semibold text-foreground">
                {filteredCount}
              </span>
              {filteredCount !== attendees.length && (
                <span className="text-muted-foreground/70">
                  {' '}(filtered from {attendees.length})
                </span>
              )}
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
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              {/* Page indicator */}
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
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
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
    </div>
  );
}