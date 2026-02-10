
-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Story Likes Table
CREATE TABLE IF NOT EXISTS public.story_likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, story_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- Story Ratings Table
CREATE TABLE IF NOT EXISTS public.story_ratings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, story_id)
);

ALTER TABLE public.story_ratings ENABLE ROW LEVEL SECURITY;

-- Story Comments Table
CREATE TABLE IF NOT EXISTS public.story_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Library Saves Table
CREATE TABLE IF NOT EXISTS public.library_saves (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, story_id)
);

ALTER TABLE public.library_saves ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Likes: Anyone can read, authenticated can insert/delete own
CREATE POLICY "Story likes are viewable by everyone" ON public.story_likes FOR SELECT USING (true);
CREATE POLICY "Users can like stories" ON public.story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike stories" ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

-- Ratings: Anyone can read, authenticated can insert/update own
CREATE POLICY "Story ratings are viewable by everyone" ON public.story_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate stories" ON public.story_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating" ON public.story_ratings FOR UPDATE USING (auth.uid() = user_id);

-- Comments: Anyone can read, authenticated can insert own
CREATE POLICY "Comments are viewable by everyone" ON public.story_comments FOR SELECT USING (true);
CREATE POLICY "Users can post comments" ON public.story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.story_comments FOR DELETE USING (auth.uid() = user_id);

-- Library Saves: Owners can read/insert/delete own
CREATE POLICY "Users can view own saved library" ON public.library_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save stories to library" ON public.library_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove stories from library" ON public.library_saves FOR DELETE USING (auth.uid() = user_id);
