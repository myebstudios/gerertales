
export type StoryFormat = 'Novel' | 'Short Story' | 'Screenplay' | 'Comic Script' | 'Webtoon' | 'Children\'s Book' | 'Educational Story';

export interface Character {
  name: string;
  role: string;
  trait: string;
  description?: string;
}

export interface Location {
  name: string;
  description: string;
}

export interface Chapter {
  chapter: number;
  title: string;
  content: string;
  summary?: string;
  isCompleted: boolean;
  bannerImage?: string; // Base64 string for the chapter banner
}

export interface Story {
  id: string;
  ownerId?: string;
  ownerName?: string;
  title: string;
  spark: string;
  tone: string;
  format: StoryFormat;
  activeChapterIndex: number;
  characters: Character[];
  locations: Location[];
  toc: Chapter[];
  lastModified: number;
  coverImage?: string; // Base64 string for the cover
  collection?: string; // Optional collection name
  isPublic?: boolean;
  publishedAt?: number;
  likesCount?: number;
  ratingAverage?: number;
  commentsCount?: number;
}

export interface StoryComment {
  id: string;
  storyId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}


export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface UserProfile {
  id?: string;
  name: string;
  bio: string;
  avatarColor: string;
  avatarUrl?: string;
  joinedDate: number;
  credits: number;
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'past_due' | 'canceled';
  subscriptionTier?: 'free' | 'pro' | 'studio';
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  role?: string;
}

export const AI_COSTS = {
  ANALYSIS: 5,
  BLUEPRINT: 15,
  WRITING_PROSE: 3,
  WRITING_CHAT: 1,
  IMAGE_COVER: 25,
  IMAGE_BANNER: 20,
  TTS_CHUNK: 5,
  RATE_INPUT_TOKEN: 0.001,
  RATE_OUTPUT_TOKEN: 0.004,
  RATE_IMAGE: 20,
  RATE_TTS_CHAR: 0.01,
  RATE_ELEVENLABS_CHAR: 0.05
};

export type Theme = 'nordic-dark' | 'midnight' | 'paper-light';
export type TTSProvider = 'ai' | 'browser';

export const XAI_MODELS = {
  TEXT: ['grok-2-1212', 'grok-beta', 'grok-3', 'grok-4-1-fast-reasoning'],
  IMAGE: ['grok-imagine-image-pro', 'grok-2-vision-beta']
};

export interface AppSettings {
  apiKey: string; // Gemini
  openAiApiKey?: string;
  xAIApiKey?: string;
  elevenLabsApiKey?: string;
  textModel: string;
  imageModel: string;
  imageResolution: 'Low' | '1K' | '2K' | '4K';
  ttsModel: string;
  elevenLabsVoiceId?: string;
  ttsProvider: TTSProvider;
  theme: Theme;
}

export enum AppState {
  LIBRARY = 'LIBRARY',
  ONBOARDING = 'ONBOARDING',
  ARCHITECTING = 'ARCHITECTING', // The loading state while generating TOC
  WRITING = 'WRITING',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
}

export interface StoryConfig {
  spark: string;
  title: string;
  tone: string;
  format: StoryFormat;
  chapterCount: number;
}

export interface StoryBlueprintData {
  characters: Character[];
  locations: Location[];
  toc: Chapter[];
}

