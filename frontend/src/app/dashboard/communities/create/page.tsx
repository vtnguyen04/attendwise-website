'use client';

import CommunityForm from '@/components/community/settings/community-form';
import { useTranslation } from '@/hooks/use-translation';

export default function CreateCommunityPage() {
  const { t } = useTranslation('communities');

  return (
    <div className="relative mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 lg:px-8" data-primary-content>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-60 blur-3xl" />

      {/* Header Card */}
      <div className="glass-card p-6 shadow-glass-lg sm:p-8" data-scroll-skip="true">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-glow">{t('create_community.title')}</h1>
          <p className="max-w-xl text-base text-muted-foreground">
            {t('create_community.description')}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card p-6 shadow-glass-lg sm:p-8" data-scroll-anchor>
        <CommunityForm mode="create" />
      </div>
    </div>
  );
}
