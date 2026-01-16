ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_url TEXT;

-- Optional: backfill existing projects to use a default scheme if possible, 
-- or users will edit them. Defaulting to NULL is fine.
