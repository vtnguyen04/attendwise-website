
import { useUser } from '@/context/user-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PostComposer } from '@/components/community/feed/PostComposer';

export default function CreatePostCard() {
  const { user, isLoading } = useUser();

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

