'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import Loader2 from 'lucide-react/icons/loader-2';
import Send from 'lucide-react/icons/send';

interface InviteMemberModalProps {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberModal({ communityId, open, onOpenChange }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter a valid email.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // NOTE: Assuming this API endpoint exists for sending invitations.
      await apiClient.post(`/communities/${communityId}/invites`, { email });
      toast({ title: 'Success', description: `Invitation sent to ${email}.` });
      onOpenChange(false); // Close modal on success
      setEmail('');
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
        'Failed to send invitation.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Invite a new member</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to this community.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="liquid-glass-input"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="liquid-glass-button">Cancel</Button>
          <Button onClick={handleInvite} disabled={isLoading} className="liquid-glass-button">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
