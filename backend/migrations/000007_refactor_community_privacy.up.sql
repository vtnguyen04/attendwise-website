-- Refactor community privacy model to a strict three-tier system

-- Step 1: Drop the old check constraint for the 'type' column
ALTER TABLE communities DROP CONSTRAINT check_community_type;

-- Step 2: Add the new 'secret' type to the check constraint
ALTER TABLE communities ADD CONSTRAINT check_community_type CHECK (type IN ('public', 'private', 'secret'));

-- Step 3: Drop the now-redundant columns
ALTER TABLE communities DROP COLUMN is_private;
ALTER TABLE communities DROP COLUMN require_approval;
