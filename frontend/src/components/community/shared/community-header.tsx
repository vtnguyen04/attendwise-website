'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Community } from '@/lib/types';
import { User } from '@/lib/types';
import Image from 'next/image';
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
import { getNullableStringValue } from '@/lib/utils';
import { getSafeImageUrl } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

interface CommunityHeaderProps {
  community: Community;
  currentUser: User | null;
}

export function CommunityHeader({ community, currentUser }: CommunityHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useCommunityAuth({ community, currentUser });
  const { toast } = useToast();
  const { t } = useTranslation('community');

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: t('header.link_copied_title'), description: t('header.link_copied_description') });
    });
  };

  const basePath = `/dashboard/communities/${community.id}`;

  const navLinks = [
    { name: t('header.nav.feed'), href: basePath, icon: <MessageSquare className="h-4 w-4" /> },
    { name: t('header.nav.members'), href: `${basePath}/members`, icon: <Users className="h-4 w-4" /> },
    { name: t('header.nav.events'), href: `${basePath}/events`, icon: <Calendar className="h-4 w-4" /> },
  ];

  if (isAdmin) {
    navLinks.push({ name: t('header.nav.admin'), href: `${basePath}/admin`, icon: <Shield className="h-4 w-4" /> });
  }

  return (
    <Card className="relative overflow-visible">
      <CardHeader className="p-0 overflow-hidden rounded-t-[inherit]">
        <div className="relative">
          <Image
            src={getSafeImageUrl(community.cover_image_url)}
            alt={`${community.name} cover image`}
            fill
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background transform-gpu hover:scale-105 transition-transform duration-300 -mt-16">
            <AvatarImage src={getSafeImageUrl(community.admin_avatar_url) || null} />
            <AvatarFallback className="text-4xl">{community.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{community.name}</h1>
            <p className="text-sm text-muted-foreground line-clamp-2">{getNullableStringValue(community.description)}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t('header.share_button')}
            </Button>
            <CommunityActionButton community={community} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0">
        <Tabs value={pathname} onValueChange={(value) => router.push(value)} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b">
            {navLinks.map(link => (
              <TabsTrigger key={link.href} value={link.href} asChild>
                <Link href={link.href}>
                  {link.icon}
                  {link.name}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardFooter>
    </Card>
  );
}
