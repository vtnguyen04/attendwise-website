'use client';

import { useUser } from '@/context/user-provider';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import Link from 'next/link';
import GetStartedButton from './marketing/get-started-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getNullableStringValue } from '@/lib/utils';

type UserNavProps = {
  theme?: 'marketing' | 'dashboard';
};

export default function UserNav({ theme = 'marketing' }: UserNavProps) {
  const { user, isLoading, logout } = useUser();

  // Trạng thái Loading
  if (isLoading) {
    if (theme === 'marketing') {
        return (
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
            </div>
        )
    }
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  // Trạng thái Đã đăng nhập
  if (user) {


    const imageUrl = getNullableStringValue(user.profile_picture_url);

    // Lấy tên người dùng, nếu không có thì dùng 'User' làm mặc định
    const userName = user.name || 'User'; 
    
    // Lấy chữ cái đầu tiên từ tên đã được chuẩn hóa
    const userInitial = userName.charAt(0).toUpperCase();
    return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9">
            <Avatar className="h-9 w-9">
              <AvatarImage key={imageUrl || 'default'} src={imageUrl} alt={userName} />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/profile/${user.id}`}>Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Trạng thái Chưa đăng nhập (chỉ hiển thị ở trang marketing)
  return (
    <div className="flex items-center gap-4">
      <Button asChild variant="ghost">
        <Link href="/login">Login</Link>
      </Button>
      <GetStartedButton />
    </div>
  );
}