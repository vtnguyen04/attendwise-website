'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button'; // Corrected import path
import CheckInFaceId from './check-in-face-id';
import { EventAttendee as Attendee } from '@/lib/types';
import { useState } from 'react';
import QrCode from 'lucide-react/icons/qr-code';
import ScanFace from 'lucide-react/icons/scan-face';
import CheckInQrCode from './check-in-qr-code';

interface CheckInDialogProps {
  attendee: Attendee;
  eventId: string;
  sessionId: string;
  children?: React.ReactNode;
  disabled?: boolean;
  onCheckInSuccess: (updatedAttendee: Attendee) => void;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type CheckInStep = 'select' | 'face-id' | 'qr-code';

export default function CheckInDialog({
  attendee,
  eventId,
  sessionId,
  children,
  disabled = false,
  onCheckInSuccess,
  open,
  onOpenChange,
}: CheckInDialogProps) {
  const [step, setStep] = useState<CheckInStep>('select');

  const trigger = children ? (
    children
  ) : (
    <Button variant="outline" size="sm" disabled={attendee.checkedIn || disabled}>
      {attendee.checkedIn ? 'Checked In' : 'Check-in'}
    </Button>
  );

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setTimeout(() => setStep('select'), 300);
    }
  };

  const handleSuccess = (updatedAttendee: Attendee) => {
    onCheckInSuccess(updatedAttendee);
    onOpenChange(false);
  };

  const renderStep = () => {
    switch (step) {
      case 'face-id':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Face ID Check-in</DialogTitle>
              <DialogDescription>
                Verify attendee identity by comparing their live photo with
                their profile picture.
              </DialogDescription>
            </DialogHeader>
            <CheckInFaceId
              attendee={attendee}
              eventId={eventId}
              sessionId={sessionId}
              onBack={() => setStep('select')}
              onCheckInSuccess={handleSuccess}
            />
          </>
        );
      case 'qr-code':
        return (
          <>
            <DialogHeader>
              <DialogTitle>QR Code Check-in</DialogTitle>
              <DialogDescription>
                Present this QR code to an event organizer to be scanned.
              </DialogDescription>
            </DialogHeader>
            <CheckInQrCode
              attendee={attendee}
              eventId={eventId}
              sessionId={sessionId}
              onBack={() => setStep('select')}
            />
          </>
        );
      case 'select':
      default:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Choose Check-in Method</DialogTitle>
              <DialogDescription>
                Select how you would like to check-in for the event.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
              <Button
                variant="outline"
                className="h-24 text-lg"
                onClick={() => setStep('qr-code')}
              >
                <QrCode className="mr-4 h-8 w-8" />
                Verify with QR Code
              </Button>
              <Button
                variant="outline"
                className="h-24 text-lg"
                onClick={() => setStep('face-id')}
              >
                <ScanFace className="mr-4 h-8 w-8" />
                Verify with Face ID
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={disabled || attendee.checkedIn}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">{renderStep()}</DialogContent>
    </Dialog>
  );
}
