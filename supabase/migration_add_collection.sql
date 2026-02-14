
-- Migration to add missing 'collection' column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS collection TEXT;

-- Ensure RLS is still correct
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Re-verify the published_at index
CREATE INDEX IF NOT EXISTS stories_published_at_idx ON public.stories (published_at DESC);
