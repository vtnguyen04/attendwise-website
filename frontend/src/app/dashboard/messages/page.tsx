'use client';

import { ChatLayout } from '@/components/messaging/chat-layout';

export default function MessagesPage() {
  return (
    <div className="h-full w-full" data-scroll-anchor>
      <ChatLayout />
    </div>
  );
}
