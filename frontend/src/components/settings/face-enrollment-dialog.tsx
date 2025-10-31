'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';
import { useUser } from '@/context/user-provider';
import { Icons } from '@/components/ui/icons';
import { Progress } from '@/components/ui/progress';
import Smile from 'lucide-react/icons/smile';
import User from 'lucide-react/icons/user';
import Eye from 'lucide-react/icons/eye';
import CheckCircle from 'lucide-react/icons/check-circle';
import XCircle from 'lucide-react/icons/x-circle';
import Loader2 from 'lucide-react/icons/loader-2';

type EnrollmentStatus = 'idle' | 'starting' | 'streaming' | 'success' | 'error';

interface FaceEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get icon for challenge
const getChallengeIcon = (challenge: string) => {
  switch (challenge) {
    case 'smile': return <Smile className="h-12 w-12 text-white" />;
    case 'front': return <User className="h-12 w-12 text-white" />;
    case 'right': return <User className="h-12 w-12 text-white -scale-x-100" />;
    case 'left': return <User className="h-12 w-12 text-white" />;
    case 'blink eyes': return <Eye className="h-12 w-12 text-white" />;
    default: return null;
  }
};

export default function FaceEnrollmentDialog({ open, onOpenChange }: FaceEnrollmentDialogProps) {
  const { user, setUser } = useUser();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<EnrollmentStatus>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('Get ready to position your face in the frame.');
  const [progress, setProgress] = useState(0);
  const [hasFlowStarted, setHasFlowStarted] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (open && !hasFlowStarted) {
      setHasFlowStarted(true); 
      
      const startFlow = async () => {
        setStatus('starting');
        setFeedbackMessage('Starting camera...');

        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            await videoRef.current.play();
          }
        } catch (err) {
          console.error("[ENROLLMENT] Camera error:", err);
          setFeedbackMessage('Could not access camera. Please check permissions.');
          setStatus('error');
          return;
        }

        let sessionId: string;
        let challenges: string[];
        try {
          setFeedbackMessage('Preparing enrollment session...');
          const response = await apiClient.get('api/v1/users/enroll-challenge');
          sessionId = response.data.session_id;
          challenges = response.data.challenges;
          setStatus('streaming');
        } catch (error) {
          console.error("[ENROLLMENT] Challenge fetch error:", error);
          setFeedbackMessage('Could not start enrollment session.');
          setStatus('error');
          cleanup();
          return;
        }

        let isSuccess = false;
        let finalMessage = 'Enrollment failed. Please try again.';

        for (let i = 0; i < challenges.length; i++) {
          const challenge = challenges[i];
          setCurrentChallenge(challenge);
          if (!streamRef.current) {
              finalMessage = "Camera stream was interrupted.";
              break;
          }

          const progressValue = (i / challenges.length) * 100;
          setProgress(progressValue);
          setFeedbackMessage(`Please ${challenge} for the camera.`);
          await sleep(2000);

          if (!videoRef.current || !canvasRef.current) break;

          const context = canvasRef.current.getContext('2d');
          if (!context) break;
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);
          const frame = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];

          try {
            await apiClient.post('api/v1/users/me/enroll-face', { session_id: sessionId, video_data: frame, consent_given: true });
            isSuccess = true;
            finalMessage = 'Face ID enrolled successfully!';
            break;
          } catch (error: any) {
            const errorMsg = error.response?.data?.error || '';
            if (errorMsg.includes('CHALLENGE_PASSED_CONTINUE')) {
              continue;
            } else {
              isSuccess = false;
              finalMessage = errorMsg || 'An unexpected error occurred.';
              break;
            }
          }
        }
        
        setProgress(isSuccess ? 100 : progress);
        setStatus(isSuccess ? 'success' : 'error');
        setFeedbackMessage(finalMessage);
        if (isSuccess && user) {
          setUser({ ...user, face_id_enrolled: true });
        }
        cleanup();
      };

      startFlow();
    } else if (!open && hasFlowStarted) {
      setHasFlowStarted(false);
      cleanup();
    }
  }, [open, hasFlowStarted, cleanup, setUser, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Face ID Enrollment</DialogTitle>
          <DialogDescription className="min-h-[40px]">{feedbackMessage}</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} className="hidden" />
          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Icons.spinner className="h-12 w-12 animate-spin text-white" />
            </div>
          )}
          {status === 'streaming' && currentChallenge && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white p-4">
              <div className="bg-black/50 rounded-lg p-4 flex flex-col items-center justify-center">
                {getChallengeIcon(currentChallenge)}
                <p className="mt-2 text-xl font-bold capitalize">{currentChallenge}</p>
              </div>
            </div>
          )}
          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/70 text-white text-2xl font-bold">
              <CheckCircle className="h-16 w-16" />
              <p className="mt-4">Enrollment Complete!</p>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/70 text-white text-2xl font-bold">
              <XCircle className="h-16 w-16" />
              <p className="mt-4">Enrollment Failed</p>
            </div>
          )}
        </div>
        {(status === 'streaming' || status === 'success' || status === 'error') && <Progress value={progress} className="w-full" />}
        <DialogFooter>
            {(status === 'success' || status === 'error') && (
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
