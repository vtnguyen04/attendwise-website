'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { value: '/dashboard/communities', label: 'Explore' },
  { value: '/dashboard/communities/my', label: 'My Communities' },
];

export function CommunityToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearchTerm = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const handleTabChange = (path: string) => {
    startTransition(() => {
      router.push(path);
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
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/80" />
        <Input
          placeholder="Search communities..."
          className="h-12 liquid-glass-input pl-12 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={pathname} onValueChange={handleTabChange}>
        <TabsList className="glass-card interactive-spotlight flex h-auto gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 shadow-glass">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative overflow-hidden liquid-glass-button px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:scale-[1.03] data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glass-lg"
            >
              <span className="relative z-10">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
