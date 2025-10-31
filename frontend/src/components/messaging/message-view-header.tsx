// message-view-header.tsx
'use client';

import { useUser } from "@/context/user-provider";
import { useUserById } from "@/hooks/use-user";
import { Conversation } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Phone, Video, MoreVertical, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageViewHeaderProps {
  conversation: Conversation;
}

import { getNullableStringValue } from '@/lib/utils';

export const MessageViewHeader = ({ conversation }: MessageViewHeaderProps) => {
  const { user: currentUser } = useUser();
  const theme = useTheme();

  const otherParticipant = conversation.participants?.find(
    (p) => p.user_id !== currentUser?.id
  );
  const otherUserId = otherParticipant?.user_id || "";

  const { data: otherUser, isLoading } = useUserById(otherUserId);

  let displayName = conversation.name;
  let displayAvatar = getNullableStringValue(conversation.avatar_url);
  let isOnline = false;

  if (conversation.type === "direct") {
    if (isLoading) {
      return (
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 border-b transition-colors duration-200",
            theme === "dark"
              ? "bg-slate-950 border-slate-800"
              : "bg-white border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <Skeleton
              className={cn(
                "h-9 w-9 rounded-full",
                theme === "dark" ? "bg-slate-800" : "bg-slate-200"
              )}
            />
            <div className="space-y-1.5">
              <Skeleton
                className={cn(
                  "h-4 w-32",
                  theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                )}
              />
              <Skeleton
                className={cn(
                  "h-3 w-20",
                  theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                )}
              />
            </div>
          </div>
        </div>
      );
    }
    displayName = otherUser?.name || "Unknown User";
    displayAvatar = getNullableStringValue(otherUser?.profile_picture_url, `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`);
    isOnline = otherUser?.is_online || false;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b transition-colors duration-200",
        theme === "dark"
          ? "bg-slate-950 border-slate-800"
          : "bg-white border-slate-200"
      )}
    >
      {/* Left: User Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={displayAvatar || undefined} alt={displayName || ""} />
            <AvatarFallback
              className={cn(
                "text-xs font-medium",
                theme === "dark" ? "bg-slate-800" : "bg-slate-200"
              )}
            >
              {displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {conversation.type === "direct" && isOnline && (
            <div
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2",
                "bg-emerald-500",
                theme === "dark" ? "border-slate-950" : "border-white"
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "text-[14px] font-semibold truncate",
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            )}
          >
            {displayName}
          </h2>
          {conversation.type === "direct" && (
            <p
              className={cn(
                "text-[11px] font-medium",
                isOnline
                  ? theme === "dark"
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : theme === "dark"
                  ? "text-slate-500"
                  : "text-slate-500"
              )}
            >
              {isOnline ? "Online" : "Offline"}
            </p>
          )}
          {conversation.type === "group" && conversation.participants && (
            <p
              className={cn(
                "text-[11px] font-medium",
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              )}
            >
              {conversation.participants.length} members
            </p>
          )}
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            theme === "dark"
              ? "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
              : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          )}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            theme === "dark"
              ? "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
              : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          )}
        >
          <Video className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                theme === "dark"
                  ? "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                  : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              "min-w-[160px]",
              theme === "dark"
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-200"
            )}
          >
            <DropdownMenuItem
              className={cn(
                "text-[13px]",
                theme === "dark" ? "focus:bg-slate-800" : "focus:bg-slate-100"
              )}
            >
              <Info className="h-3.5 w-3.5 mr-2" />
              Conversation Info
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "text-[13px]",
                theme === "dark"
                  ? "text-red-400 focus:bg-red-950/30"
                  : "text-red-600 focus:bg-red-50"
              )}
            >
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
