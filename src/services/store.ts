
import { create } from 'zustand';
import { Story, UserProfile, Message, StoryConfig, StoryBlueprintData, Notification } from '../types';
import { supabaseService } from './supabaseService';
import { supabase } from './supabaseClient';
import * as TextService from './textService';
import * as ImageService from './imageService';
import { User } from '@supabase/supabase-js';

interface StoryState {
  stories: Story[];
  userProfile: UserProfile | null;
  activeStoryId: string | null;
  messages: Message[];
  isAiProcessing: boolean;
  notifications: Notification[];
  unreadNotificationsCount: number;

  // Actions
  setStories: (stories: Story[]) => void;
  setUserProfile: (profile: UserProfile) => void;
  setActiveStoryId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  setIsAiProcessing: (status: boolean) => void;
  setNotifications: (notifications: Notification[]) => void;

  // Async Thunks
  loadUserContent: (user: User) => Promise<void>;
  createStory: (user: User | null, config: StoryConfig, blueprint: StoryBlueprintData) => Promise<string>;
  updateStoryContent: (user: User | null, storyId: string, chapterIndex: number, content: string) => Promise<void>;
  updateStoryMessages: (user: User | null, storyId: string, messages: Message[]) => Promise<void>;
  deductCredits: (user: User | null, amount: number, feature: string) => Promise<boolean>;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useStore = create<StoryState>((set, get) => ({
  stories: [],
  userProfile: null,
  activeStoryId: null,
  messages: [],
  isAiProcessing: false,
  notifications: [],
  unreadNotificationsCount: 0,

  setStories: (stories) => set({ stories }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setActiveStoryId: (activeStoryId) => set({ activeStoryId }),
  setMessages: (messages) => set({ messages }),
  setIsAiProcessing: (isAiProcessing) => set({ isAiProcessing }),
  setNotifications: (notifications) => set({ 
    notifications, 
    unreadNotificationsCount: notifications.filter(n => !n.isRead).length 
  }),

  setActiveStoryId: (id) => {
    const { stories } = get();
    const story = stories.find(s => s.id === id);
    set({ 
      activeStoryId: id,
      messages: story?.messages || [] 
    });
  },

  loadUserContent: async (user) => {
    try {
      let profile = await supabaseService.getProfile(user.id);
      
      // Sync Google metadata if needed
      if (profile) {
        const metadata = user.user_metadata;
        if (metadata && (!profile.avatarUrl || profile.name === 'Guest Writer')) {
          const updates: Partial<UserProfile> = {};
          if (metadata.full_name && profile.name === 'Guest Writer') updates.name = metadata.full_name;
          if (metadata.avatar_url && !profile.avatarUrl) updates.avatarUrl = metadata.avatar_url;
          if (Object.keys(updates).length > 0) {
            await supabaseService.updateProfile(user.id, updates);
            profile = { ...profile, ...updates };
          }
        }
      } else {
        const metadata = user.user_metadata;
        profile = {
          name: metadata?.full_name || "Guest Writer",
          bio: "A traveler in the realm of imagination.",
          avatarColor: "#60A5FA",
          avatarUrl: metadata?.avatar_url,
          joinedDate: Date.now(),
          credits: 50,
          subscriptionTier: 'free'
        };
        await supabaseService.updateProfile(user.id, profile);
      }

      // Migrate guest data
      await supabaseService.migrateFromLocalStorage(user.id);
      
      // Fetch BOTH owned stories and stories saved from the public library
      const ownedStories = await supabaseService.getStories(user.id);
      const savedStories = await supabaseService.getSavedStories(user.id);
      
      // Merge owned + saved with owned taking precedence
      const storyMap = new Map<string, Story>();
      ownedStories.forEach(story => storyMap.set(story.id, story));
      savedStories.forEach(story => {
        if (!storyMap.has(story.id)) storyMap.set(story.id, story);
      });
      const allStories = Array.from(storyMap.values()).sort(
        (a, b) => (b.lastModified || 0) - (a.lastModified || 0)
      );

      // Fetch Global Config
      const globalConfig = await supabaseService.getSystemConfig();
      if (globalConfig) {
        const saved = localStorage.getItem('gerertales_settings');
        const current = saved ? JSON.parse(saved) : {};
        localStorage.setItem('gerertales_settings', JSON.stringify({ ...globalConfig, ...current }));
      }

      // Sync active story + messages if currently in writing view
      const pathParts = window.location.pathname.split('/');
      let activeStoryId: string | null = get().activeStoryId;
      let activeMessages: Message[] = get().messages;
      if (pathParts[1] === 'writing' && pathParts[2]) {
        const currentStory = allStories.find(s => s.id === pathParts[2]);
        if (currentStory) {
          activeStoryId = currentStory.id;
          activeMessages = currentStory.messages || [];
        }
      }

      set({ userProfile: profile, stories: allStories, activeStoryId, messages: activeMessages });
      
      // Real-time listener for notifications
      supabaseService.subscribeToNotifications(user.id, (newNotif) => {
        set((state) => {
          if (state.notifications.find(n => n.id === newNotif.id)) return state;
          const updated = [newNotif, ...state.notifications];
          return {
            notifications: updated,
            unreadNotificationsCount: updated.filter(n => !n.isRead).length
          };
        });
      });

      await get().fetchNotifications(user.id);
    } catch (e) {
      console.error("Store sync failed", e);
    }
  },

  fetchNotifications: async (userId) => {
    try {
      const notifications = await supabaseService.getNotifications(userId);
      set({ 
        notifications, 
        unreadNotificationsCount: notifications.filter(n => !n.isRead).length 
      });
    } catch (e) { console.error("Notification fetch failed", e); }
  },

  markAsRead: async (notificationId) => {
    await supabaseService.markNotificationAsRead(notificationId);
    const updated = get().notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    set({ 
      notifications: updated, 
      unreadNotificationsCount: updated.filter(n => !n.isRead).length 
    });
  },

  markAllAsRead: async (userId: string) => {
    await supabaseService.markAllNotificationsAsRead(userId);
    const updated = get().notifications.map(n => ({ ...n, isRead: true }));
    set({
      notifications: updated,
      unreadNotificationsCount: 0
    });
  },

  deductCredits: async (user, amount, feature) => {
    const { userProfile } = get();
    if (!userProfile) return false;

    if (user) {
      try {
        // Ensure session is fresh
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const result = await supabaseService.deductCreditsSecurely(amount, feature);
        if (result.success && result.newBalance !== undefined) {
          set({ userProfile: { ...userProfile, credits: result.newBalance } });
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    } else {
      const newBalance = Math.max(0, parseFloat((userProfile.credits - amount).toFixed(2)));
      const updated = { ...userProfile, credits: newBalance };
      set({ userProfile: updated });
      localStorage.setItem('gerertales_profile', JSON.stringify(updated));
      return true;
    }
  },

  createStory: async (user: User | null, config: StoryConfig, blueprint: StoryBlueprintData): Promise<string> => {
    set({ isAiProcessing: true });
    const newStoryId = crypto.randomUUID();
    const newStory: Story = {
      id: newStoryId,
      ownerId: user?.id,
      title: config.title,
      spark: config.spark,
      tone: config.tone,
      format: config.format,
      activeChapterIndex: 0,
      characters: blueprint.characters,
      locations: blueprint.locations,
      toc: blueprint.toc,
      lastModified: Date.now()
    };

    // Update UI state immediately
    const updatedStories = [newStory, ...get().stories];
    set({ stories: updatedStories, activeStoryId: newStoryId });

    // CRITICAL FIX: Save to localStorage for guest users
    if (!user) {
      localStorage.setItem('gerertales_stories', JSON.stringify(updatedStories));
    }

    // Non-blocking save and cover gen
    (async () => {
      try {
        if (user) await supabaseService.saveStory(user.id, newStory);

        const userTier = get().userProfile?.subscriptionTier || 'free';
        const { url, cost } = await ImageService.generateCoverImage(config.title, config.tone, config.spark, userTier);

        if (url) {
          let finalUrl = url;
          if (user) {
            const uploaded = await supabaseService.uploadImage(user.id, url, 'cover.png');
            if (uploaded) finalUrl = uploaded;
          }
          const updatedStory = { ...newStory, coverImage: finalUrl };
          const storiesWithCover = get().stories.map(s => s.id === newStoryId ? updatedStory : s);
          set({ stories: storiesWithCover });

          // CRITICAL FIX: Save to localStorage for guest users
          if (!user) {
            localStorage.setItem('gerertales_stories', JSON.stringify(storiesWithCover));
          }

          if (user) await supabaseService.saveStory(user.id, updatedStory);
          await get().deductCredits(user, cost, "Cover Image");
        }
      } catch (e) {
        console.error("Background story init failed:", e);
      }
    })();

    set({ isAiProcessing: false });
    return newStoryId;
  },

  updateStoryContent: async (user, storyId, chapterIndex, content) => {
    const { stories } = get();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const updatedChapters = [...story.toc];
    updatedChapters[chapterIndex].content = content;
    const updatedStory = { ...story, toc: updatedChapters, lastModified: Date.now() };

    const updatedStories = stories.map(s => s.id === storyId ? updatedStory : s);
    set({ stories: updatedStories });

    // CRITICAL FIX: Save to localStorage for guest users
    if (!user) {
      localStorage.setItem('gerertales_stories', JSON.stringify(updatedStories));
    }

    if (user) await supabaseService.saveStory(user.id, updatedStory);
  },

  updateStoryMessages: async (user, storyId, messages) => {
    const { stories } = get();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const updatedStory = { ...story, messages, lastModified: Date.now() };
    const updatedStories = stories.map(s => s.id === storyId ? updatedStory : s);
    
    set({ stories: updatedStories, messages });

    if (!user) {
      localStorage.setItem('gerertales_stories', JSON.stringify(updatedStories));
    }

    if (user) await supabaseService.saveStory(user.id, updatedStory);
  }
}));
