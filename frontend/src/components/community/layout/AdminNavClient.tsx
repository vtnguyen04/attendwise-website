'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Settings from 'lucide-react/icons/settings';
import UserCheck from 'lucide-react/icons/user-check';
import ListTodo from 'lucide-react/icons/list-todo';
import Users from 'lucide-react/icons/users';
import Calendar from 'lucide-react/icons/calendar';

const CalendarIcon = Calendar;

export function AdminNavClient() {
  const pathname = usePathname();
  const params = useParams();
  const communityId = params.id as string;

  const basePath = `/dashboard/communities/${communityId}/admin`;

  const adminNav = [
    { name: 'Settings', href: basePath, icon: <Settings className="h-5 w-5" /> },
    { name: 'Pending Members', href: `${basePath}/pending-members`, icon: <UserCheck className="h-5 w-5" /> },
    { name: 'Pending Posts', href: `${basePath}/pending-posts`, icon: <ListTodo className="h-5 w-5" /> },
    { name: 'Manage Members', href: `${basePath}/manage-members`, icon: <Users className="h-5 w-5" /> },
    { name: 'Manage Events', href: `${basePath}/manage-events`, icon: <CalendarIcon className="h-5 w-5" /> },
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {adminNav.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Button key={item.name} variant="ghost" asChild className={cn("liquid-glass-button", isActive && "bg-glass-interactive")}>
            <Link
              href={item.href}
              className='text-foreground'
            >
              {item.icon}
              {item.name}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
