'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Community } from '@/lib/types';
import CommunityForm from '@/components/community/shared/community-form';
import { GlassCard } from '@/components/ui/glass-card';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  CalendarDays,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react';

interface CommunitySettingsClientProps {
  community: Community;
}

export default function CommunitySettingsClient({ community }: CommunitySettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const stats = [
    {
      label: 'Members',
      value: Intl.NumberFormat().format(community.member_count ?? 0),
      icon: Users,
    },
    {
      label: 'Posts',
      value: Intl.NumberFormat().format(community.post_count ?? 0),
      icon: MessageSquare,
    },
    {
      label: 'Events',
      value: Intl.NumberFormat().format(community.event_count ?? 0),
      icon: CalendarDays,
    },
  ];

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/api/v1/communities/${community.id}`);
      toast({ title: 'Success', description: 'Community deleted successfully.' });
      router.push('/dashboard/communities');
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete community.', variant: 'destructive' });
    }
  };

  return (
    <>
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                {community.name}
              </h1>
              <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                Manage the face of your community, tailor access, and keep everything aligned with
                your brand. These changes apply instantly across the platform.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="border-white/20 bg-white/10 text-xs font-medium uppercase tracking-wide text-white"
              >
                {community.type === 'public'
                  ? 'Public Community'
                  : community.type === 'private'
                    ? 'Private Community'
                    : 'Secret Community'}
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-100">
                Created {new Date(community.created_at).toLocaleDateString()}
              </Badge>
              {community.role && (
                <Badge className="bg-emerald-500/20 text-emerald-100">
                  Your role: {community.role.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Button
              asChild
              variant="secondary"
              className="gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
            >
              <Link href={`/dashboard/communities/${community.id}`}>
                Preview Community
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-6 bg-white/10" />

        <div className="grid gap-4 text-sm sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-300">{label}</p>
                <p className="text-2xl font-semibold text-white">{value}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30">
                <Icon className="h-5 w-5 text-blue-200" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="mt-6">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Community Settings</CardTitle>
          <CardDescription>
            Refresh your community’s brand voice, personalize the experience, and fine-tune safety
            rules in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <CommunityForm
            mode="edit"
            initialData={community}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </CardContent>
      </GlassCard>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              <span className="font-bold"> {community.name} </span>
              community and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
