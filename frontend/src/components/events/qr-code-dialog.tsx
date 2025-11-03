// components/events/qr-code-dialog.tsx
'use client';

import { useEffect } from 'react';
import { Ticket, Loader2, X, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { UseQueryResult } from '@tanstack/react-query';

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });
const motion = dynamic(() => import('framer-motion').then((mod) => ({ default: mod.motion.div })), { ssr: false });

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketQuery: UseQueryResult<{ qr_payload: string; fallback_code: string }, Error>;
}

export function QRCodeDialog({ open, onOpenChange, ticketQuery }: QRCodeDialogProps) {
  const { data, isFetching, refetch } = ticketQuery;

  useEffect(() => {
    if (open && !data) {
      refetch();
    }
  }, [open, data, refetch]);
  
  if (!open) return null;

  const MotionDiv = motion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay with backdrop blur */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Content */}
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative dashboard-panel max-w-md w-full p-8 overflow-hidden"
      >
        {/* Decorative gradient background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent rounded-full blur-3xl" />
        </div>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 backdrop-glass hover:bg-muted transition-colors flex items-center justify-center z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 backdrop-glass mb-4 ring-4 ring-primary/5">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Check-in Code</h2>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Present this QR code at the event entrance
            </p>
          </div>
          
          {/* Content */}
          {isFetching ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 backdrop-glass animate-pulse" />
                <Loader2 className="h-8 w-8 animate-spin text-primary absolute inset-0 m-auto" />
              </div>
              <p className="mt-6 text-muted-foreground font-medium">Generating your ticket...</p>
            </div>
          ) : data ? (
            <>
              {/* QR Code */}
              <div className="liquid-glass-card p-6 mb-6">
                <div className="bg-white p-4 rounded-xl">
                  <QRCode value={data.qr_payload} size={256} level="H" className="w-full h-auto" />
                </div>
              </div>
              
              {/* Fallback Code */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Fallback Code
                  </p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                <div className="glass-card p-4 bg-primary/5">
                  <p className="text-3xl font-bold tracking-[0.3em] font-mono text-primary">
                    {data.fallback_code}
                  </p>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Use this code if QR scan fails
                </p>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 backdrop-glass flex items-center justify-center mb-4">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">Failed to load ticket</p>
              <p className="text-sm text-muted-foreground mt-2">Please try again</p>
            </div>
          )}
          
          {/* Action Button */}
          <button 
            onClick={() => onOpenChange(false)} 
            className="liquid-glass-button w-full mt-8"
          >
            <span>Close</span>
          </button>
        </div>
      </MotionDiv>
    </div>
  );
}