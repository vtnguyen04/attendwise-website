'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyRegistrationForEvent } from '@/lib/services/event.client.service';
import { useEffect } from 'react';

export function MyRegistration({ eventId, children }: { eventId: string, children: (myRegistration: any) => React.ReactNode }) {
  const { data: myRegistration } = useQuery({
    queryKey: ['my-registration', eventId],
    queryFn: () => {
      console.log('queryFn for myRegistration is being called');
      return getMyRegistrationForEvent(eventId);
    },
  });

  useEffect(() => {
    if (myRegistration) {
      console.log('myRegistration query was successful:', myRegistration);
    }
  }, [myRegistration]);

  console.log('myRegistration in MyRegistration component:', myRegistration);

  return <>{children(myRegistration)}</>;
}