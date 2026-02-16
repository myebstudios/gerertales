
-- Social 2.1: Content Awareness & Persistent History

-- Add messages column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
