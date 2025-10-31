'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Check from 'lucide-react/icons/check';
import X from 'lucide-react/icons/x';
import Loader2 from 'lucide-react/icons/loader-2';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

import { useParams } from 'next/navigation';
import { getNullableStringValue } from '@/lib/utils';

interface PendingMember extends User {
  // The default User type should be sufficient
}

export default function PendingMembersPage() {
  const params = useParams();
  const communityId = params.id as string;
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchPendingMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/communities/${communityId}/members/pending`);
      setPendingMembers(response.data.members || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch pending members.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast]);

  useEffect(() => {
    fetchPendingMembers();
  }, [fetchPendingMembers]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      if (action === 'approve') {
        await apiClient.post(`/api/v1/communities/${communityId}/members/${userId}/approve`);
        toast({ title: 'Success', description: 'Member has been approved.' });
      } else {
        // NOTE: The backend does not have a specific 'reject' endpoint.
        // Rejecting a pending member is handled by using the 'remove member' endpoint.
        await apiClient.delete(`/api/v1/communities/${communityId}/members/${userId}`);
        toast({ title: 'Success', description: 'Member has been rejected.' });
      }
      setPendingMembers(prev => prev.filter(member => member.id !== userId));
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} member.`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const MemberSkeleton = () => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
        <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
        </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Members</CardTitle>
        <CardDescription>Review and approve or reject requests to join your community.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
                <MemberSkeleton />
                <MemberSkeleton />
            </div>
          ) : pendingMembers.length > 0 ? (
            pendingMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                        src={getNullableStringValue(member.profile_picture_url)} 
                        alt={`${member.name || 'Member Avatar'}`}
                    />
                    <AvatarFallback>
                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </AvatarFallback>
                </Avatar>
                  <div>
                    <p className="font-semibold">{member.name || 'Unnamed Member'}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(member.id, 'reject')}
                    disabled={actionLoading[member.id]}
                  >
                    {actionLoading[member.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    <span className="ml-2">Reject</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(member.id, 'approve')}
                    disabled={actionLoading[member.id]}
                  >
                    {actionLoading[member.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="ml-2">Approve</span>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-10">No pending members to review.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}