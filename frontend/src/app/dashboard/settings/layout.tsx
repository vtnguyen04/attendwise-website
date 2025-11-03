'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

const sidebarNavItems = (t: (key: string) => string) => [
  {
    title: t('nav.profile'),
    href: "/dashboard/settings",
  },
  {
    title: t('nav.security'),
    href: "/dashboard/settings/security",
  },
  {
    title: t('nav.notifications'),
    href: "/dashboard/settings/notifications",
  },
];

function SettingsSidebarNav() {
  const pathname = usePathname();
  const { t } = useTranslation('settings');

  return (
    <nav className="flex flex-col space-y-1">
      {sidebarNavItems(t).map((item) => (
        <Button
          key={item.href}
          asChild
          variant="ghost"
          className={cn(
            "justify-start liquid-glass-button w-full text-sm font-medium",
            pathname === item.href
              ? "ring-1 ring-primary/40 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Link href={item.href}>{item.title}</Link>
        </Button>
      ))}
    </nav>
  );
}

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="relative w-full px-4 py-6 sm:px-6 lg:px-10" data-primary-content>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-30 blur-3xl" />

      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full rounded-2xl border border-border/50 bg-card/80 p-4 shadow-glass backdrop-blur lg:sticky lg:top-20 lg:max-w-[260px]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {t('sections.title')}
          </h2>
          <SettingsSidebarNav />
        </aside>

        <section className="flex-1 min-w-0 space-y-6 lg:space-y-8" data-scroll-anchor>
          <div
            className="rounded-3xl border border-border/50 bg-card/85 p-6 shadow-glass-lg backdrop-blur-sm sm:p-8"
            data-scroll-skip="true"
          >
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-glow sm:text-4xl">
                {t('title')}
              </h1>
              <p className="text-base text-muted-foreground">{t('description')}</p>
            </div>
          </div>

          <div className="w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}
