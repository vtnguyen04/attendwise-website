
// components/events/events-toolbar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

export function EventsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation('events');

  const TABS = [
    { value: 'upcoming', label: t('toolbar.upcoming') },
    { value: 'ongoing', label: t('toolbar.ongoing') },
    { value: 'attending', label: t('toolbar.attending') },
    { value: 'past', label: t('toolbar.past') },
  ];

  const currentStatus = searchParams.get('status') || 'upcoming';
  const currentSearchTerm = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const handleTabChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', status);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchTerm) {
      params.set('q', debouncedSearchTerm);
    } else {
      params.delete('q');
    }
    if (debouncedSearchTerm !== currentSearchTerm) {
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }
  }, [debouncedSearchTerm, currentSearchTerm, pathname, router, searchParams]);

  return (
    <div
      className="glass-card interactive-spotlight space-y-4 rounded-3xl p-4 shadow-glass-lg transition-all duration-500 md:flex md:items-center md:justify-between md:space-y-0 md:gap-6 md:p-6"
      aria-busy={isPending}
    >
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/80 transition-opacity duration-300" />
        <Input
          placeholder={t('toolbar.search_placeholder')}
          className="h-12 liquid-glass-input pl-12 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={currentStatus} onValueChange={handleTabChange}>
        <TabsList className="glass-card interactive-spotlight flex h-auto gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 shadow-glass">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative overflow-hidden px-3 py-2 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:text-foreground data-[state=active]:scale-[1.03] data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glass-lg liquid-glass-button"
            >
              <span className="relative z-10">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
