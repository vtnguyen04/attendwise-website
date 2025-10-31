'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CalendarDays from 'lucide-react/icons/calendar-days';
import LayoutDashboard from 'lucide-react/icons/layout-dashboard';
import Building from 'lucide-react/icons/building';
import School from 'lucide-react/icons/school';
import Map from 'lucide-react/icons/map';
import Trophy from 'lucide-react/icons/trophy';
import Calendar from 'lucide-react/icons/calendar';
import Users from 'lucide-react/icons/users';
import Settings from 'lucide-react/icons/settings';
import BarChart from 'lucide-react/icons/bar-chart';
import MessageSquare from 'lucide-react/icons/message-square';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from './ui/separator';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { useTotalUnreadMessageCount } from '@/hooks/use-messaging';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string;
};

const mainNavItems = (t: (key: string) => string, unreadMessageCount: number): NavItem[] => [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: t('home'),
    exact: true,
  },
  {
    href: '/dashboard/communities',
    icon: Building,
    label: t('community'),
  },
  {
    href: '/dashboard/classroom',
    icon: School,
    label: t('classroom'),
  },
  {
    href: '/dashboard/events',
    icon: CalendarDays,
    label: t('events'),
    badge: '12',
  },
  {
    href: '/dashboard/calendar',
    icon: Calendar,
    label: t('calendar'),
  },
  {
    href: '/dashboard/members',
    icon: Users,
    label: t('members'),
  },
  {
    href: '/dashboard/map',
    icon: Map,
    label: t('map'),
  },
  {
    href: '/dashboard/leaderboards',
    icon: Trophy,
    label: t('leaderboards'),
  },
  {
    href: '/dashboard/messages',
    icon: MessageSquare,
    label: t('messages'),
    badge: unreadMessageCount > 0 ? String(unreadMessageCount) : undefined,
  },
  {
    href: '/dashboard/analytics',
    icon: BarChart,
    label: t('analytics'),
  },
];

const bottomNavItems = (t: (key: string) => string) => [
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: t('settings'),
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const theme = useTheme();
  const { state } = useSidebar();

  const { data: unreadMessageCount = 0 } = useTotalUnreadMessageCount();

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    if (href !== '/dashboard/analytics' && href !== '/dashboard/settings') {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  const navItems = mainNavItems(t, unreadMessageCount);
  const btmNavItems = bottomNavItems(t);

  return (
    <>
      {/* Header */}
      <SidebarHeader className={cn(
        "bg-glass px-4 py-5 border-b-0 transition-all duration-300 group-data-[state=collapsed]:px-3"
      )}>
        <Link 
          href="/" 
          className="flex items-center gap-3 group group-data-[state=collapsed]:justify-center"
        >
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300",
            "group-hover:scale-105",
            theme === 'dark' 
              ? 'bg-slate-800 group-hover:bg-slate-700' 
              : 'bg-slate-900 group-hover:bg-slate-800'
          )}>
            <span className="font-bold text-white text-base">A</span>
          </div>

          <div className="transition-all duration-300 group-data-[state=collapsed]:hidden group-data-[state=collapsed]:-translate-x-4">
            <h1 className={cn(
              "font-semibold text-[15px] transition-colors duration-200",
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            )}>
              AttendWise
            </h1>
            <p className={cn(
              "text-[11px] font-medium",
              theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
            )}>Event Platform</p>
          </div>
        </Link>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className={cn(
        "bg-glass px-2 py-3 transition-colors duration-200"
      )}>
        <SidebarMenu className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    'group relative px-3 py-2 h-auto rounded-md transition-all duration-150',
                    theme === 'dark'
                      ? 'hover:bg-slate-800/80'
                      : 'hover:bg-slate-50',
                    active && (
                      theme === 'dark'
                        ? 'bg-slate-800 text-slate-50'
                        : 'bg-slate-100 text-slate-900'
                    ),
                    !active && (
                      theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    )
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3 w-full">
                    {active && (
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-sm",
                        theme === 'dark' ? 'bg-slate-50' : 'bg-slate-900'
                      )} />
                    )}

                    <Icon className={cn(
                      'h-[18px] w-[18px] transition-colors duration-150',
                      active 
                        ? theme === 'dark' ? 'text-slate-50' : 'text-slate-900'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )} />

                    <span className={cn(
                      "flex-1 text-[13px] font-medium transition-all duration-300 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:-translate-x-4",
                      active 
                        ? theme === 'dark' ? 'text-slate-50' : 'text-slate-900'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      {item.label}
                    </span>

                    {item.badge && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-[10px] font-semibold rounded transition-all duration-300 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:-translate-x-4',
                        active 
                          ? theme === 'dark' 
                            ? 'bg-slate-700 text-slate-200' 
                            : 'bg-slate-200 text-slate-700'
                          : theme === 'dark' 
                            ? 'bg-slate-800 text-slate-400' 
                            : 'bg-slate-100 text-slate-600'
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <Separator className={cn(
        "transition-all duration-300 ease-in-out group-data-[state=collapsed]:opacity-0",
        theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'
      )} />

      {/* Footer Navigation */}
      <SidebarFooter className={cn(
        "bg-glass px-2 py-3 transition-colors duration-200"
      )}>
        <SidebarMenu>
          {btmNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    'group relative px-3 py-2 h-auto rounded-md transition-all duration-150',
                    theme === 'dark'
                      ? 'hover:bg-slate-800/80'
                      : 'hover:bg-slate-50',
                    active && (
                      theme === 'dark'
                        ? 'bg-slate-800 text-slate-50'
                        : 'bg-slate-100 text-slate-900'
                    ),
                    !active && (
                      theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    )
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3 w-full">
                    <Icon className={cn(
                      'h-[18px] w-[18px] transition-all duration-200',
                      'group-hover:rotate-90',
                      active 
                        ? theme === 'dark' ? 'text-slate-50' : 'text-slate-900'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )} />
                    <span className={cn(
                      "text-[13px] font-medium transition-all duration-300 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:-translate-x-4",
                      active 
                        ? theme === 'dark' ? 'text-slate-50' : 'text-slate-900'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Status Card */}
        <div className={cn(
          "mt-3 p-3 rounded-lg border transition-all duration-300 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:-translate-x-4",
          theme === 'dark'
            ? 'bg-slate-900 border-slate-800'
            : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              theme === 'dark' ? 'bg-emerald-400' : 'bg-emerald-500'
            )} />
            <span className={cn(
              "text-[13px] font-semibold",
              theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
            )}>Pro Plan</span>
          </div>
          <p className={cn(
            "text-[11px] font-medium",
            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
          )}>Unlimited events & features</p>
        </div>
      </SidebarFooter>
    </>
  );
}