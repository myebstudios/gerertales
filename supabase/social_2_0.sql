
-- Social 2.0: Follows & Notifications

-- 1. Follows Table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 2. Notifications Table
CREATE TYPE public.notification_type AS ENUM (
    'like', 'comment', 'reply', 'follow', 'story_update', 'recommendation', 'system'
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
    comment_id UUID REFERENCES public.story_comments(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- 3. Update Comments for Threading
ALTER TABLE public.story_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.story_comments(id) ON DELETE CASCADE;

-- 4. Triggers for Automatic Notifications

-- Trigger for Likes
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
    story_owner_id UUID;
BEGIN
    SELECT owner_id INTO story_owner_id FROM public.stories WHERE id = NEW.story_id;
    
    -- Don't notify if liking own story
    IF story_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, story_id)
        VALUES (story_owner_id, NEW.user_id, 'like', NEW.story_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_story_like
    AFTER INSERT ON public.story_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();

-- Trigger for Comments & Replies
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    story_owner_id UUID;
    parent_comment_owner_id UUID;
BEGIN
    SELECT owner_id INTO story_owner_id FROM public.stories WHERE id = NEW.story_id;
    
    -- Check if it's a reply
    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO parent_comment_owner_id FROM public.story_comments WHERE id = NEW.parent_id;
        
        -- Notify the person who made the original comment (if not replying to self)
        IF parent_comment_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (recipient_id, actor_id, type, story_id, comment_id)
            VALUES (parent_comment_owner_id, NEW.user_id, 'reply', NEW.story_id, NEW.id);
        END IF;
    END IF;

    -- Notify the story owner (if not the one commenting and if not already notified as a reply)
    IF story_owner_id != NEW.user_id AND (NEW.parent_id IS NULL OR story_owner_id != parent_comment_owner_id) THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, story_id, comment_id)
        VALUES (story_owner_id, NEW.user_id, 'comment', NEW.story_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_story_comment
    AFTER INSERT ON public.story_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- Trigger for New Follow
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_follow
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow();
