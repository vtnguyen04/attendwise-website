-- Revert the changes from the 000007 migration

-- Step 1: Add the dropped columns back with their old defaults
ALTER TABLE communities ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE communities ADD COLUMN require_approval BOOLEAN NOT NULL DEFAULT TRUE;

-- Step 2: Drop the new check constraint
ALTER TABLE communities DROP CONSTRAINT check_community_type;

-- Step 3: Add the old check constraint back
ALTER TABLE communities ADD CONSTRAINT check_community_type CHECK (type IN ('public', 'private'));
