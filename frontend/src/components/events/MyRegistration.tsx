'use client';

import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyRegistrationForEvent } from '@/lib/services/event.client.service';

import { EventAttendee } from '@/lib/types';

type MyRegistrationProps = {
  eventId: string;
  children: (myRegistration: EventAttendee | undefined) => ReactNode;
};

export function MyRegistration({ eventId, children }: MyRegistrationProps) {
  const { data: myRegistration } = useQuery<EventAttendee>({
    queryKey: ['my-registration', eventId] as const,
    queryFn: () => {
      console.log('queryFn for myRegistration is being called');
      return getMyRegistrationForEvent(eventId);
    },
    // có thể thêm staleTime, gcTime, enabled, select... nếu cần
  });

  useEffect(() => {
    console.log('myRegistration in MyRegistration component:', myRegistration);
    if (myRegistration !== undefined) {
      console.log('myRegistration query was successful:', myRegistration);
    }
  }, [myRegistration]);

  return <>{children(myRegistration)}</>;
}
