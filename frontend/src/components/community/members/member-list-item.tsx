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
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

interface MemberListItemProps {
  member: User;
  isUpdating: boolean;
  onRoleChange?: (memberId: string, newRole: "member" | "moderator") => void;
  onRemoveMember: (memberId: string) => void;
  onApproveMember?: (memberId: string) => void; // Optional for pending members
  onSelectMember: (member: User) => void;
  currentUserId?: string;
  isPending?: boolean; // To differentiate between active and pending list item actions
  viewerRole?: 'community_admin' | 'moderator' | 'member' | 'pending';
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
    viewerRole,
  }: MemberListItemProps) => {
    const canManage = viewerRole === 'community_admin' || viewerRole === 'moderator';
    const { t } = useTranslation('community');

    return (
      <Card
        key={member.id}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onSelectMember(member)}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
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
                  void (onApproveMember && onApproveMember(member.id));
                }}
                disabled={isUpdating}
              >
                {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('members_manage.approve')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMember(member.id);
                }} // Reject by removing
                disabled={isUpdating}
              >
                {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('members_manage.reject')}
              </Button>
            </>
          ) : (
            <> {/* Actions for active members */}
              {canManage && (
                <Select
                  onValueChange={(value: "member" | "moderator") =>
                    onRoleChange && onRoleChange(member.id, value)
                  }
                  value={member.role || "member"}
                  disabled={isUpdating || member.id === currentUserId} // Cannot change own role
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('members_manage.role_label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{t('members_manage.role_member')}</SelectItem>
                    <SelectItem value="moderator">
                      {t('members_manage.role_moderator')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {canManage && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveMember(member.id);
                  }}
                  disabled={isUpdating || member.id === currentUserId} // Cannot remove self
                >
                  {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {t('members_manage.remove')}
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
    );
  }
);

MemberListItem.displayName = "MemberListItem";

export default MemberListItem;
