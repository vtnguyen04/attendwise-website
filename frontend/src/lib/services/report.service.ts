// lib/services/report.service.ts
import apiClient from '@/lib/api-client';
import { EventAttendanceReport, CommunityEngagementReport } from '@/lib/types';

/** Fetches the attendance report summary for a specific event. */
export const getEventAttendanceReport = async (eventId: string): Promise<EventAttendanceReport> => {
  const response = await apiClient.get<EventAttendanceReport>(`/reports/events/${eventId}/attendance`);
  return response.data;
};

/**
 * Downloads the attendance report file for an event.
 * Handles fetching the file as a blob for client-side download.
 * @param eventId The ID of the event.
 * @param format The desired file format ('csv' | 'pdf').
 * @returns A Blob containing the file data.
 */
export const downloadEventReport = async (eventId: string, format: 'csv' | 'pdf'): Promise<Blob> => {
  const response = await apiClient.get(`/reports/events/${eventId}/attendance.${format}`, {
    responseType: 'blob',
  });
  return response.data;
};

/** Fetches the engagement report for a specific community. */
export const getCommunityEngagementReport = async (communityId: string): Promise<CommunityEngagementReport> => {
    const response = await apiClient.get<CommunityEngagementReport>(`/reports/communities/${communityId}/engagement`);
    return response.data;
};

/** Fetches the monthly attendance summary. */
interface MonthlyAttendanceSummary {
    month: string;
    count: number;
}

export const getMonthlyAttendanceSummary = async (): Promise<MonthlyAttendanceSummary[]> => {
    const response = await apiClient.get('/reports/summary/monthly');
    return response.data;
};