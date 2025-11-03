import apiClient from '@/lib/api-client';

interface VerifyCheckinPayload {
    qr_payload?: string;
    fallback_code?: string;
    image_data?: string;
    liveness_video_stream_data?: string;
    scanner_device_fingerprint?: string;
}

interface Attendee {
    user_name: string;
}

interface VerifyCheckinResponse {
    message: string;
    status: boolean;
    attendee: Attendee;
}

export async function verifyCheckin(payload: VerifyCheckinPayload): Promise<VerifyCheckinResponse> {
    const response = await apiClient.post<VerifyCheckinResponse>('/checkin', payload);
    return response.data;
}

interface SyncOfflineCheckinsPayload {
    device_id: string;
    attempts: {
        qr_payload: string;
        image_data?: string;
        scanned_at: string;
        attempt_id: string;
    }[];
}

interface SyncOfflineCheckinsResponse {
    message: string;
    results: {
        attempt_id: string;
        success: boolean;
        message: string;
    }[];
}

export async function syncOfflineCheckins(payload: SyncOfflineCheckinsPayload): Promise<SyncOfflineCheckinsResponse> {
    const response = await apiClient.post<SyncOfflineCheckinsResponse>('/checkin/sync', payload);
    return response.data;
}
