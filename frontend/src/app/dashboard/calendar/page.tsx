// src/app/dashboard/calendar/page.tsx (ĐÃ TỐI ƯU)

import { getMyRegisteredEvents } from '@/lib/services/event.server.service';
import type { RegistrationWithEventDetails } from '@/lib/types';
import CalendarClientWrapper from '@/components/calendar/CalendarClientWrapper';

export default async function CalendarPage() {
  const registrations: RegistrationWithEventDetails[] = await getMyRegisteredEvents();

  return <CalendarClientWrapper registrations={registrations} />;
}
