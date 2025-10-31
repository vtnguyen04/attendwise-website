// lib/schemas/event-form.schema.ts
import * as z from 'zod';

// This schema defines the shape of the data *within* the React Hook Form.
// It uses primitive types (string, Date, number, boolean) that are easy for form inputs to handle.
export const eventFormSchema = z.object({
  community_id: z.string().min(1, 'Please select a community.'),
  name: z.string().min(3, 'Event title must be at least 3 characters long.'),
  description: z.string().optional(),
  cover_image_url: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  
  // Schedule & Location
  start_time: z.date({ required_error: 'Start date is required.' }),
  end_time: z.date({ required_error: 'End date is required.' }),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  location_type: z.enum(['physical', 'online', 'hybrid']).default('physical'),
  location_address: z.string().optional(),
  online_meeting_url: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  
  // Recurrence
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(), // The RRULE string from the builder

  // Registration & Ticketing
  registration_required: z.boolean().default(true),
  registration_opens_at: z.date().nullable().optional(),
  registration_closes_at: z.date().nullable().optional(),
  max_attendees: z.coerce.number().int().positive().optional(),
  
  // Waitlist
  waitlist_enabled: z.boolean().default(false),
  max_waitlist: z.coerce.number().int().positive().optional(),
  
  // Access & Security
  whitelist_only: z.boolean().default(false),
  require_approval: z.boolean().default(false),
  face_verification_required: z.boolean().default(false),
  liveness_check_required: z.boolean().default(false),
  
  // Payment
  is_paid: z.boolean().default(false),
  fee: z.coerce.number().nonnegative().optional(),
  currency: z.string().default('VND'),
  
  // Publication
  status: z.enum(['draft', 'published', 'cancelled']).default('published'),
  
  // Reminders
  reminder_schedule: z.array(z.object({
      offset_minutes: z.coerce.number().int().positive(),
      channels: z.array(z.string()).min(1),
    })).optional(),
}).refine(data => {
  // Ensure end_time is after start_time
  if (data.start_time && data.end_time) {
    return data.end_time > data.start_time;
  }
  return true;
}, {
  message: 'End time must be after start time.',
  path: ['end_time'], // Field to display the error message on
});

// We infer the TypeScript type from the schema
export type EventFormValues = z.infer<typeof eventFormSchema>;