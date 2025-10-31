// components/events/actions/check-in-button.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';

interface CheckInButtonProps {
  eventId: string;
}

export function CheckInButton({ eventId }: CheckInButtonProps) {
  const router = useRouter();

  const handleCheckIn = () => {
    // Navigate to the dedicated check-in page/modal for this event
    router.push(`/dashboard/events/${eventId}/check-in`);
  };

  return (
    <Button
      onClick={handleCheckIn}
      className="w-full animate-pulse" // Add a pulsing animation to draw attention
    >
      <ScanLine className="mr-2 h-5 w-5" />
      Check In Now
    </Button>
  );
}