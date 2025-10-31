// 'use client';

// import { useRef, useEffect, useState, useCallback } from 'react';
// import dynamic from 'next/dynamic';

// const jsQR = dynamic(() => import('jsqr').then((mod) => mod.default), { ssr: false });
// import { qrCodeCheckIn } from '@/lib/ai-flows/qr-code-check-in';
// import { useToast } from '@/hooks/use-toast';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Button } from '@/components/ui/button';
// import { Card } from '@/components/ui/card';

// type ScanResult = {
//     success: boolean;
//     message: string;
//     attendeeName?: string;
// }

// export default function QrScanner() {
//     const videoRef = useRef<HTMLVideoElement>(null);
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const [scanResult, setScanResult] = useState<ScanResult | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const [isScanning, setIsScanning] = useState(true);
//     const { toast } = useToast();

//     const tick = useCallback(() => {
//         if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && isScanning) {
//             const video = videoRef.current;
//             const canvas = canvasRef.current!;
//             const context = canvas.getContext('2d')!;

//             canvas.height = video.videoHeight;
//             canvas.width = video.videoWidth;
//             context.drawImage(video, 0, 0, canvas.width, canvas.height);
//             const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
//             const code = jsQR(imageData.data, imageData.width, imageData.height, {
//                 inversionAttempts: 'dontInvert',
//             });

//             if (code) {
//                 setIsScanning(false); // Stop scanning
//                 handleQrCode(code.data);
//             }
//         }
//         if (isScanning) {
//             requestAnimationFrame(tick);
//         }
//     }, [isScanning]);


//     useEffect(() => {
//         async function startCamera() {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//                 if (videoRef.current) {
//                     videoRef.current.srcObject = stream;
//                 }
//                 requestAnimationFrame(tick);
//             } catch (err) {
//                 console.error("Camera Error:", err);
//                 setError("Could not access camera. Please check permissions and refresh.");
//             }
//         }

//         startCamera();

//         return () => {
//             if (videoRef.current && videoRef.current.srcObject) {
//                 const stream = videoRef.current.srcObject as MediaStream;
//                 stream.getTracks().forEach(track => track.stop());
//             }
//         };
//     }, [tick]);

//     const handleQrCode = async (data: string) => {
//         setIsLoading(true);
//         setScanResult(null);
//         try {
//             const result = await qrCodeCheckIn({ qrData: data });
//             setScanResult(result);
//             toast({
//                 title: result.success ? "Check-in Successful" : "Check-in Failed",
//                 description: result.message,
//                 variant: result.success ? "default" : "destructive",
//             });
//         } catch (e) {
//             const errorMessage = "An unexpected error occurred.";
//             setScanResult({ success: false, message: errorMessage });
//             toast({
//                 title: "Error",
//                 description: errorMessage,
//                 variant: "destructive",
//             });
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleScanNext = () => {
//         setScanResult(null);
//         setIsLoading(false);
//         setIsScanning(true);
//         requestAnimationFrame(tick);
//     }

//     return (
//         <div className='flex flex-col items-center gap-4'>
//             <Card className="p-4 flex flex-col items-center gap-4 w-full max-w-lg">
//                 <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
//                     {error ? (
//                          <div className="w-full h-full flex items-center justify-center text-destructive-foreground bg-destructive p-4 text-center">
//                             {error}
//                         </div>
//                     ) : (
//                         <video ref={videoRef} playsInline autoPlay muted className='w-full h-full object-cover' />
//                     )}
//                     {!error && isScanning && (
//                          <div className='absolute inset-0 bg-black/20 flex items-center justify-center'>
//                             <div className='w-64 h-64 border-4 border-dashed border-white/80 rounded-lg'/>
//                         </div>
//                     )}
//                 </div>
//                 <canvas ref={canvasRef} className="hidden" />
//             </Card>
            
//             {isLoading && (
//                 <div className='flex items-center text-lg font-semibold'>
//                     <Loader2 className='mr-2 animate-spin' /> Processing...
//                 </div>
//             )}

//             {scanResult && (
//                 <div className='flex flex-col items-center gap-4 w-full max-w-md'>
//                     <Alert variant={scanResult.success ? 'default' : 'destructive'} className="text-center">
//                         {scanResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
//                         <AlertTitle className='text-xl'>
//                             {scanResult.success ? `Welcome, ${scanResult.attendeeName}!` : "Check-in Failed"}
//                         </AlertTitle>
//                         <AlertDescription>
//                             {scanResult.message}
//                         </AlertDescription>
//                     </Alert>
//                     <Button onClick={handleScanNext} size='lg'>
//                         <RefreshCw className='mr-2' /> Scan Next Attendee
//                     </Button>
//                 </div>
//             )}
//         </div>
//     );
// }
