import React from "react";
import { User } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import MemberListItem from "./member-list-item";
import { Icons } from "@/components/ui/icons";

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
  }: MemberListProps) => {
    return (
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {members.length === 0 ? (
          <p className="text-muted-foreground">
            {isPending ? "No pending join requests." : "No active members in this community."}
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
              />
            ))}
          </div>
        )}
      </GlassCard>
    );
  }
);

MemberList.displayName = "MemberList";

export default MemberList;
