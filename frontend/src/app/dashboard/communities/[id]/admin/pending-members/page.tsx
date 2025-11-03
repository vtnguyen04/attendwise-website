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
import { useTranslation } from '@/hooks/use-translation';

export default function PendingMembersPage() {
  const params = useParams();
  const communityId = params.id as string;
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { t } = useTranslation('community');

  const fetchPendingMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/communities/${communityId}/members/pending`);
      setPendingMembers(response.data.members || []);
    } catch {
      toast({
        title: t('error'),
        description: t('admin.pending_members.toast.fetch_error'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast, t]);

  useEffect(() => {
    fetchPendingMembers();
  }, [fetchPendingMembers]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      if (action === 'approve') {
        await apiClient.post(`/communities/${communityId}/members/${userId}/approve`);
        toast({ title: t('toast.success'), description: t('admin.pending_members.toast.approve_success') });
      } else {
        // NOTE: The backend does not have a specific 'reject' endpoint.
        // Rejecting a pending member is handled by using the 'remove member' endpoint.
        await apiClient.delete(`/communities/${communityId}/members/${userId}`);
        toast({ title: t('toast.success'), description: t('admin.pending_members.toast.reject_success') });
      }
      setPendingMembers(prev => prev.filter(member => member.id !== userId));
    } catch {
      toast({
        title: t('error'),
        description: t('admin.pending_members.toast.action_error', { action }),
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
        <CardTitle>{t('admin.pending_members.title')}</CardTitle>
        <CardDescription>{t('admin.pending_members.description')}</CardDescription>
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
                        alt={`${member.name || t('admin.pending_members.unnamed_member')}`}
                    />
                    <AvatarFallback>
                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </AvatarFallback>
                </Avatar>
                  <div>
                    <p className="font-semibold">{member.name || t('admin.pending_members.unnamed_member')}</p>
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
                    <span className="ml-2">{t('admin.pending_members.reject_button')}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(member.id, 'approve')}
                    disabled={actionLoading[member.id]}
                  >
                    {actionLoading[member.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="ml-2">{t('admin.pending_members.approve_button')}</span>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-10">{t('admin.pending_members.no_pending_members')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}