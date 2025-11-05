'use client';

import { useState } from 'react';
import MessageCircle from 'lucide-react/icons/message-circle';
import X from 'lucide-react/icons/x';
import Minus from 'lucide-react/icons/minus';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/messaging/chat-layout';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';

export function FloatingMessenger() {
  const pathname = usePathname();
  const { t } = useTranslation('messenger');

  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const isOpen = isMessengerOpen && !pathname.startsWith('/dashboard/messages');

  return (
    <>
      {!pathname.startsWith('/dashboard/messages') && (
        <>
          {isOpen && (
            <div className="fixed bottom-24 right-6 z-[1100] flex w-[600px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {t('title')}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => setIsMessengerOpen(false)}
                    aria-label="Minimize chat"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setIsMessengerOpen(false)}
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-[500px] w-full">
                <ChatLayout variant="floating" />
              </div>
            </div>
          )}

          <Button
            size="icon"
            className={cn(
              'fixed bottom-6 right-6 z-[1090] h-14 w-14 rounded-full shadow-lg transition-transform',
              isOpen ? 'rotate-12 shadow-primary/40' : 'hover:-translate-y-1'
            )}
            onClick={() => setIsMessengerOpen((prev) => !prev)}
            aria-label="Toggle messenger"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </>
      )}
    </>
  );
}

