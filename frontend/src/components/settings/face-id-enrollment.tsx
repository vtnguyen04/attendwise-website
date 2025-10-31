'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import Camera from 'lucide-react/icons/camera';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Check from 'lucide-react/icons/check';
import AlertCircle from 'lucide-react/icons/alert-circle';
import Loader2 from 'lucide-react/icons/loader-2';
import ScanFace from 'lucide-react/icons/scan-face';
import { Progress } from '@/components/ui/progress';

interface FaceIdEnrollmentProps {
  onComplete: () => void;
}

function dataUrlToBytes(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

export function FaceIdEnrollment({ onComplete }: FaceIdEnrollmentProps) {
  const { toast } = useToast();
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCamera = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
        setError(null);
      } catch (err) {
        console.error("Error accessing webcam: ", err);
        setError('Could not access the webcam. Please check permissions and try again.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraOn(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    try {
      const imageBytes = dataUrlToBytes(capturedImage);

      await apiClient.post('api/v1/users/me/enroll-face', {
        image_data: imageBytes,
        liveness_challenge_type: 'none',
        consent_given: true,
      });

      toast({
        title: 'Enrollment Successful',
        description: 'Your face has been successfully enrolled.',
      });
      onComplete();

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred during enrollment.';
      setError(errorMessage);
      console.error("Enrollment error:", err);
      toast({
        title: 'Enrollment Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className={cn(
        "p-4 rounded-lg border transition-colors duration-200",
        theme === 'dark'
          ? 'bg-slate-900 border-slate-800'
          : 'bg-slate-50 border-slate-200'
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          )}>
            <ScanFace className={cn(
              "h-5 w-5",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )} />
          </div>
          <div className="flex-1">
            <h3 className={cn(
              "text-[13px] font-semibold mb-1",
              theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
            )}>
              Face Enrollment Instructions
            </h3>
            <ul className={cn(
              "text-[12px] space-y-1",
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              <li>• Position your face in the center of the frame</li>
              <li>• Ensure good lighting and remove glasses if possible</li>
              <li>• Look directly at the camera</li>
              <li>• Keep a neutral expression</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Camera/Preview Area */}
      <div 
        className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden",
          "transform-gpu transition-all duration-300",
          "hover:shadow-2xl hover:scale-[1.01]",
          theme === 'dark'
            ? 'bg-slate-950 border-2 border-slate-800 shadow-slate-950/50'
            : 'bg-slate-100 border-2 border-slate-200 shadow-slate-300/50'
        )}
        onMouseMove={(e) => {
          if (capturedImage) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / 40;
          const rotateY = (centerX - x) / 40;
          e.currentTarget.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1)';
        }}
      >
        {/* Error State */}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className={cn(
              "p-4 rounded-full mb-4",
              theme === 'dark' ? 'bg-red-950/30' : 'bg-red-50'
            )}>
              <AlertCircle className={cn(
                "h-10 w-10",
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              )} />
            </div>
            <p className={cn(
              "text-[13px] font-medium max-w-sm",
              theme === 'dark' ? 'text-red-400' : 'text-red-600'
            )}>
              {error}
            </p>
          </div>
        ) : (
          <>
            {/* Video Stream */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={cn(
                "w-full h-full object-cover",
                capturedImage && 'hidden'
              )}
            />

            {/* Captured Image */}
            {capturedImage && (
              <div className="relative w-full h-full">
                <Image 
                  src={capturedImage} 
                  alt="Captured face" 
                  fill
                  className="object-contain"
                />
                {/* Success Overlay */}
                <div className="absolute top-4 right-4">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full",
                    "backdrop-blur-md border",
                    theme === 'dark'
                      ? 'bg-emerald-950/80 border-emerald-800/50 text-emerald-400'
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-700'
                  )}>
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold">Captured</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Camera */}
            {!isCameraOn && !capturedImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className={cn(
                  "h-10 w-10 animate-spin mb-3",
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )} />
                <p className={cn(
                  "text-[13px] font-medium",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  Starting camera...
                </p>
              </div>
            )}

            {/* Face Detection Overlay */}
            {isCameraOn && !capturedImage && !countdown && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={cn(
                  "w-64 h-80 rounded-3xl border-4 border-dashed",
                  "transition-all duration-300",
                  theme === 'dark'
                    ? 'border-slate-600/50'
                    : 'border-slate-400/50'
                )}>
                  {/* Corner indicators */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                </div>
              </div>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center">
                  <div className={cn(
                    "text-8xl font-bold mb-4 animate-pulse",
                    "text-white"
                  )}>
                    {countdown}
                  </div>
                  <p className="text-white text-[13px] font-medium">
                    Get ready...
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {!capturedImage && isCameraOn && !error && (
          <Button 
            onClick={handleCapture}
            disabled={countdown !== null}
            className={cn(
              "h-10 px-6 text-[13px] font-medium transition-all duration-300",
              "transform-gpu hover:scale-105 active:scale-95",
              "hover:shadow-lg",
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/50'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-300/50'
            )}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const rotateX = (y - centerY) / 10;
              const rotateY = (centerX - x) / 10;
              e.currentTarget.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(500px) rotateX(0) rotateY(0) scale(1)';
            }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture Photo
          </Button>
        )}

        {capturedImage && !isLoading && (
          <>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              className={cn(
                "h-10 px-6 text-[13px] font-medium transition-all duration-300",
                "transform-gpu hover:scale-105 active:scale-95",
                theme === 'dark'
                  ? 'border-slate-700 hover:bg-slate-800'
                  : 'border-slate-200 hover:bg-slate-50'
              )}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                e.currentTarget.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(500px) rotateX(0) rotateY(0) scale(1)';
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button 
              onClick={handleSubmit}
              className={cn(
                "h-10 px-6 text-[13px] font-medium transition-all duration-300",
                "transform-gpu hover:scale-105 active:scale-95",
                "hover:shadow-lg",
                theme === 'dark'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-300/50'
              )}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                e.currentTarget.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(500px) rotateX(0) rotateY(0) scale(1)';
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Submit Enrollment
            </Button>
          </>
        )}

        {isLoading && (
          <Button 
            disabled
            className={cn(
              "h-10 px-6 text-[13px] font-medium",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )}
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </Button>
        )}

        {error && (
          <Button 
            onClick={handleRetry}
            variant="outline"
            className={cn(
              "h-10 px-6 text-[13px] font-medium",
              theme === 'dark'
                ? 'border-slate-700 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-50'
            )}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}