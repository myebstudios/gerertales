
-- 1. Profiles Table Setup
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT DEFAULT 'Guest Writer',
    bio TEXT,
    avatar_color TEXT DEFAULT '#60A5FA',
    avatar_url TEXT,
    joined_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    credits FLOAT DEFAULT 50.0,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_tier TEXT DEFAULT 'free',
    is_admin BOOLEAN DEFAULT false,
    is_super_admin BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'Writer'
);

-- 2. Stories Table Setup
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    spark TEXT,
    tone TEXT,
    format TEXT,
    active_chapter_index INTEGER DEFAULT 0,
    characters JSONB DEFAULT '[]'::jsonb,
    locations JSONB DEFAULT '[]'::jsonb,
    toc JSONB DEFAULT '[]'::jsonb,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cover_image TEXT,
    collection TEXT,
    is_public BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS stories_published_at_idx ON public.stories (published_at DESC);
CREATE INDEX IF NOT EXISTS stories_is_public_idx ON public.stories (is_public);
CREATE INDEX IF NOT EXISTS stories_owner_id_idx ON public.stories (owner_id);

-- Explicitly link stories to profiles for PostgREST joins
-- This is critical for the "profiles(name)" query to work
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_owner_id_fkey;
ALTER TABLE public.stories 
ADD CONSTRAINT stories_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 4. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 5. Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Stories Policies
DROP POLICY IF EXISTS "Stories are viewable by owner or if public" ON public.stories;
CREATE POLICY "Stories are viewable by owner or if public" ON public.stories 
FOR SELECT USING (is_public = true OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own stories" ON public.stories;
CREATE POLICY "Users can insert own stories" ON public.stories 
FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories" ON public.stories 
FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories" ON public.stories 
FOR DELETE USING (auth.uid() = owner_id);

-- 7. Audit Logs Table & Policies
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all logs" ON public.audit_logs;
CREATE POLICY "Admins can view all logs" ON public.audit_logs 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true))
);

DROP POLICY IF EXISTS "Everyone can insert logs" ON public.audit_logs;
CREATE POLICY "Everyone can insert logs" ON public.audit_logs 
FOR INSERT WITH CHECK (true);
