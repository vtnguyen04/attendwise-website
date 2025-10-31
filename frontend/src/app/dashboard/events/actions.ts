'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateEventPaths(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events`); // Revalidate the main events list page as well
}