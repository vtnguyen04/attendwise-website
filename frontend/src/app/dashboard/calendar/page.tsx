// src/app/dashboard/calendar/page.tsx (ĐÃ TỐI ƯU)

import { getMyRegisteredEvents } from '@/lib/services/event.server.service';
import type { RegistrationWithEventDetails } from '@/lib/types';
import CalendarClientWrapper from '@/components/calendar/CalendarClientWrapper';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const registrations: RegistrationWithEventDetails[] = await getMyRegisteredEvents();

  return (
    <div data-primary-content>
      <div data-scroll-anchor>
        <CalendarClientWrapper registrations={registrations} />
      </div>
    </div>
  );
}
