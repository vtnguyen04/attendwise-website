'use client';

import { useState, useRef, useEffect } from 'react';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import Command from 'lucide-react/icons/command';
import Sparkles from 'lucide-react/icons/sparkles';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme

export default function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme(); // 👈 Lấy theme hiện tại
  
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
    setTimeout(() => setIsSearching(false), 300);
  }, 300);

  const handleClear = () => {
    setSearchValue('');
    handleSearch('');
    inputRef.current?.focus();
  };

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine placeholder based on the current page
  const placeholder = pathname.startsWith('/dashboard/communities') 
    ? "Search communities..." 
    : pathname.startsWith('/dashboard/events')
    ? "Search events..."
    : "Search...";

  return (
    <div className="w-full max-w-md">
      <div className={`relative group transition-all duration-300 ${
        isFocused ? 'scale-[1.02]' : 'scale-100'
      }`}>
        {/* Glow Effect - Đảm bảo theme light/dark */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-lg blur-sm opacity-0 transition-all duration-500 ${
          isFocused ? 'opacity-50 animate-pulse' : 'group-hover:opacity-30'
        } ${theme === 'light' ? 'opacity-20' : ''}`} />
        
        {/* Input Container */}
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search className={`h-4 w-4 transition-all duration-300 ${
              isFocused 
                ? theme === 'dark' 
                  ? 'text-purple-400 scale-110' 
                  : 'text-purple-600 scale-110'
                : isSearching 
                ? theme === 'dark' 
                  ? 'text-blue-400 animate-pulse' 
                  : 'text-blue-600 animate-pulse'
                : theme === 'dark' 
                  ? 'text-gray-400' 
                  : 'text-gray-500'
            }`} />
          </div>

          {/* Input Field - Đảm bảo theme light/dark */}
          <Input
            ref={inputRef}
            type="search"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              handleSearch(e.target.value);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full h-10 pl-10 pr-20 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-slate-800/50 backdrop-blur-md border border-white/10 text-gray-300 placeholder:text-gray-500 hover:border-white/20'
                : 'bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 placeholder:text-gray-400 hover:border-gray-300'
            } ${
              isFocused 
                ? theme === 'dark' 
                  ? 'border-purple-500/50 bg-slate-800/80 shadow-lg shadow-purple-500/20 text-white' 
                  : 'border-purple-500/50 bg-white shadow-lg shadow-purple-500/20 text-gray-900'
                : ''
            } focus:ring-2 focus:ring-purple-500/30`}
          />

          {/* Right Side Actions */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear Button */}
            {searchValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md transition-all duration-200 group/clear animate-in fade-in zoom-in duration-200 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100"
              >
                <X className={`h-3.5 w-3.5 ${
                  theme === 'dark' 
                    ? 'text-gray-400 group-hover/clear:text-red-400' 
                    : 'text-gray-500 group-hover/clear:text-red-600'
                } transition-colors`} />
              </button>
            )}

            {/* Keyboard Shortcut Hint */}
            {!isFocused && !searchValue && (
              <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors duration-200 animate-in fade-in slide-in-from-right-2 duration-300 ${
                theme === 'dark' 
                  ? 'border-white/10 bg-slate-700/50 text-gray-400' 
                  : 'border-gray-200 bg-gray-100 text-gray-500'
              }">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            )}

            {/* Searching Indicator */}
            {isSearching && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium animate-in fade-in zoom-in duration-200 ${
                theme === 'dark' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <Sparkles className="h-3 w-3 animate-spin" />
                <span>Searching</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Suggestions/Results Dropdown (shown when focused and has value) - Đảm bảo theme light/dark */}
        {isFocused && searchValue && (
          <div className={`absolute top-full left-0 right-0 mt-2 p-3 backdrop-blur-xl rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
            theme === 'dark' 
              ? 'bg-slate-900/95 border border-white/10 shadow-purple-500/10' 
              : 'bg-white/95 border border-gray-200 shadow-purple-500/10'
          }`}>
            <div className="space-y-2">
              {/* Quick Tip */}
              <div className="flex items-center gap-2 text-xs">
                <div className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <Sparkles className={`h-3 w-3 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                </div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Press <kbd className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                    theme === 'dark' 
                      ? 'text-white bg-slate-700 border border-white/10' 
                      : 'text-gray-900 bg-gray-100 border border-gray-300'
                  }`}>Enter</kbd> to search
                </span>
              </div>

              {/* Search Stats */}
              <div className={`flex items-center justify-between pt-2 ${
                theme === 'dark' ? 'border-t border-white/5' : 'border-t border-gray-200'
              }`}>
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Searching for: <span className={`font-medium ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`}>"{searchValue}"</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}