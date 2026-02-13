
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AI_COSTS } from "../types";

// Defaults - Hardened to xAI as per request
export const FREE_TEXT_MODEL = 'grok-beta'; 
export const PREMIUM_TEXT_MODEL = 'grok-2-1212'; 
export const DEFAULT_IMAGE_MODEL = 'grok-2-vision-beta';
export const DEFAULT_TTS_MODEL = 'tts-1'; // OpenAI TTS remains for now as xAI lacks native TTS

// Rates (Credits) - Pulled from types for consistency
export const { RATE_INPUT_TOKEN, RATE_OUTPUT_TOKEN, RATE_IMAGE, RATE_TTS_CHAR, RATE_ELEVENLABS_CHAR } = AI_COSTS;

export const calculateCost = (inputTokens: number, outputTokens: number): number => {
    const cost = (inputTokens * RATE_INPUT_TOKEN) + (outputTokens * RATE_OUTPUT_TOKEN);
    return Math.max(0.1, Math.round(cost * 100) / 100);
};

export const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let clean = text.trim();
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  return clean;
};

export const isGeminiModel = (model: string) => model.toLowerCase().includes('gemini') || model.toLowerCase().includes('imagen');
export const isXAIModel = (model: string) => model.toLowerCase().includes('grok');
export const isDalleModel = (model: string) => model.toLowerCase().includes('dall-e');

export const getConfig = (tier: string = 'free') => {
  let settings = { 
    apiKey: '', 
    openAiApiKey: '', 
    xAIApiKey: '',
    elevenLabsApiKey: '',
    textModel: tier === 'free' ? FREE_TEXT_MODEL : PREMIUM_TEXT_MODEL, 
    imageModel: DEFAULT_IMAGE_MODEL,
    imageResolution: '1K',
    ttsModel: DEFAULT_TTS_MODEL,
    elevenLabsVoiceId: 'MF3mGyEYCl7XYWbV9V6O'
  };
  try {
    const saved = localStorage.getItem('gerertales_settings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
  } catch (e) {}

  // Providers - xAI is the priority
  const xAIApiKey = settings.xAIApiKey || import.meta.env.VITE_XAI_API_KEY;
  let xai: OpenAI | null = null;
  if (xAIApiKey) {
      xai = new OpenAI({ 
          apiKey: xAIApiKey, 
          baseURL: "https://api.x.ai/v1",
          dangerouslyAllowBrowser: true 
      });
  }

  // OpenAI (Restricted for now)
  const openAiApiKey = settings.openAiApiKey || import.meta.env.VITE_OPENAI_API_KEY;
  let openai: OpenAI | null = null;
  if (openAiApiKey) {
      openai = new OpenAI({ apiKey: openAiApiKey, dangerouslyAllowBrowser: true });
  }

  // Gemini (Commented out/Restricted as requested)
  /*
  const geminiApiKey = settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  const gemini = new GoogleGenAI({ apiKey: geminiApiKey });
  */
  
  return {
    gemini: null, // gemini disabled
    openai,
    xai,
    xAIApiKey,
    elevenLabsApiKey: settings.elevenLabsApiKey || import.meta.env.VITE_ELEVENLABS_API_KEY,
    elevenLabsVoiceId: settings.elevenLabsVoiceId,
    textModel: settings.textModel || (tier === 'free' ? FREE_TEXT_MODEL : PREMIUM_TEXT_MODEL),
    imageModel: settings.imageModel || DEFAULT_IMAGE_MODEL,
    imageResolution: settings.imageResolution || '1K',
    ttsModel: settings.ttsModel || DEFAULT_TTS_MODEL
  };
};
