'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Smartphone from 'lucide-react/icons/smartphone';
import Monitor from 'lucide-react/icons/monitor';
import Tablet from 'lucide-react/icons/tablet';
import Image from 'next/image';
import { GlassCard } from '../ui/glass-card';
import { useState } from 'react';

export function TwoFactorAuthDialog() {
  const { toast } = useToast();
  const [code, setCode] = useState('');

  const handleVerify = () => {
    if (code === '123456') { // Mock verification
      toast({ title: 'Success', description: 'Two-Factor Authentication has been enabled.' });
    } else {
      toast({ title: 'Error', description: 'Invalid verification code.', variant: 'destructive' });
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
        <DialogDescription>
          Scan the QR code with your authenticator app (e.g., Google Authenticator), then enter the 6-digit code to verify.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="p-4 bg-white rounded-lg border">
            {/* This is a placeholder QR Code */}
            <Image src="https://placehold.co/200x200/png?text=SCAN+ME" alt="2FA QR Code" width={200} height={200} />
        </div>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input 
            type="text" 
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <Button onClick={handleVerify}>Verify</Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function ActiveSessionsCard() {
    const mockSessions = [
        { id: 1, type: 'desktop', browser: 'Chrome on MacOS', location: 'New York, US', lastActive: 'Active now', isCurrent: true },
        { id: 2, type: 'mobile', browser: 'Safari on iPhone', location: 'Los Angeles, US', lastActive: '2 hours ago' },
        { id: 3, type: 'tablet', browser: 'Chrome on Android', location: 'London, UK', lastActive: '1 day ago' },
    ];

    const getIcon = (type: string) => {
        if (type === 'mobile') return <Smartphone className="h-6 w-6 text-muted-foreground" />;
        if (type === 'tablet') return <Tablet className="h-6 w-6 text-muted-foreground" />;
        return <Monitor className="h-6 w-6 text-muted-foreground" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>This is a list of devices that have logged into your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {mockSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                            {getIcon(session.type)}
                            <div>
                                <p className="font-semibold">{session.browser} {session.isCurrent && <span className="text-xs text-green-500 font-normal">(This device)</span>}</p>
                                <p className="text-sm text-muted-foreground">{session.location} &bull; {session.lastActive}</p>
                            </div>
                        </div>
                        {!session.isCurrent && <Button variant="ghost" size="sm">Log out</Button>}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export function DangerZoneCard() {
    const [confirmText, setConfirmText] = useState('');
    const isMatch = confirmText === 'delete my account';

    return (
        <GlassCard className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between p-6 border-t border-destructive/20">
                <div>
                    <h3 className="font-semibold">Delete this Account</h3>
                    <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back.</p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="liquid-glass-button bg-destructive">Delete Account</Button>
                    </DialogTrigger>
                    <DialogContent className="dialog-glass">
                        <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <p className="text-sm text-muted-foreground">Please type <strong className="text-foreground">delete my account</strong> to confirm.</p>
                            <Input 
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="liquid-glass-input"
                            />
                        </div>
                        <Button className="liquid-glass-button bg-destructive" disabled={!isMatch}>I understand the consequences, delete my account</Button>
                    </DialogContent>
                </Dialog>
            </CardContent>
                
        </GlassCard>
    )
}
