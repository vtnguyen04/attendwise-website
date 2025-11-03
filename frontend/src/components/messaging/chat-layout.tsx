// chat-layout.tsx
'use client';

import { useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ConversationList } from './conversation-list';
import { MessageView } from './message-view';
import MessageSquare from 'lucide-react/icons/message-square';
import Sparkles from 'lucide-react/icons/sparkles';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
type ChatLayoutVariant = 'full' | 'floating';

interface ChatLayoutProps {
  variant?: ChatLayoutVariant;
}

export function ChatLayout({ variant = 'full' }: ChatLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { t } = useTranslation('messenger');

  const containerClass =
    variant === 'full'
      ? 'dashboard-panel h-[calc(100vh-8rem)] w-full p-0 overflow-hidden'
      : 'flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl';

  return (
    <div className={containerClass}>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full w-full"
      >
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="h-full">
          <ConversationList 
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </ResizablePanel>
        
        <ResizableHandle 
          withHandle 
          className={cn(
            "relative bg-border/30 hover:bg-border/50 transition-all duration-300 group",
            "data-[resize-handle-state=drag]:bg-primary/30"
          )}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </ResizableHandle>
        
        <ResizablePanel defaultSize={75} className="h-full">
          {selectedConversationId ? (
            <MessageView conversationId={selectedConversationId} />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="relative max-w-md">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl blur-3xl" />
                
                <div className="relative flex flex-col items-center gap-6 text-center p-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl animate-pulse" />
                    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm shadow-xl border border-border/50">
                      <MessageSquare className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {t('noConversationSelectedTitle')}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                      {t('noConversationSelectedDescription')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50 backdrop-blur-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('readyToChat')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
