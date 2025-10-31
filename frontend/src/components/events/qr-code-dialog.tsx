// components/events/qr-code-dialog.tsx
'use client';

import { useEffect } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { UseQueryResult } from '@tanstack/react-query';

// Dynamically import react-qr-code to avoid SSR issues
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pass the entire query result to handle loading/error states
  ticketQuery: UseQueryResult<{ qr_payload: string; fallback_code: string }, Error>;
}

export function QRCodeDialog({ open, onOpenChange, ticketQuery }: QRCodeDialogProps) {
  const { data, isFetching, refetch } = ticketQuery;

  // Fetch the ticket data when the dialog opens for the first time
  useEffect(() => {
    if (open && !data) {
      refetch();
    }
  }, [open, data, refetch]);
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      
      {/* Content */}
      <div className="relative glass-card max-w-md w-full p-8 rounded-2xl animate-scale-in shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 ring-4 ring-primary/5">
            <Ticket className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Your Check-in Code</h2>
          <p className="text-sm text-muted-foreground">Present this QR code at the event entrance</p>
        </div>
        
        {isFetching ? (
          <div className="h-[256px] flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Generating your ticket...</p>
          </div>
        ) : data ? (
          <>
            <div className="bg-white p-4 sm:p-6 rounded-xl mb-6 border-2 border-border shadow-inner">
              <QRCode value={data.qr_payload} size={256} level="H" className="w-full h-auto" />
            </div>
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Fallback Code</p>
              <div className="bg-muted/50 py-3 px-4 rounded-lg border-2 border-border/50">
                <p className="text-2xl md:text-3xl font-bold tracking-[0.3em] font-mono">{data.fallback_code}</p>
              </div>
            </div>
          </>
        ) : (
           <div className="h-[256px] flex flex-col items-center justify-center text-center text-destructive">
             <p>Failed to load ticket. Please try again.</p>
           </div>
        )}
        
        <button onClick={() => onOpenChange(false)} className="mt-6 w-full btn-secondary py-3 font-medium">
          Close
        </button>
      </div>
    </div>
  );
}