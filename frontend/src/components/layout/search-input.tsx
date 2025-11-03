'use client';

import { useState, useRef, useEffect } from 'react';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import Command from 'lucide-react/icons/command';
import Sparkles from 'lucide-react/icons/sparkles';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

export default function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q')?.toString() || '');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useDebouncedCallback((term: string) => {
    setIsSearching(true);
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    replace(`${pathname}?${params.toString()}`);
    setTimeout(() => setIsSearching(false), 250);
  }, 250);

  const handleClear = () => {
    setSearchValue('');
    handleSearch('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const placeholder = pathname.startsWith('/dashboard/communities')
    ? t('search.placeholder.communities')
    : pathname.startsWith('/dashboard/events')
      ? t('search.placeholder.events')
      : t('common.search.placeholder.default');

  return (
    <div className="w-full">
      <div
        className={cn(
          'relative flex h-10 items-center gap-2 rounded-full border border-border/70 bg-card/90 px-4 transition-all duration-200',
          isFocused ? 'ring-2 ring-primary/30 shadow-sm shadow-primary/10' : 'hover:border-border'
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder={placeholder}
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            handleSearch(event.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <div className="flex items-center gap-2">
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-border/60 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!searchValue && !isFocused && (
            <div className="hidden items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground sm:flex">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          )}
          {isSearching && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3 animate-spin" />
              <span>{t('search.searching')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
