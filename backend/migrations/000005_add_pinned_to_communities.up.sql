-- Add is_pinned column to community_members table
ALTER TABLE community_members ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
