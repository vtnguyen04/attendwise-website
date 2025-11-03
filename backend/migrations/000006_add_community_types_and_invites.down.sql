-- Revert the changes from the up migration
ALTER TABLE communities DROP COLUMN allow_member_invites;
ALTER TABLE communities DROP CONSTRAINT check_community_type;
ALTER TABLE communities DROP COLUMN type;
