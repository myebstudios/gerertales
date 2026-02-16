
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

  loadUserContent: async (user) => {
    const profile = await supabaseService.getProfile(user.id);
    const cloudStories = await supabaseService.getStories(user.id);
    // Fetch Global Config
    const globalConfig = await supabaseService.getSystemConfig();
    if (globalConfig) {
      const saved = localStorage.getItem('gerertales_settings');
      const current = saved ? JSON.parse(saved) : {};
      localStorage.setItem('gerertales_settings', JSON.stringify({ ...globalConfig, ...current }));
    }
    set({ userProfile: profile, stories: cloudStories });
    await get().fetchNotifications(user.id);
  },

  fetchNotifications: async (userId) => {
    const notifications = await supabaseService.getNotifications(userId);
    set({ 
      notifications, 
      unreadNotificationsCount: notifications.filter(n => !n.isRead).length 
    });

    // Setup Real-time listener
    supabaseService.subscribeToNotifications(userId, (newNotif) => {
      const current = get().notifications;
      if (!current.find(n => n.id === newNotif.id)) {
        const updated = [newNotif, ...current];
        set({
          notifications: updated,
          unreadNotificationsCount: updated.filter(n => !n.isRead).length
        });
      }
    });
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
  }
}));
