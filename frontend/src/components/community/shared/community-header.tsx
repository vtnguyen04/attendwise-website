'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Community } from '@/lib/types';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunityActionButton } from '@/components/community/shared/community-action-button';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import MessageSquare from 'lucide-react/icons/message-square';
import Users from 'lucide-react/icons/users';
import Calendar from 'lucide-react/icons/calendar';
import Shield from 'lucide-react/icons/shield';
import Share2 from 'lucide-react/icons/share-2';
import { useCommunityAuth } from '@/hooks/use-community-auth';
import { useTheme } from '@/hooks/use-theme';
import { getNullableStringValue } from '@/lib/utils';
import { getSafeImageUrl } from '@/lib/utils';

interface CommunityHeaderProps {
  community: Community;
  currentUser: User | null;
}

export function CommunityHeader({ community, currentUser }: CommunityHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { isAdmin } = useCommunityAuth({ community, currentUser });
  const { toast } = useToast();

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link Copied', description: 'Community link has been copied to your clipboard.' });
    });
  };

  const basePath = `/dashboard/communities/${community.id}`;

  const navLinks = [
    { name: 'Feed', href: basePath, icon: <MessageSquare className="h-4 w-4" /> },
    { name: 'Members', href: `${basePath}/members`, icon: <Users className="h-4 w-4" /> },
    { name: 'Events', href: `${basePath}/events`, icon: <Calendar className="h-4 w-4" /> },
  ];

  if (isAdmin) {
    navLinks.push({ name: 'Admin', href: `${basePath}/admin`, icon: <Shield className="h-4 w-4" /> });
  }

  return (
    <header className={cn(
      "bg-glass border-b-0 transition-all duration-300 overflow-hidden"
    )}>
      <div className="container mx-auto max-w-5xl">
        {/* Main Content with 3D Depth */}
        <div className={cn(
          "bg-glass flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6 p-4 rounded-t-lg transition-all duration-300 depth-card"
        )}>
          <div className="relative tilt-card">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 transform-gpu hover:scale-105 transition-transform duration-300">
              <AvatarImage src={getSafeImageUrl(community.admin_avatar_url)} />
              <AvatarFallback className="text-4xl">{community.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {/* Glow effect around avatar */}
            <div className={cn(
              "absolute inset-0 rounded-full blur-lg -z-10",
              theme === 'dark' ? 'bg-purple-500/30' : 'bg-purple-400/20'
            )} />
          </div>

          {/* Text Content with 3D Effect */}
          <div className="flex-1 text-center md:text-left hover-3d">
              <h1 className={cn(
                "text-2xl md:text-3xl font-bold transition-colors duration-300",
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>{community.name}</h1>
              <p className={cn(
                "text-sm line-clamp-2 transition-colors duration-300",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>{getNullableStringValue(community.description)}</p>
          </div>

          {/* Buttons with 3D Effect */}
          <div className="flex-shrink-0 flex items-center gap-2 hover-3d">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="liquid-glass-button"
              >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
              </Button>
              <CommunityActionButton community={community} />
          </div>
        </div>

        {/* Navigation with 3D Effect */}
        <nav className={cn(
          "flex border-b transition-colors duration-300 tilt-card",
          theme === 'dark' ? 'border-white/5' : 'border-gray-200'
        )}>
          {navLinks.map(link => {
            const isActive = link.href === basePath
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-300 transform-gpu hover:scale-105 liquid-glass-button",
                  isActive
                    ? theme === 'dark'
                      ? 'border-primary text-primary'
                      : 'border-purple-500 text-purple-600'
                    : theme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
