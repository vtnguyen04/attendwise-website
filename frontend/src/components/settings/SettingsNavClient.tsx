'use client';

import { Separator } from "@/components/ui/separator";
import { ReactNode } from "react";
import { useTranslation } from "@/hooks/use-translation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const safeMessage = (value: string | undefined, fallback: string) =>
  value && !value.includes('.') ? value : fallback;

export function SettingsNavClient({ children }: { children: ReactNode }) {
  const { t } = useTranslation('settings');
  const pathname = usePathname();

  const sidebarNavItems = [
    {
      key: 'nav.profile',
      fallback: 'Profile',
      href: "/dashboard/settings",
    },
    {
      key: 'nav.security',
      fallback: 'Security',
      href: "/dashboard/settings/security",
    },
    {
      key: 'nav.notifications',
      fallback: 'Notifications',
      href: "/dashboard/settings/notifications",
    },
  ];

  const heading = safeMessage(t('title'), 'Settings');
  const description = safeMessage(
    t('description'),
    'Manage your account settings and preferences.'
  );

  return (
    <div className="mx-auto w-full space-y-10 px-6 py-10 xl:px-12">
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight text-glow">{heading}</h2>
        <p className="max-w-2xl text-base text-muted-foreground/80">{description}</p>
      </div>
      <Separator />
      <div className="glass-grid grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24">
          <nav className="glass-card interactive-spotlight p-3 shadow-glass">
            <ul className="space-y-2">
              {sidebarNavItems.map((item) => {
                const label = safeMessage(t(item.key), item.fallback);
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300",
                        isActive
                          ? "bg-primary/15 text-primary shadow-glass-lg border border-primary/20"
                          : "text-muted-foreground/90 border border-transparent hover:border-white/15 hover:bg-white/5 hover:text-foreground"
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <span>{label}</span>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glass" />}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-all duration-300",
                          isActive
                            ? "translate-x-0 text-primary"
                            : "translate-x-1 opacity-0 group-hover:opacity-100 group-hover:text-foreground"
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="flex-1">
          <div className="glass-card p-6 shadow-glass-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
