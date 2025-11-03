-- Add community type for privacy settings (public, private, secret)
ALTER TABLE communities ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'public';
ALTER TABLE communities ADD CONSTRAINT check_community_type CHECK (type IN ('public', 'private', 'secret'));

-- Add setting to allow members to invite others
ALTER TABLE communities ADD COLUMN allow_member_invites BOOLEAN NOT NULL DEFAULT FALSE;
