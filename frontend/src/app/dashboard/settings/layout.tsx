'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // Import Button

const sidebarNavItems = [
  {
    title: "Profile",
    href: "/dashboard/settings",
  },
  {
    title: "Security",
    href: "/dashboard/settings/security",
  },
  {
    title: "Notifications",
    href: "/dashboard/settings/notifications",
  },
];

function SettingsSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {sidebarNavItems.map((item) => (
                <Button
          key={item.href}
          asChild
          className={cn(
            "justify-start liquid-glass-button",
            pathname === item.href && "bg-muted text-foreground hover:bg-muted"
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
  return (
    <div className="relative mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-60 blur-3xl" />

      {/* Header Card */}
      <div className="glass-card interactive-spotlight p-6 shadow-glass-lg sm:p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-glow">Settings</h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Manage your account settings and set e-mail preferences.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="glass-card p-6 shadow-glass-lg sm:p-8">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="lg:w-1/5">
            <SettingsSidebarNav />
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
}