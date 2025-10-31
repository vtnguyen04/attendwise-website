'use client';

import dynamic from 'next/dynamic';

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });
import { EventAttendee as Attendee } from "@/lib/types";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface CheckInQrCodeProps {
    attendee: Attendee;
    eventId: string;
    sessionId: string;
    onBack: () => void;
}

export default function CheckInQrCode({ attendee, eventId, sessionId, onBack }: CheckInQrCodeProps) {
    const qrValue = JSON.stringify({
        userId: attendee.id,
        eventId: eventId,
        sessionId: sessionId,
        name: attendee.user_name,
    });

    return (
        <div className="relative">
            <Button onClick={onBack} variant="ghost" size="icon" className="absolute -top-14 -left-4">
                <ArrowLeft />
                <span className="sr-only">Back</span>
            </Button>
            <Card>
                <CardContent className="flex flex-col items-center justify-center gap-6 p-6 pt-12">
                    <div className='bg-white p-4 rounded-lg border'>
                        <QRCode value={qrValue} size={256} />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg">{attendee.user_name}</p>
                        <p className="text-sm text-muted-foreground">Scan this code for event check-in</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
