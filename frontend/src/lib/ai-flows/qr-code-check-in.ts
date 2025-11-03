import apiClient from '@/lib/api-client';

export type ScanResult = {
    success: boolean;
    message: string;
    attendeeName?: string;
    // Add other relevant fields from the API response if needed
}

interface QrCheckInPayload {
    qrData: string;
    // Potentially add image_data, liveness_video_stream_data, scanner_device_fingerprint
    // based on the full API spec for /checkin
}

export async function qrCodeCheckIn(payload: QrCheckInPayload): Promise<ScanResult> {
    try {
        // Simulate API call to POST /checkin
        const response = await apiClient.post('api/v1/checkin', {
            qr_payload: payload.qrData,
            // For now, we're only sending qr_payload. 
            // FaceID and liveness data would be added here if available from the scanner.
        });

        // Assuming API response structure matches ScanResult
        // The API docs show: { "message": "Check-in successful", "status": true, "user": { /* User Object Subset */ } }
        // We need to map this to ScanResult
        const apiResponse = response.data;

        if (apiResponse.status) {
            return {
                success: true,
                message: apiResponse.message || "Check-in successful",
                attendeeName: apiResponse.attendee?.user_name, // Correctly extract from attendee object
            };
        } else {
            return {
                success: false,
                message: apiResponse.message || "Check-in failed",
            };
        }
    } catch (error: unknown) {
        console.error("Error during QR code check-in:", error);
        let errorMessage = "An unexpected error occurred during check-in.";
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const response = (error as { response?: { data?: { error?: string } } }).response;
            if (response?.data?.error) {
                errorMessage = response.data.error;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return {
            success: false,
            message: errorMessage,
        };
    }
}
