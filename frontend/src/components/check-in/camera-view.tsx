'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '../ui/button';
import Camera from 'lucide-react/icons/camera';
import RefreshCcw from 'lucide-react/icons/refresh-ccw';
import { Card } from '../ui/card';

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  onClear: () => void;
  capturedImage: string | null;
}

export default function CameraView({ onCapture, onClear, capturedImage }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    onClear();
  };

  return (
    <Card className="p-4 flex flex-col items-center gap-4">
      <div className="relative w-[400px] h-[400px] bg-muted rounded-md overflow-hidden">
        {error ? (
            <div className="w-full h-full flex items-center justify-center text-destructive-foreground bg-destructive p-4 text-center">
                {error}
            </div>
        ) : (
            <>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`}
                />
                {capturedImage && (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                )}
            </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex gap-4">
        {capturedImage ? (
          <Button onClick={handleRetake} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Retake
          </Button>
        ) : (
          <Button onClick={handleCapture} disabled={!!error}>
            <Camera className="mr-2 h-4 w-4" /> Capture
          </Button>
        )}
      </div>
    </Card>
  );
}
