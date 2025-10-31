import { AppEvent } from './types';
import { extractStringValue } from '@/lib/utils';

export function generateIcsFile(event: AppEvent): string {
  const startDate = event.start_time?.Valid ? new Date(event.start_time.Time) : new Date();
  const endDate = event.end_time?.Valid ? new Date(event.end_time.Time) : new Date();

  const formatDateTime = (date: Date) => {
    return date.toISOString().replace(/[-:]|\.\d{3}/g, '').substring(0, 15) + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AttendWise//NONSGML v1.0//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@attendwise.com`,
    `DTSTAMP:${formatDateTime(new Date())}`,
    `DTSTART:${formatDateTime(startDate)}`,
    `DTEND:${formatDateTime(endDate)}`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:${extractStringValue(event.description) || ''}`,
    `LOCATION:${extractStringValue(event.location_address) || extractStringValue(event.online_meeting_url) || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  return icsContent;
}

export function downloadIcsFile(event: AppEvent) {
  const icsContent = generateIcsFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.name.replace(/\s/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
