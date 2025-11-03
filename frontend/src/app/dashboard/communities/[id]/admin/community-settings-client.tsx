'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Community } from '@/lib/types';
import CommunityForm from '@/components/community/settings/community-form';


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
  Settings,
  Sparkles,
  Shield,
  Lock,
  Globe,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { Trans } from 'react-i18next';

interface CommunitySettingsClientProps {
  community: Community;
}

export default function CommunitySettingsClient({ community }: CommunitySettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { t } = useTranslation('community');

  const stats = [
    {
      label: t('admin.settings.stats.members'),
      value: Intl.NumberFormat().format(community.member_count ?? 0),
      icon: Users,
      gradient: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-400',
    },
    {
      label: t('admin.settings.stats.posts'),
      value: Intl.NumberFormat().format(community.post_count ?? 0),
      icon: MessageSquare,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: t('admin.settings.stats.events'),
      value: Intl.NumberFormat().format(community.event_count ?? 0),
      icon: CalendarDays,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
    },
  ];

  const getTypeIcon = () => {
    switch (community.type) {
      case 'public':
        return <Globe className="h-3.5 w-3.5" />;
      case 'private':
        return <Lock className="h-3.5 w-3.5" />;
      default:
        return <Eye className="h-3.5 w-3.5" />;
    }
  };

  const getTypeLabel = () => {
    switch (community.type) {
      case 'public':
        return t('admin.settings.type.public');
      case 'private':
        return t('admin.settings.type.private');
      default:
        return t('admin.settings.type.secret');
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/communities/${community.id}`);
      toast({ title: t('toast.success'), description: t('admin.settings.toast.delete_success') });
      router.push('/dashboard/communities');
      router.refresh();
    } catch {
      toast({ title: t('error'), description: t('admin.settings.toast.delete_error'), variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="dashboard-panel overflow-hidden">
        <div className="relative px-8 py-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative flex flex-col lg:flex-row items-start justify-between gap-8">
            <div className="space-y-6 flex-1">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm shadow-lg shadow-primary/10">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                    {community.name}
                  </h1>
                </div>
                <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
                  {t('admin.settings.description')}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="px-4 py-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold uppercase tracking-wider text-xs backdrop-blur-sm shadow-lg shadow-primary/10">
                  {getTypeIcon()}
                  {getTypeLabel()}
                </Badge>
                <Badge className="px-4 py-2 rounded-full bg-muted/50 text-muted-foreground border border-border/50 backdrop-blur-sm font-medium">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                  {t('admin.settings.created_at', { date: new Date(community.created_at).toLocaleDateString() })}
                </Badge>
                {community.role && (
                  <Badge className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-sm font-semibold">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    {community.role.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="liquid-glass-button gap-2 font-semibold whitespace-nowrap shadow-lg hover:shadow-xl"
            >
              <Link href={`/dashboard/communities/${community.id}`}>
                {t('admin.settings.preview_button')}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="bg-border/30" />

        <div className="p-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, gradient, iconColor }) => (
              <div
                key={label}
                className="dashboard-mini-card group relative overflow-hidden p-6 transition-all duration-300 hover:scale-102"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                
                <div className="relative flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {value}
                    </p>
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} backdrop-blur-sm shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-panel mt-8 overflow-hidden">
        <div className="relative px-8 py-8 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm shadow-lg shadow-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {t('admin.settings.title')}
              </h2>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              {t('admin.settings.description')}
            </p>
          </div>
        </div>
        
        <div className="p-8">
          <CommunityForm
            mode="edit"
            initialData={community}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="dashboard-panel max-w-lg border-destructive/20">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10 backdrop-blur-sm">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-2xl">{t('admin.settings.delete_dialog_title')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              <Trans
                i18nKey="admin.settings.delete_dialog_description"
                values={{ communityName: community.name }}
                components={{ 1: <span className="font-bold text-foreground" /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6 border-t border-border/30">
            <AlertDialogCancel className="liquid-glass-button font-semibold">
              {t('admin.settings.delete_dialog_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground font-semibold shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 hover:scale-102 transition-all duration-300"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {t('admin.settings.delete_dialog_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}