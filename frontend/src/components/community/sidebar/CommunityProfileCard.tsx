'use client';

import { Community } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Users from 'lucide-react/icons/users';
import BookOpen from 'lucide-react/icons/book-open';
import Share2 from 'lucide-react/icons/share-2';
// Các component Avatar giờ đã được sử dụng
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getNullableStringValue } from '@/lib/utils';

interface CommunityProfileCardProps {
  community: Community;
}

export function CommunityProfileCard({ community }: CommunityProfileCardProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const fullDescription = getNullableStringValue(community.description, 'No description available.');
  const isLongDescription = fullDescription.length > 150;
  const displayedDescription = isLongDescription
    ? fullDescription.substring(0, 150) + '...'
    : fullDescription;

  return (
    <>
      <Card>
        {/* Bọc CardHeader trong một div để sắp xếp Avatar và Tiêu đề */}
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          {/* SỬ DỤNG AVATAR TẠI ĐÂY */}
          <Avatar className="h-12 w-12 rounded-lg">
            {/* Giả sử community object có thuộc tính `image_url` */}
            <AvatarImage src={community.cover_image_url} alt={`${community.name} avatar`} />
            <AvatarFallback className="rounded-lg text-lg font-bold">
              {community.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <CardTitle>{community.name}</CardTitle>
            <CardDescription className="line-clamp-3 pt-1">
              {displayedDescription}
            </CardDescription>
            {isLongDescription && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsDescriptionOpen(true)}
                className="px-0 -ml-1 h-auto py-1"
              >
                Read More
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl bg-muted p-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-lg font-bold text-foreground">
                {community.member_count || 0}
              </p>
            </div>
          </div>
          <Button className="w-full">
            <Users className="mr-2 h-4 w-4" />
            Invite People
          </Button>
        </CardContent>
        <CardFooter className="flex-col items-start">
          <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
            Explore
          </p>
          <nav className="mt-2 w-full space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Start Here
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Share2 className="mr-2 h-4 w-4" />
              Resources
            </Button>
          </nav>
        </CardFooter>
      </Card>

      {/* Description Modal */}
      <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border dark:border-white/5 light:border-gray-200 dark:bg-slate-900/50 light:bg-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl dark:text-white light:text-gray-900">
              {community.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Community description
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="dark:text-gray-300 light:text-gray-700 leading-relaxed whitespace-pre-wrap">
              {fullDescription}
            </p>

            <div className="flex items-center gap-4 p-4 dark:bg-white/5 light:bg-gray-50 rounded-xl">
              <div className="p-3 dark:bg-purple-500/20 light:bg-purple-100 rounded-lg flex-shrink-0">
                <Users className="h-6 w-6 dark:text-purple-400 light:text-purple-600" />
              </div>
              <div>
                <p className="text-sm dark:text-gray-400 light:text-gray-500">Members</p>
                <p className="text-2xl font-bold dark:text-white light:text-gray-900">
                  {community.member_count || 0}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}