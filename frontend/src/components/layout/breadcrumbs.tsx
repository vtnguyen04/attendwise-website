'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Home from 'lucide-react/icons/home';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';

export default function Breadcrumbs() {
  const pathname = usePathname();
  const theme = useTheme();
  const { t } = useTranslation();

  const segmentLabelMap: Record<string, string> = {
    communities: t('communities.explore_title'),
    my: t('community.my_communities_tab'),
    events: t('events.title'),
    attendees: t('events.attendees'),
    settings: t('settings.title'),
    messages: t('common.messages'),
    members: t('common.members'),
    analytics: t('analytics.title'),
    calendar: t('common.calendar'),
    classroom: t('common.classroom'),
    leaderboards: t('common.leaderboards'),
    map: t('common.map'),
    feed: t('common.feed.posts'),
    profile: t('user.profile'),
    edit: t('common.edit'),
    create: t('events.create.button'),
    dashboard: t('breadcrumb.dashboard'),
  };

  const pathSegments = pathname.split('/').filter(Boolean);

  if (pathSegments[0] === 'dashboard') {
    pathSegments.shift();
  }

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = `/dashboard/${pathSegments.slice(0, index + 1).join('/')}`;
    const translation = segmentLabelMap[segment];
    const label = translation
      ? translation
      : segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

    return { href, label };
  });

  // If we're on the root dashboard, don't show breadcrumbs
  if (pathname === '/dashboard') {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center gap-1 text-sm animate-in fade-in slide-in-from-left-4 duration-500"
    >
      {/* Home Link */}
      <Link
        href="/dashboard"
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300",
          theme === 'dark' 
            ? 'text-gray-400 hover:text-white hover:bg-white/5' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        )}
      >
        <Home className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
        <span className="font-medium">{t('breadcrumb.dashboard')}</span>
      </Link>

      {/* Breadcrumb Items */}
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        return (
          <div 
            key={item.href} 
            className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Separator */}
            <ChevronRight className={cn(
              "h-4 w-4",
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            )} />
            
            {/* Breadcrumb Link or Current Page */}
            {isLast ? (
              <span className={cn(
                "relative px-2 py-1 rounded-lg font-semibold transition-all duration-300",
                theme === 'dark' 
                  ? 'text-white bg-white/10' 
                  : 'text-gray-900 bg-gray-100'
              )}>
                {item.label}
                <div className={cn(
                  "absolute inset-0 rounded-lg blur animate-pulse",
                  theme === 'dark' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-r from-purple-400/20 to-pink-400/20'
                )} />
              </span>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  "group relative px-2 py-1 rounded-lg transition-all duration-300",
                  theme === 'dark' 
                    ? 'text-gray-400 hover:text-white hover:bg-white/5' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <span className="relative font-medium">{item.label}</span>
                <span className={cn(
                  "absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-purple-400 to-pink-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left",
                  theme === 'light' && 'from-purple-500 to-pink-500'
                )} />
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
