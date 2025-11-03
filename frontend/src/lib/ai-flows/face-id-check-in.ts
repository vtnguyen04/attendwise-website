import { verifyCheckin } from '@/lib/services/checkin.service';

interface FaceIdCheckInPayload {
  livePhotoDataUri: string;
  profilePhotoDataUri: string; // This might not be directly used by the backend, but kept for consistency
  eventId: string;
  userId: string;
  sessionId: string;
}

interface FaceIdCheckInResult {
  isMatch: boolean;
  confidence: number;
  message: string;
}

export async function faceIdCheckIn({
  livePhotoDataUri,
  eventId,
  userId,
  sessionId,
}: FaceIdCheckInPayload): Promise<FaceIdCheckInResult> {
  try {
    const response = await verifyCheckin({
      image_data: livePhotoDataUri,
      qr_payload: JSON.stringify({ eventId, userId, sessionId }), // Assuming QR payload can carry this info
    });

    if (response.status) {
      return { isMatch: true, confidence: 0.99, message: response.message || 'Face matched successfully.' };
    } else {
      return { isMatch: false, confidence: 0, message: response.message || 'Face did not match.' };
    }
  } catch (error: unknown) {
    console.error('Error during face ID check-in:', error);
    let message = 'An error occurred during verification.';
    if (error instanceof Error) {
      message = error.message;
    }
    return { isMatch: false, confidence: 0, message };
  }
}
