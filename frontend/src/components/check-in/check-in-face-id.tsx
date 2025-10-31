'use client';

import { useState } from 'react';
import type { EventAttendee as Attendee } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Corrected import path
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Corrected import path
import CameraView from './camera-view';
import { Button } from '@/components/ui/button'; // Corrected import path
import { faceIdCheckIn } from '@/lib/ai-flows/face-id-check-in';
import Loader2 from 'lucide-react/icons/loader-2';
import CheckCircle from 'lucide-react/icons/check-circle';
import XCircle from 'lucide-react/icons/x-circle';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Corrected import path
import { getNullableStringValue } from '@/lib/utils';

interface CheckInFaceIdProps {
  attendee: Attendee;
  eventId: string;
  sessionId: string;
  onBack: () => void;
  onCheckInSuccess: (updatedAttendee: Attendee) => void;
}

export default function CheckInFaceId({
  attendee,
  eventId,
  sessionId,
  onBack,
  onCheckInSuccess,
}: CheckInFaceIdProps) {
  const [livePhotoDataUri, setLivePhotoDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isMatch: boolean;
    confidence: number;
    message: string;
  } | null>(null);
  const { toast } = useToast();

  const handleCapture = (imageDataUrl: string) => {
    setLivePhotoDataUri(imageDataUrl);
    setVerificationResult(null);
  };

  const handleClear = () => {
    setLivePhotoDataUri(null);
    setVerificationResult(null);
  };

  const handleVerify = async () => {
    if (!attendee || !livePhotoDataUri) {
      toast({
        title: 'Verification Error',
        description: 'A live photo is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    try {
      // Use a placeholder for the profile picture to avoid CORS issues in dev
      const profilePhotoDataUri =
        'data:image/jpeg;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';


      const result = await faceIdCheckIn({
        livePhotoDataUri,
        profilePhotoDataUri,
        eventId,
        userId: attendee.id,
        sessionId,
      });

      setVerificationResult(result);

      if (result.isMatch) {
        toast({
          title: 'Check-in Successful',
          description: `${attendee.user_name} has been checked in.`,
        });

        const updatedAttendee: Attendee = {
          ...attendee,
          checkedIn: true,
          checkInTime: new Date().toISOString(),
          checkInMethod: 'face_id',
        };
        
        onCheckInSuccess(updatedAttendee);

      } else {
        toast({
          title: 'Check-in Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Face ID check-in failed:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during verification.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={onBack}
        variant="ghost"
        size="icon"
        className="absolute -top-14 -left-4"
      >
        <ArrowLeft />
        <span className="sr-only">Back</span>
      </Button>
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg sr-only">Attendee Profile</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
              <Avatar className="h-48 w-48 border">
                <AvatarImage
                  src={getNullableStringValue(attendee.user_profile_picture_url)}
                />
                <AvatarFallback className="text-4xl">
                  {attendee.user_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-bold text-lg">{attendee.user_name}</p>
                <p className="text-sm text-muted-foreground">{attendee.user_email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Capture Live Photo</h3>
          <CameraView
            onCapture={handleCapture}
            onClear={handleClear}
            capturedImage={livePhotoDataUri}
          />
        </div>
        <div className="md:col-span-2 flex flex-col items-center gap-4">
          <Button
            onClick={handleVerify}
            disabled={!livePhotoDataUri || !attendee || isLoading}
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Verify & Check-in
          </Button>
          {verificationResult && (
            <Alert
              variant={verificationResult.isMatch ? 'default' : 'destructive'}
              className="w-full max-w-md text-center"
            >
              {verificationResult.isMatch ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {verificationResult.isMatch
                  ? 'Match Found'
                  : 'Match Not Found'}
              </AlertTitle>
              <AlertDescription>
                {verificationResult.message} (Confidence:{' '}
                {(verificationResult.confidence * 100).toFixed(2)}%)
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
