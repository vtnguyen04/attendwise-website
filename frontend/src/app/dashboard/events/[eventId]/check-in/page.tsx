'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CheckCircle from 'lucide-react/icons/check-circle';
import XCircle from 'lucide-react/icons/x-circle';
import Loader2 from 'lucide-react/icons/loader-2';
import QrCode from 'lucide-react/icons/qr-code';
import Keyboard from 'lucide-react/icons/keyboard';
import Camera from 'lucide-react/icons/camera';
import { getEventById } from "@/lib/services/event.client.service";
import { verifyCheckin } from '@/lib/services/checkin.service';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const QrScanView = dynamic(() => import('@/components/check-in/qr-scan-view').then(mod => mod.QrScanView), {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-64" />,
});

export default function CheckInPage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const theme = useTheme(); // 👈 Lấy theme hiện tại

    // State management for the multi-step flow
    const [view, setView] = useState<'choice' | 'qr' | 'fallback' | 'face_verify' | 'submitting' | 'success' | 'failed'>('choice');
    const [message, setMessage] = useState('');
    
    // Stored data between steps
    const [codePayload, setCodePayload] = useState<{ qr_payload?: string; fallback_code?: string } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const { data: event, isLoading: isEventLoading } = useQuery({
        queryKey: ["event", eventId],
        queryFn: () => getEventById(eventId),
        enabled: !!eventId,
    });

    const checkinMutation = useMutation({
        mutationFn: verifyCheckin,
        onSuccess: (data) => {
            setView('success');
            setMessage(data.message || "Check-in successful!");
            toast({ title: "Check-in Successful", description: data.message });
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
            queryClient.invalidateQueries({ queryKey: ['my-registration', eventId] });
        },
        onError: (err: any) => {
            setView('failed');
            setMessage(err.response?.data?.error || "Check-in failed.");
        },
    });

    // --- Camera Controls ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
            mediaStreamRef.current = stream;
        } catch (err) {
            setMessage("Camera permission is required for face verification.");
        }
    };

    const stopCamera = () => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };

    const captureImage = (): string | null => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            return canvas.toDataURL('image/jpeg');
        }
        return null;
    };

    // --- Step 1: Code Capture Handlers ---
    const handleCodeScanned = (decodedText: string) => {
        setCodePayload({ qr_payload: decodedText });
        if (event?.face_verification_required) {
            setView('face_verify');
        } else {
            setView('submitting');
            checkinMutation.mutate({ qr_payload: decodedText });
        }
    };

    const handleFallbackSubmit = (code: string) => {
        if (!code) return;
        setCodePayload({ fallback_code: code });
        if (event?.face_verification_required) {
            setView('face_verify');
        } else {
            setView('submitting');
            checkinMutation.mutate({ fallback_code: code });
        }
    };

    // --- Step 2: Face Verification Handler ---
    const handleFaceVerifyAndSubmit = () => {
        const imageData = captureImage();
        if (!imageData) {
            setView('failed');
            setMessage("Could not capture face image.");
            return;
        }
        setView('submitting');
        checkinMutation.mutate({ ...codePayload!, image_data: imageData });
    };

    // Effect to manage camera for face verification step
    useEffect(() => {
        if (view === 'face_verify') {
            startCamera();
        } else {
            stopCamera();
        }
        return stopCamera;
    }, [view]);

    // --- Render Functions ---
    const renderContent = () => {
        if (isEventLoading) return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
        if (!event) return <p className={cn("text-destructive", theme === 'dark' ? 'text-red-400' : 'text-red-600')}>Error loading event data.</p>;

        switch (view) {
            case 'submitting':
                return <div className="text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /><p className="mt-4 text-lg font-semibold">Verifying...</p></div>;
            case 'success':
                return <div className="text-center text-green-600"><CheckCircle className="h-12 w-12 mx-auto" /><p className="mt-4 text-xl font-bold">{message}</p><Button onClick={() => router.push(`/dashboard/events/${event.id}`)} className="mt-4">Go to Event</Button></div>;
            case 'failed':
                return <div className="text-center text-red-600"><XCircle className="h-12 w-12 mx-auto" /><p className="mt-4 text-xl font-bold">{message}</p><Button onClick={() => setView('choice')} className="mt-4" variant="destructive">Try Again</Button></div>;
            case 'face_verify':
                return <FaceVerifyView onCaptureAndSubmit={handleFaceVerifyAndSubmit} videoRef={videoRef} message={message} theme={theme} />;
            case 'qr':
                return <QrScanView onCodeScanned={handleCodeScanned} onCancel={() => setView('choice')} theme={theme} />;
            case 'fallback':
                return <FallbackView onSubmit={handleFallbackSubmit} onCancel={() => setView('choice')} theme={theme} />;
            case 'choice':
            default:
                return <ChoiceView onQrClick={() => setView('qr')} onFallbackClick={() => setView('fallback')} theme={theme} />;
        }
    };

    return (
        <div className="container mx-auto py-10 px-4">
            <Card className={cn(
                "w-full max-w-3xl mx-auto shadow-lg transition-all duration-300 transform-gpu hover:shadow-xl",
                theme === 'dark' 
                    ? 'bg-slate-900/80 border-white/5' 
                    : 'bg-white/80 border-gray-200'
            )}>
                <CardHeader className="text-center">
                    <CardTitle className={cn(
                        "text-3xl transition-colors duration-300",
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>Check-in for {event?.name}</CardTitle>
                    <CardDescription className={cn(
                        "transition-colors duration-300",
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>Follow the steps to complete your check-in.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center min-h-[400px]">
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}

// --- Sub-components for each view ---

const ChoiceView = ({ onQrClick, onFallbackClick, theme }: { onQrClick: () => void; onFallbackClick: () => void; theme: 'dark' | 'light'; }) => (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
        <Button 
            onClick={onQrClick} 
            className={cn(
                "w-full h-16 text-lg transition-all duration-300 transform-gpu hover:scale-105",
                theme === 'dark' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
            )}
        >
            <QrCode className="mr-3 h-6 w-6" />Scan QR Code
        </Button>
        <Button 
            onClick={onFallbackClick} 
            className={cn(
                "w-full h-16 text-lg transition-all duration-300 transform-gpu hover:scale-105",
                theme === 'dark' 
                    ? 'bg-white/10 border border-white/20 hover:bg-white/20' 
                    : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
            )}
        >
            <Keyboard className="mr-3 h-6 w-6" />Enter Fallback Code
        </Button>
    </div>
);

const FallbackView = ({ onSubmit, onCancel, theme }: { onSubmit: (code: string) => void; onCancel: () => void; theme: 'dark' | 'light'; }) => {
    const [code, setCode] = useState('');
    return (
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
            <p className={cn(
                "text-muted-foreground transition-colors duration-300",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
                Enter the fallback code from your ticket.
            </p>
            <Input 
                placeholder="e.g., ABC-123" 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())} 
                className={cn(
                    "text-center text-lg h-12 transition-all duration-300",
                    theme === 'dark' 
                        ? 'bg-slate-800/50 border-white/10 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                )}
            />
            <Button 
                onClick={() => onSubmit(code)} 
                className={cn(
                    "w-full transition-all duration-300 transform-gpu hover:scale-105",
                    theme === 'dark' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-purple-600 hover:bg-purple-700'
                )}
            >
                Submit Code
            </Button>
            <Button 
                variant="link" 
                onClick={onCancel}
                className={cn(
                    "transition-colors duration-300",
                    theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}
            >
                Cancel
            </Button>
        </div>
    );
};

const FaceVerifyView = ({ onCaptureAndSubmit, videoRef, message, theme }: { 
    onCaptureAndSubmit: () => void; 
    videoRef: React.RefObject<HTMLVideoElement>; 
    message: string; 
    theme: 'dark' | 'light';
}) => (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
        <p className={cn(
            "text-lg text-center font-semibold transition-colors duration-300",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}>
            Face Verification Required
        </p>
        <div className={cn(
            "relative w-full aspect-square rounded-lg overflow-hidden shadow-lg",
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        )}>
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        </div>
        {message && (
            <div className={cn(
                "w-full p-4 rounded-lg border",
                theme === 'dark' 
                    ? 'bg-blue-900/20 border-blue-700/50 text-blue-300' 
                    : 'bg-blue-50 border-blue-200 text-blue-700'
            )}>
                <p>{message}</p>
            </div>
        )}
        <Button 
            onClick={onCaptureAndSubmit} 
            className={cn(
                "w-full h-16 text-lg transition-all duration-300 transform-gpu hover:scale-105",
                theme === 'dark' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-green-600 hover:bg-green-700'
            )}
        >
            <Camera className="mr-3 h-6 w-6" />Capture & Check-in
        </Button>
    </div>
);