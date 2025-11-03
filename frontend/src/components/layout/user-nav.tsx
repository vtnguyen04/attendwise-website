'use client';

import { useMemo } from 'react';
import { useUser } from '@/context/user-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import GetStartedButton from '@/components/marketing/get-started-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getNullableStringValue } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import UserRound from 'lucide-react/icons/user-round';
import BellRing from 'lucide-react/icons/bell-ring';
import Settings2 from 'lucide-react/icons/settings-2';
import LogOut from 'lucide-react/icons/log-out';

type UserNavProps = {
  theme?: 'marketing' | 'dashboard';
};

export default function UserNav({ theme = 'marketing' }: UserNavProps) {
  const { user, isLoading, logout } = useUser();
  const { t } = useTranslation('user');

  const menuItems = useMemo(() => [
    {
      icon: Settings2,
      label: t('menu.account_settings'),
      description: t('menu.account_settings.subtitle'),
      href: '/dashboard/settings',
      tone: 'default' as const,
    },
    {
      icon: BellRing,
      label: t('menu.notifications'),
      description: t('menu.notifications.subtitle'),
      href: '/dashboard/notifications',
      tone: 'default' as const,
    },
    {
      icon: LogOut,
      label: t('logout'),
      description: t('menu.logout.subtitle'),
      action: logout,
      tone: 'destructive' as const,
    },
  ], [logout, t]);

  // Trạng thái Loading
  if (isLoading) {
    if (theme === 'marketing') {
        return (
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
            </div>
        )
    }
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (user) {
    const userName = (user.name && user.name.trim()) || getNullableStringValue((user as { full_name?: { String: string; Valid: boolean } })?.full_name) || t('anonymous');
    const userInitial = userName.charAt(0).toUpperCase();
    const imageUrl = getNullableStringValue(user.profile_picture_url) || user.image || user.picture;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9">
            <Avatar className="h-9 w-9">
              <AvatarImage key={imageUrl || 'default'} src={imageUrl} alt={userName} />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          <span className="sr-only">{t('toggle_menu')}</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-0 shadow-xl backdrop-blur-md"
        >
          <DropdownMenuLabel className="flex flex-col gap-4 bg-muted/20 px-4 py-4">
            <Link href={`/dashboard/profile/${user.id}`} className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border/50">
                <AvatarImage key={imageUrl || 'default-top'} src={imageUrl} alt={userName} />
                <AvatarFallback className="text-lg">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-none text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground leading-none">{user.email}</p>
              </div>
            </Link>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="w-full justify-center gap-2 rounded-xl border border-border/40 bg-background/60 hover:border-primary/40 hover:bg-muted/40 shadow-sm transition-colors duration-300"
            >
              <Link href={`/dashboard/profile/${user.id}`}>
                <UserRound className="h-4 w-4" />
                {t('profile')}
              </Link>
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/40" />
          <div className="py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <DropdownMenuItem
                    key={item.label}
                    asChild
                    className="group cursor-pointer px-4 py-3 hover:bg-muted/20 focus:bg-muted/20"
                  >
                    <Link href={item.href} className="flex w-full items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-200',
                          'border-border/60 bg-muted/30 text-muted-foreground group-hover:text-primary'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={item.label}
                  onSelect={() => item.action?.()}
                  className="group cursor-pointer px-4 py-3 hover:bg-muted/20 focus:bg-muted/20"
                >
                  <div className="flex w-full items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-200',
                        item.tone === 'destructive'
                          ? 'border-red-500/40 bg-red-500/10 text-red-500 group-hover:border-red-500 group-hover:bg-red-500/15'
                          : 'border-border/60 bg-muted/30 text-muted-foreground group-hover:text-primary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          item.tone === 'destructive' ? 'text-red-500' : 'text-foreground'
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Trạng thái Chưa đăng nhập (chỉ hiển thị ở trang marketing)
  return (
    <div className="flex items-center gap-4">
      <Button asChild variant="ghost">
        <Link href="/login">{t('login')}</Link>
      </Button>
      <GetStartedButton />
    </div>
  );
}
