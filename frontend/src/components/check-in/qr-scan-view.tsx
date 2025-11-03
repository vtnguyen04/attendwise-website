'use client';

import { useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const QrScanView = ({ onCodeScanned, onCancel, theme }: { onCodeScanned: (decodedText: string) => void; onCancel: () => void; theme: 'dark' | 'light'; }) => {
    const qrReaderElementId = "qr-reader-element";
    useEffect(() => {
        const scanner = new Html5Qrcode(qrReaderElementId);
        const successCallback = (decodedText: string) => {
            if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
                scanner.stop().then(() => {
                    onCodeScanned(decodedText);
                }).catch(err => {
                    console.error("Failed to stop scanner", err);
                    onCodeScanned(decodedText); // Proceed even if stopping fails
                });
            }
        };
        const errorCallback = () => {
            // console.error(`QR scanning error: ${error}`);
        };

        scanner.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 280, height: 280 } }, 
            successCallback, 
            errorCallback
        ).catch(err => {
            console.error("Unable to start scanner", err);
        });

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(err => {
                    console.error("Failed to stop scanner on cleanup", err);
                });
            }
        };
    }, [onCodeScanned]);

    return (
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
            <div 
                id={qrReaderElementId} 
                className={cn(
                    "w-full rounded-lg border-2",
                    theme === 'dark' ? 'border-dashed border-white/20' : 'border-dashed border-gray-300'
                )} 
            />
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
