
import { useUser } from '@/context/user-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Image from 'lucide-react/icons/image';
import Link from 'lucide-react/icons/link';
import Paperclip from 'lucide-react/icons/paperclip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { PostComposer } from '@/components/community/feed/PostComposer';

interface CreatePostCardProps {
  // className?: string; // Removed as it's not used
}

export default function CreatePostCard({ /* className */ }: CreatePostCardProps) {
  const { user, isLoading } = useUser();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className={cn("p-4" /*, className*/)}>
        <CardContent className="p-0">
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="w-full space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-24 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null; // Don't show this component if user is not logged in
  }

  return (
    <PostComposer />
  );
}

