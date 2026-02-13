
import { create } from 'zustand';
import { Story, UserProfile, Message, StoryConfig, StoryBlueprintData } from '../types';
import { supabaseService } from './supabaseService';
import * as TextService from './textService';
import * as ImageService from './imageService';
import { User } from '@supabase/supabase-js';

interface StoryState {
  stories: Story[];
  userProfile: UserProfile | null;
  activeStoryId: string | null;
  messages: Message[];
  isAiProcessing: boolean;
  
  // Actions
  setStories: (stories: Story[]) => void;
  setUserProfile: (profile: UserProfile) => void;
  setActiveStoryId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  setIsAiProcessing: (status: boolean) => void;
  
  // Async Thunks
  loadUserContent: (user: User) => Promise<void>;
  createStory: (user: User | null, config: StoryConfig, blueprint: StoryBlueprintData) => Promise<void>;
  updateStoryContent: (user: User | null, storyId: string, chapterIndex: number, content: string) => Promise<void>;
  deductCredits: (user: User | null, amount: number, feature: string) => Promise<boolean>;
}

export const useStore = create<StoryState>((set, get) => ({
  stories: [],
  userProfile: null,
  activeStoryId: null,
  messages: [],
  isAiProcessing: false,

  setStories: (stories) => set({ stories }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setActiveStoryId: (activeStoryId) => set({ activeStoryId }),
  setMessages: (messages) => set({ messages }),
  setIsAiProcessing: (isAiProcessing) => set({ isAiProcessing }),

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

  createStory: async (user, config, blueprint) => {
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

    set(state => ({ stories: [newStory, ...state.stories], activeStoryId: newStoryId }));
    
    if (user) await supabaseService.saveStory(user.id, newStory);
    
    // Background cover gen
    const userTier = get().userProfile?.subscriptionTier || 'free';
    const { url, cost } = await ImageService.generateCoverImage(config.title, config.tone, config.spark, userTier);
    
    if (url) {
        let finalUrl = url;
        if (user) {
            finalUrl = await supabaseService.uploadImage(user.id, url, 'cover.png');
        }
        const updatedStory = { ...newStory, coverImage: finalUrl };
        set(state => ({
            stories: state.stories.map(s => s.id === newStoryId ? updatedStory : s)
        }));
        if (user) await supabaseService.saveStory(user.id, updatedStory);
        await get().deductCredits(user, cost, "Cover Image");
    }
    
    set({ isAiProcessing: false });
  },

  updateStoryContent: async (user, storyId, chapterIndex, content) => {
    const { stories } = get();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const updatedChapters = [...story.toc];
    updatedChapters[chapterIndex].content = content;
    const updatedStory = { ...story, toc: updatedChapters, lastModified: Date.now() };

    set(state => ({
      stories: state.stories.map(s => s.id === storyId ? updatedStory : s)
    }));

    if (user) await supabaseService.saveStory(user.id, updatedStory);
  }
}));
