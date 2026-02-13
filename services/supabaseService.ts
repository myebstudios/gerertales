
import { supabase } from './supabaseClient';
import { Story, UserProfile, Message, StoryComment } from '../types';

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
      id: data.id,
      name: data.name,
      bio: data.bio,
      avatarColor: data.avatar_color,
      avatarUrl: data.avatar_url,
      joinedDate: new Date(data.joined_date).getTime(),
      credits: data.credits,
      stripeCustomerId: data.stripe_customer_id,
      subscriptionStatus: data.subscription_status,
      subscriptionTier: data.subscription_tier,
      isAdmin: data.is_admin,
      isSuperAdmin: data.is_super_admin,
      role: data.role
    };
  },

  async updateProfile(userId: string, profile: Partial<UserProfile>) {
    // Only update fields provided
    const updateData: any = { id: userId };
    if (profile.name !== undefined) updateData.name = profile.name;
    if (profile.bio !== undefined) updateData.bio = profile.bio;
    if (profile.avatarColor !== undefined) updateData.avatar_color = profile.avatarColor;
    if (profile.avatarUrl !== undefined) updateData.avatar_url = profile.avatarUrl;
    if (profile.joinedDate !== undefined) updateData.joined_date = new Date(profile.joinedDate).toISOString();
    if (profile.credits !== undefined) updateData.credits = profile.credits;
    if (profile.stripeCustomerId !== undefined) updateData.stripe_customer_id = profile.stripeCustomerId;
    if (profile.subscriptionStatus !== undefined) updateData.subscription_status = profile.subscriptionStatus;
    if (profile.subscriptionTier !== undefined) updateData.subscription_tier = profile.subscriptionTier;
    
    // Safety check: is_admin and is_super_admin should ideally not be updated via this common method 
    // from a regular user's session, but for now we keep the logic if it's explicitly passed.
    if (profile.isAdmin !== undefined) updateData.is_admin = profile.isAdmin;
    if (profile.isSuperAdmin !== undefined) updateData.is_super_admin = profile.isSuperAdmin;
    if (profile.role !== undefined) updateData.role = profile.role;

    const { error } = await supabase
      .from('profiles')
      .upsert(updateData);

    if (error) throw error;
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('joined_date', { ascending: false });

    if (error) throw error;

    return data.map(d => ({
      id: d.id,
      name: d.name,
      bio: d.bio,
      avatarColor: d.avatar_color,
      avatarUrl: d.avatar_url,
      joinedDate: new Date(d.joined_date).getTime(),
      credits: d.credits,
      stripeCustomerId: d.stripe_customer_id,
      subscriptionStatus: d.subscription_status,
      subscriptionTier: d.subscription_tier,
      isAdmin: d.is_admin,
      isSuperAdmin: d.is_super_admin,
      role: d.role
    }));
  },

  async logAudit(userId: string | undefined, type: string, message: string, metadata: any = {}) {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
            user_id: userId,
            type,
            message,
            metadata
        });
      if (error) console.error("Audit log failed:", error);
  },

  async getAuditLogs(): Promise<any[]> {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); // Increased limit for better visibility
      if (error) throw error;
      return data;
  },

  // System Config
  async getSystemConfig(): Promise<any> {
    const { data, error } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 'global_settings')
      .single();
    
    if (error) {
      console.error("Error fetching system config:", error);
      return null;
    }
    return data.config;
  },

  async updateSystemConfig(config: any) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('system_config')
      .upsert({
        id: 'global_settings',
        config: config,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      });
    
    if (error) throw error;
  },

  async deductCreditsSecurely(amount: number, feature: string): Promise<{ success: boolean, newBalance?: number, error?: string }> {
      const { data, error } = await supabase.functions.invoke('deduct-credits', {
          body: { amount, feature }
      });
      if (error) return { success: false, error: error.message };
      return data;
  },

  // Stories
  async getStories(userId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('owner_id', userId)
      .order('last_modified', { ascending: false });

    if (error) throw error;

    return data.map(s => this._mapStory(s));
  },

  async saveStory(userId: string, story: Story) {
    if (!userId) throw new Error("User ID is required to save a story.");
    
    const storyData = {
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
    };

    console.log("Saving story to Supabase:", storyData.id);

    const { error } = await supabase
      .from('stories')
      .upsert(storyData);

    if (error) {
        console.error("Supabase Save Error:", error);
        throw error;
    }
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
    console.log("Fetching public stories...");
    try {
        const { data, error } = await supabase
          .from('stories')
          .select(`
            id, owner_id, title, spark, tone, format, active_chapter_index, 
            characters, locations, toc, last_modified, cover_image, 
            collection, is_public, published_at
          `)
          .eq('is_public', true)
          .order('published_at', { ascending: false })
          .limit(20);

        if (error) {
            console.error("Supabase query error:", error);
            throw error;
        }
        
        return data.map(s => this._mapStory(s));
    } catch (e) {
        console.error("Public fetch failed:", e);
        return [];
    }
  },

  async getStoryById(storyId: string): Promise<Story | null> {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        story_likes(count),
        story_comments(count),
        story_ratings(rating),
        profiles(name)
      `)
      .eq('id', storyId)
      .single();

    if (error) return null;

    const mapped = this._mapStory(data);
    const ratings = data.story_ratings || [];
    const avg = ratings.length > 0 
      ? ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / ratings.length 
      : 0;

    return {
      ...mapped,
      likesCount: data.story_likes?.[0]?.count || 0,
      commentsCount: data.story_comments?.[0]?.count || 0,
      ratingAverage: avg
    };
  },

  _mapStory(s: any): Story {
    return {
      id: s.id,
      ownerId: s.owner_id,
      ownerName: s.profiles?.name,
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
  },

  async likeStory(userId: string, storyId: string) {
    const { error } = await supabase
      .from('story_likes')
      .upsert({ user_id: userId, story_id: storyId });
    if (error) throw error;
  },

  async hasUserLiked(userId: string, storyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('story_likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .maybeSingle();
    
    if (error) return false;
    return !!data;
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

    return data.map((item: any) => this._mapStory(item.stories));
  },

  // Image Management
  async uploadImage(userId: string, base64Data: string, fileName: string): Promise<string> {
    if (!base64Data) throw new Error("No image data provided for upload.");

    let blob: Blob;

    if (base64Data.startsWith('http')) {
        try {
            const response = await fetch(base64Data);
            if (!response.ok) throw new Error(`Failed to fetch image from URL: ${response.status}`);
            blob = await response.blob();
        } catch (e) {
            // Fallback for CORS: if it's a URL we can't fetch, just return it
            console.warn("CORS fetch failed for upload, returning original URL", e);
            return base64Data;
        }
    } else {
        const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const cleaned = base64Content.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
        
        try {
            const byteCharacters = atob(cleaned);
            const byteNumbers = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([byteNumbers], { type: 'image/png' });
        } catch (e) {
            console.error("atob failure. Data length:", cleaned.length, "Preview:", cleaned.slice(0, 50));
            throw e;
        }
    }

    const filePath = `${userId}/${Date.now()}_${fileName}`;
    const { data, error } = await supabase.storage
      .from('story-assets')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('story-assets')
      .getPublicUrl(filePath);

    return publicUrl;
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
