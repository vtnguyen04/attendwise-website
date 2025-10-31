import apiClient from '@/lib/api-client';

interface VerifyCheckinPayload {
    qr_payload?: string;
    fallback_code?: string;
    image_data?: string;
    liveness_video_stream_data?: string;
    scanner_device_fingerprint?: string;
}

interface VerifyCheckinResponse {
    message: string;
    status: boolean;
    attendee: any; // You might want to define a more specific type for attendee
}

export async function verifyCheckin(payload: VerifyCheckinPayload): Promise<VerifyCheckinResponse> {
    const response = await apiClient.post<VerifyCheckinResponse>('/api/v1/checkin', payload);
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
    const response = await apiClient.post<SyncOfflineCheckinsResponse>('/api/v1/checkin/sync', payload);
    return response.data;
}
