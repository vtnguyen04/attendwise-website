'use client';

import { Suspense } from 'react';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/layout/search-input';
import LanguageToggle from '@/components/layout/language-toggle';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import dynamic from 'next/dynamic';
import { useTheme as useCustomTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';

const UserNav = dynamic(() => import('@/components/layout/user-nav'), { ssr: false });
const NotificationBell = dynamic(() => import('@/components/notifications/notification-bell').then(mod => mod.NotificationBell), { ssr: false });

export default function DashboardHeader({ scrollY }: { scrollY: number }) {
  const { setTheme } = useTheme();
  const currentTheme = useCustomTheme();

  const hasScrolled = scrollY > 10;

  return (
    <header
      className={cn(
        'glass-card !rounded-none sticky top-0 z-30 flex flex-col border-b border-white/10 bg-transparent !overflow-visible shadow-glass',
        'transition-shadow duration-300 ease-in-out backdrop-blur-xl',
        hasScrolled && (currentTheme === 'dark' ? 'shadow-lg shadow-black/20' : 'shadow-lg shadow-gray-200/50')
      )}
    >
      <div className="flex h-14 items-center gap-4 px-4 lg:h-[60px] lg:px-6">
        {/* Mobile Sidebar Trigger */}
        <MobileSidebar />


        {/* Search Input */}
        <div className="w-full flex-1">
          <Suspense>
            <SearchInput />
          </Suspense>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Language Toggle with Glassmorphism */}
          <div className="relative group">
            <div className={`
              absolute -inset-1 rounded-lg blur-lg opacity-0 group-hover:opacity-100
              transition-opacity duration-500
              ${currentTheme === 'dark' 
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20' 
                : 'bg-gradient-to-r from-blue-400/20 to-cyan-400/20'}
            `} />
            <div className={`
              relative z-10
              ${currentTheme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 text-gray-300' 
                : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-600'}
              rounded-lg p-2
              transition-all duration-300
              hover:scale-105
              cursor-pointer
            `}>
              <LanguageToggle />
            </div>
          </div>

          {/* Notification Bell with Glassmorphism */}
          <div className="relative group">
            <div className={`
              absolute -inset-1 rounded-lg blur-lg opacity-0 group-hover:opacity-100
              transition-opacity duration-500
              ${currentTheme === 'dark' 
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' 
                : 'bg-gradient-to-r from-purple-400/20 to-pink-400/20'}
            `} />
            <div className={`
              relative z-10
              ${currentTheme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 text-gray-300' 
                : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-600'}
              rounded-lg p-2
              transition-all duration-300
              hover:scale-105
            `}>
              <NotificationBell />
            </div>
          </div>

          {/* Theme Toggle with Glassmorphism */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative group">
                <div className={`
                  absolute -inset-1 rounded-full blur-lg opacity-0 group-hover:opacity-100
                  transition-opacity duration-500
                  ${currentTheme === 'dark' 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' 
                    : 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20'}
                `} />
                <Button
                  variant="ghost"
                  size="icon"
                  className={`
                    relative z-10
                    ${currentTheme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                      : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-600'}
                    rounded-full h-8 w-8
                    transition-all duration-300
                    hover:scale-110
                  `}
                >
                  <Sun className={`h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 ${
                    currentTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                  <Moon className={`absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 ${
                    currentTheme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                  }`} />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className={`
                backdrop-blur-xl
                ${currentTheme === 'dark'
                  ? 'bg-slate-900/80 border-white/10 shadow-xl shadow-black/30'
                  : 'bg-white/80 border-gray-200/50 shadow-xl shadow-gray-100/50'}
                transition-all duration-300
                p-2
              `}
            >
              <DropdownMenuItem 
                onClick={() => setTheme('light')}
                className={`
                  ${currentTheme === 'dark'
                    ? 'hover:bg-white/10 focus:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100/50 focus:bg-gray-100/50 text-gray-700'}
                  rounded-lg transition-all duration-200
                  flex items-center gap-2
                `}
              >
                <Sun className={`mr-2 h-4 w-4 ${
                  currentTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'
                }`} />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme('dark')}
                className={`
                  ${currentTheme === 'dark'
                    ? 'hover:bg-white/10 focus:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100/50 focus:bg-gray-100/50 text-gray-700'}
                  rounded-lg transition-all duration-200
                  flex items-center gap-2
                `}
              >
                <Moon className={`mr-2 h-4 w-4 ${
                  currentTheme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                }`} />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme('system')}
                className={`
                  ${currentTheme === 'dark'
                    ? 'hover:bg-white/10 focus:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100/50 focus:bg-gray-100/50 text-gray-700'}
                  rounded-lg transition-all duration-200
                  flex items-center gap-2
                `}
              >
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile with Glassmorphism */}
          <div className="relative group">
            <div className={`
              absolute -inset-1 rounded-full blur-lg opacity-0 group-hover:opacity-100
              transition-opacity duration-500
              ${currentTheme === 'dark'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' 
                : 'bg-gradient-to-r from-purple-400/20 to-pink-400/20'}
            `} />
            <Suspense fallback={
              <div className={`
                h-8 w-8 rounded-full
                ${currentTheme === 'dark'
                  ? 'bg-gradient-to-br from-slate-700/50 to-slate-600/50'
                  : 'bg-gradient-to-br from-gray-200/50 to-gray-300/50'}
                animate-pulse
                backdrop-blur-sm
              `} />
            }>
              <div className={`
                relative z-10
                ${currentTheme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10' 
                  : 'bg-gray-100/50 hover:bg-gray-200/50'}
                rounded-full p-0.5
                transition-all duration-300
                hover:scale-105
              `}>
                <UserNav theme={"dashboard"} />
              </div>
            </Suspense>
          </div>
        </div>
      </div>

      {/* Breadcrumbs with Glassmorphism */}
      <div className={`
        hidden md:block px-4 lg:px-6 pb-2
        animate-in fade-in slide-in-from-top-2 duration-500
        ${currentTheme === 'dark' 
          ? 'bg-slate-900/20' 
          : 'bg-white/20'}
        rounded-b-lg
        transition-all duration-300
      `}>
        <Breadcrumbs />
      </div>
    </header>
  );
}
