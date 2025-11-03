
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';


import Sparkles from 'lucide-react/icons/sparkles';
import ArrowRight from 'lucide-react/icons/arrow-right';
import { useUser } from '@/context/user-provider';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';



export function FeaturedCommunitiesSection() {
  const { user } = useUser();
  const { t } = useTranslation('marketing');

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900 py-16 sm:py-20 lg:py-32">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.05) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
            filter: 'brightness(1.2) contrast(1.2)',
            opacity: '0.5',
          }}
        />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse dark:bg-purple-500/10" />
      <div
        className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse dark:bg-blue-500/10"
        style={{ animationDelay: '1s' }}
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="liquid-glass-badge mb-6 bg-purple-100 dark:bg-purple-900/20">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t('featured_communities.join_community')}</span>
          </div>

          <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-purple-700 to-gray-900 dark:from-white dark:via-purple-200 dark:to-white sm:text-5xl lg:text-6xl mb-4">
            {t('featured_communities.find_your_community')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            {t('featured_communities.description')}
          </p>

          {user && (
            <Button
              asChild
              className="group liquid-glass-button"
            >
              <Link href="/dashboard/communities" className="flex items-center gap-2">
                {t('featured_communities.explore_communities')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}