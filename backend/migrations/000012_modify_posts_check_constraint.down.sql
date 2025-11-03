-- Drop the new check constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_check;

-- Re-add the original check constraint
ALTER TABLE posts ADD CONSTRAINT posts_check CHECK (community_id IS NOT NULL OR event_id IS NOT NULL);
