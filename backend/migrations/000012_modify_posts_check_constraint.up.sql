-- Drop the existing check constraint on posts table
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_check;

-- Add a new check constraint that allows both community_id and event_id to be NULL
ALTER TABLE posts ADD CONSTRAINT posts_check CHECK (
    (community_id IS NOT NULL AND event_id IS NULL) OR
    (community_id IS NULL AND event_id IS NOT NULL) OR
    (community_id IS NULL AND event_id IS NULL) -- Allow both to be NULL for general posts
);
