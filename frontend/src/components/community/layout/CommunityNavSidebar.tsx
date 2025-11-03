// components/community/layout/CommunityNavSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Home from 'lucide-react/icons/home';
import Users from 'lucide-react/icons/users';
import Calendar from 'lucide-react/icons/calendar';
import Settings from 'lucide-react/icons/settings';
import { cn } from '@/lib/utils';
import { Community } from '@/lib/types';

interface CommunityNavSidebarProps {
  community: Community;
}

export function CommunityNavSidebar({ community }: CommunityNavSidebarProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/communities/${community.id}`;

  const navLinks = [
    { name: 'Feed', href: basePath, icon: Home },
    { name: 'Members', href: `${basePath}/members`, icon: Users },
    { name: 'Events', href: `${basePath}/events`, icon: Calendar },
    { name: 'Admin', href: `${basePath}/admin`, icon: Settings, adminOnly: true },
  ];

  const userIsAdmin = community.role === 'community_admin';

  return (
    <nav className="space-y-1 px-0">
      {navLinks.map((link) => {
        if (link.adminOnly && !userIsAdmin) {
          return null;
        }
        const isActive = link.href === basePath ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Button key={link.name} variant="ghost" asChild className={cn("w-full justify-start liquid-glass-button", isActive && "bg-glass-interactive")}>
            <Link
              href={link.href}
            >
              <link.icon className="h-4 w-4 flex-shrink-0 mr-3" />
              <span className="text-xs md:text-sm">{link.name}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}