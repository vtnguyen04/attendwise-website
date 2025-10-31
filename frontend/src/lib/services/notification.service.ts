import apiClient from '@/lib/api-client';
import type { Notification, NotificationPreferences } from '@/lib/types';

/**
 * Fetches notifications for the current user.
 * Can be used on server or client.
 * @param limit - The number of notifications to fetch.
 * @param offset - The number of notifications to skip.
 */
export async function getNotifications(
  limit: number = 10,
  offset: number = 0
): Promise<{ notifications: Notification[] }> {
  const response = await apiClient.get(
    `/api/v1/notifications?limit=${limit}&offset=${offset}`
  );
  return response.data;
}

/**
 * Marks a specific notification as read.
 * Can be used on server or client.
 * @param notificationId - The ID of the notification to mark as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await apiClient.post(`/api/v1/notifications/${notificationId}/read`);
}



/**

 * Marks all of the user's notifications as read.

 * Can be used on server or client.

 */

export async function markAllNotificationsAsRead(): Promise<void> {

  await apiClient.post(`/api/v1/notifications/read-all`);

}



/**

 * Deletes a specific notification.

 * Can be used on server or client.

 * @param notificationId - The ID of the notification to delete.

 */

export async function deleteNotification(notificationId: string): Promise<void> {

    await apiClient.delete(`/api/v1/notifications/${notificationId}`);

}



/**

 * Fetches the user's notification preferences.

 * Can be used on server or client.

 */

export async function getNotificationPreferences(): Promise<NotificationPreferences> {

    const response = await apiClient.get('/api/v1/notifications/preferences');

    return response.data.preferences;

}



/**

 * Updates the user's notification preferences.

 * Can be used on server or client.

 * @param preferences - The new notification preferences.

 */

export async function updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {

    const response = await apiClient.put('/api/v1/notifications/preferences', preferences);

    return response.data.preferences;

}
