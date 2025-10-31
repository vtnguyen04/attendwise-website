import React from "react";
import { User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/ui/icons";
import { getNullableStringValue } from "@/lib/utils";

interface MemberListItemProps {
  member: User;
  isUpdating: boolean;
  onRoleChange?: (memberId: string, newRole: "member" | "moderator") => void;
  onRemoveMember: (memberId: string) => void;
  onApproveMember?: (memberId: string) => void; // Optional for pending members
  onSelectMember: (member: User) => void;
  currentUserId?: string;
  isPending?: boolean; // To differentiate between active and pending list item actions
}

const MemberListItem = React.memo(
  ({
    member,
    isUpdating,
    onRoleChange,
    onRemoveMember,
    onApproveMember,
    onSelectMember,
    currentUserId,
    isPending = false,
  }: MemberListItemProps) => {
    return (
      <div
        key={member.id}
        className="liquid-glass-card p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => onSelectMember(member)}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 shadow-glass">
            <AvatarImage
              src={getNullableStringValue(member.profile_picture_url) || undefined}
            />
            <AvatarFallback>
              {member.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">
              {member.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? (
            <> {/* Actions for pending members */}
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveMember && onApproveMember(member.id);
                }}
                disabled={isUpdating}
                className="liquid-glass-button"
              >
                {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMember(member.id);
                }} // Reject by removing
                disabled={isUpdating}
                className="liquid-glass-button"
              >
                {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
            </>
          ) : (
            <> {/* Actions for active members */}
              <Select
                onValueChange={(value: "member" | "moderator") =>
                  onRoleChange && onRoleChange(member.id, value)
                }
                value={member.role || "member"}
                disabled={isUpdating || member.id === currentUserId} // Cannot change own role
              >
                <SelectTrigger className="liquid-glass-input w-[120px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="liquid-glass-nav">
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="moderator">
                    Moderator
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMember(member.id);
                }}
                disabled={isUpdating || member.id === currentUserId} // Cannot remove self
                className="liquid-glass-button"
              >
                {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Remove
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }
);

MemberListItem.displayName = "MemberListItem";

export default MemberListItem;
