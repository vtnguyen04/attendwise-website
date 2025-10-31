// app/events/components/event-form/steps/reminders-step.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReminderScheduleBuilder } from '@/components/events/reminder-schedule-builder'; // Adjusted path

export const RemindersStep = () => {
  console.log("Rendering RemindersStep");
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Step 4: Reminders</CardTitle>
        <CardDescription>
          Set up automated reminders to be sent to registered attendees before the event starts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReminderScheduleBuilder name="reminder_schedule" />
      </CardContent>
    </Card>
  );
};