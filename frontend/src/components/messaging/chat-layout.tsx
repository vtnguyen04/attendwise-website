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
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';

export function ChatLayout() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <GlassCard className="h-[calc(100vh-8rem)] w-full rounded-2xl p-0 overflow-hidden">
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
          className={cn("bg-border/50 hover:bg-border transition-colors")}
        />
        
        <ResizablePanel defaultSize={75} className="h-full">
          {selectedConversationId ? (
            <MessageView conversationId={selectedConversationId} />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-2xl bg-muted/50">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No conversation selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Choose a conversation to start messaging
                  </p>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </GlassCard>
  )
}