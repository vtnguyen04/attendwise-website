import React from "react";
import { User } from "@/lib/types";
import MemberListItem from './member-list-item';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

interface MemberListProps {
  title: string;
  members: User[];
  isUpdating: boolean;
  onRoleChange?: (memberId: string, newRole: "member" | "moderator") => void;
  onRemoveMember: (memberId: string) => void;
  onApproveMember?: (memberId: string) => void; // Optional for pending members
  onSelectMember: (member: User) => void;
  currentUserId?: string;
  isPending?: boolean; // To differentiate between active and pending list
  viewerRole?: 'community_admin' | 'moderator' | 'member' | 'pending' | undefined;
}

const MemberList = React.memo(
  ({
    title,
    members,
    isUpdating,
    onRoleChange,
    onRemoveMember,
    onApproveMember,
    onSelectMember,
    currentUserId,
    isPending = false,
    viewerRole,
  }: MemberListProps) => {
    const { t } = useTranslation('community');
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">
              {isPending ? t('members_manage.pending_empty') : t('members_manage.active_empty')}
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <MemberListItem
                  key={member.id}
                  member={member}
                  isUpdating={isUpdating}
                  onRoleChange={onRoleChange}
                  onRemoveMember={onRemoveMember}
                  onApproveMember={onApproveMember}
                  onSelectMember={onSelectMember}
                  currentUserId={currentUserId}
                  isPending={isPending}
                  viewerRole={viewerRole}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

MemberList.displayName = "MemberList";

export default MemberList;
