'use client';

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
// Import các hook khác nếu cần, ví dụ:
// import { useRealtimePostEvents } from '@/hooks/useRealtimePostEvents';

// Component này không render gì cả, chỉ để kích hoạt các hook lắng nghe
export function RealtimeManager() {
  useRealtimeMessages();
  // useRealtimePostEvents();
  
  return null;
}