
import { supabase } from './supabaseClient';
import { Story, UserProfile, Message } from '../types';

export const supabaseService = {
  // Auth
  async signInWithGoogle() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const redirectUrl = isLocalhost 
        ? window.location.origin + '/library'
        : 'https://gerertales-ai.netlify.app/library';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  },

  async signInWithEmail(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
        email,
        password,
    });
  },

  async signUpWithEmail(email: string, password: string) {
    return await supabase.auth.signUp({
        email,
        password,
    });
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      name: data.name,
      bio: data.bio,
      avatarColor: data.avatar_color,
      joinedDate: new Date(data.joined_date).getTime(),
      credits: data.credits,
      stripeCustomerId: data.stripe_customer_id,
      subscriptionStatus: data.subscription_status,
      subscriptionTier: data.subscription_tier
    };
  },

  async updateProfile(userId: string, profile: UserProfile) {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: profile.name,
        bio: profile.bio,
        avatar_color: profile.avatarColor,
        joined_date: new Date(profile.joinedDate).toISOString(),
        credits: profile.credits,
        stripe_customer_id: profile.stripeCustomerId,
        subscription_status: profile.subscriptionStatus || 'inactive',
        subscription_tier: profile.subscriptionTier || 'free'
      });

    if (error) throw error;
  },

  // Stories
  async getStories(userId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('owner_id', userId)
      .order('last_modified', { ascending: false });

    if (error) throw error;

    return data.map(s => ({
      id: s.id,
      title: s.title,
      spark: s.spark,
      tone: s.tone,
      format: s.format as any,
      activeChapterIndex: s.active_chapter_index,
      characters: s.characters,
      locations: s.locations,
      toc: s.toc,
      lastModified: new Date(s.last_modified).getTime(),
      coverImage: s.cover_image,
      collection: s.collection,
      isPublic: s.is_public,
      publishedAt: s.published_at ? new Date(s.published_at).getTime() : undefined
    }));
  },

  async saveStory(userId: string, story: Story) {
    const { error } = await supabase
      .from('stories')
      .upsert({
        id: story.id,
        owner_id: userId,
        title: story.title,
        spark: story.spark,
        tone: story.tone,
        format: story.format,
        active_chapter_index: story.activeChapterIndex,
        characters: story.characters,
        locations: story.locations,
        toc: story.toc,
        last_modified: new Date(story.lastModified).toISOString(),
        cover_image: story.coverImage,
        collection: story.collection,
        is_public: story.isPublic || false,
        published_at: story.publishedAt ? new Date(story.publishedAt).toISOString() : null
      });

    if (error) throw error;
  },

  async deleteStory(userId: string, storyId: string) {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('owner_id', userId);

    if (error) throw error;
  },

  async getPublicStories(): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        likes_count:story_likes(count),
        comments_count:story_comments(count),
        rating_avg:story_ratings(rating.avg())
      `)
      .eq('is_public', true)
      .order('published_at', { ascending: false });

    if (error) throw error;

    return data.map(s => ({
      id: s.id,
      title: s.title,
      spark: s.spark,
      tone: s.tone,
      format: s.format as any,
      activeChapterIndex: s.active_chapter_index,
      characters: s.characters,
      locations: s.locations,
      toc: s.toc,
      lastModified: new Date(s.last_modified).getTime(),
      coverImage: s.cover_image,
      collection: s.collection,
      isPublic: s.is_public,
      publishedAt: s.published_at ? new Date(s.published_at).getTime() : undefined,
      likesCount: s.likes_count?.[0]?.count || 0,
      commentsCount: s.comments_count?.[0]?.count || 0,
      ratingAverage: s.rating_avg?.[0]?.avg || 0
    }));
  },

  async likeStory(userId: string, storyId: string) {
    const { error } = await supabase
      .from('story_likes')
      .upsert({ user_id: userId, story_id: storyId });
    if (error) throw error;
  },

  async rateStory(userId: string, storyId: string, rating: number) {
    const { error } = await supabase
      .from('story_ratings')
      .upsert({ user_id: userId, story_id: storyId, rating });
    if (error) throw error;
  },

  async addComment(userId: string, storyId: string, text: string) {
    const { error } = await supabase
      .from('story_comments')
      .insert({ user_id: userId, story_id: storyId, text });
    if (error) throw error;
  },

  async getComments(storyId: string): Promise<StoryComment[]> {
    const { data, error } = await supabase
      .from('story_comments')
      .select(`
        id,
        story_id,
        user_id,
        text,
        created_at,
        profiles(name)
      `)
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(c => ({
      id: c.id,
      storyId: c.story_id,
      userId: c.user_id,
      userName: (c.profiles as any)?.name || 'Unknown Writer',
      text: c.text,
      createdAt: new Date(c.created_at).getTime()
    }));
  },

  async saveToPersonalLibrary(userId: string, storyId: string) {
    const { error } = await supabase
      .from('library_saves')
      .upsert({
        user_id: userId,
        story_id: storyId,
        saved_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  async getSavedStories(userId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('library_saves')
      .select(`
        story_id,
        stories (*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return data.map((item: any) => {
        const s = item.stories;
        return {
            id: s.id,
            title: s.title,
            spark: s.spark,
            tone: s.tone,
            format: s.format as any,
            activeChapterIndex: s.active_chapter_index,
            characters: s.characters,
            locations: s.locations,
            toc: s.toc,
            lastModified: new Date(s.last_modified).getTime(),
            coverImage: s.cover_image,
            collection: s.collection,
            isPublic: s.is_public,
            publishedAt: s.published_at ? new Date(s.published_at).getTime() : undefined
        };
    });
  },

  // Migration Utility
  async migrateFromLocalStorage(userId: string) {
    // Migrate Profile
    const localProfile = localStorage.getItem('gerertales_profile');
    if (localProfile) {
        try {
            const profile = JSON.parse(localProfile) as UserProfile;
            await this.updateProfile(userId, profile);
            localStorage.removeItem('gerertales_profile');
        } catch (e) {
            console.error("Failed to migrate profile", e);
        }
    }

    // Migrate Stories
    const localStories = localStorage.getItem('gerertales_stories');
    if (localStories) {
        try {
            const stories = JSON.parse(localStories) as Story[];
            for (const story of stories) {
                await this.saveStory(userId, story);
            }
            localStorage.removeItem('gerertales_stories');
        } catch (e) {
            console.error("Failed to migrate stories", e);
        }
    }
  }
};
