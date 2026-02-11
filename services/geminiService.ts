
import { GoogleGenAI, Type, Modality } from "@google/genai";
import OpenAI from "openai";
import { Chapter, Character, Location, StoryFormat } from "../types";

// Defaults
const FREE_TEXT_MODEL = 'local-gemma';
const PREMIUM_TEXT_MODEL = 'local-gemma';
const DEFAULT_IMAGE_MODEL = 'imagen-3';
const DEFAULT_TTS_MODEL = 'tts-1';

// Rates (Credits)
const RATE_INPUT_TOKEN = 0.001;  
const RATE_OUTPUT_TOKEN = 0.004; 
const RATE_IMAGE = 20;           
const RATE_TTS_CHAR = 0.01;      
const RATE_ELEVENLABS_CHAR = 0.05; 

// Helper to check model type
const isGeminiModel = (model: string) => model.toLowerCase().includes('gemini') || model.toLowerCase().includes('imagen');
const isXAIModel = (model: string) => model.toLowerCase().includes('grok');

// -- Local Engine (GérerLlama) Bridge --
const callLocalLlama = async (prompt: string): Promise<{ content: string, cost: number }> => {
    try {
        const url = window.location.hostname === 'localhost' ? 'http://localhost:3001/api/generate' : 'https://gererllama-studio.loca.lt/api/generate';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-gererllama-key': 'gererllama_test',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({ prompt, stream: false })
        });
        
        if (!response.ok) throw new Error("Local Engine Offline");
        
        const data = await response.json();
        // Since it's local, we don't charge credits or we charge a flat minimal fee
        return { content: data.text || data.response || "", cost: 0.1 };
    } catch (e) {
        console.error("Local Llama Failure:", e);
        throw new Error("Local Engine Room is dark. Is GérerLlama running?");
    }
};

// Helper to get configured AI instances and models
const getConfig = (tier: string = 'free') => {
  let settings = { 
    apiKey: '', 
    openAiApiKey: '', 
    xAIApiKey: '',
    elevenLabsApiKey: '',
    textModel: tier === 'free' ? FREE_TEXT_MODEL : PREMIUM_TEXT_MODEL, 
    imageModel: DEFAULT_IMAGE_MODEL,
    imageResolution: '1K',
    ttsModel: DEFAULT_TTS_MODEL,
    elevenLabsVoiceId: 'cgSgSjJ47ptB6SHCPjD2'
  };
  try {
    const saved = localStorage.getItem('gerertales_settings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
  } catch (e) {}

  // Sanitize model names to ensure compatibility
  if (settings.textModel?.includes('gemini-3')) settings.textModel = FREE_TEXT_MODEL;

  // Gemini Setup
  const geminiApiKey = settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  const gemini = new GoogleGenAI({ apiKey: geminiApiKey });
  
  // OpenAI Setup
  const openAiApiKey = settings.openAiApiKey || import.meta.env.VITE_OPENAI_API_KEY;
  let openai: OpenAI | null = null;
  if (openAiApiKey) {
      openai = new OpenAI({ apiKey: openAiApiKey, dangerouslyAllowBrowser: true });
  }

  // x.ai Setup
  const xAIApiKey = settings.xAIApiKey || import.meta.env.VITE_XAI_API_KEY;
  let xai: OpenAI | null = null;
  if (xAIApiKey) {
      xai = new OpenAI({ 
          apiKey: xAIApiKey, 
          baseURL: "https://api.x.ai/v1",
          dangerouslyAllowBrowser: true 
      });
  }
  
  return {
    gemini,
    openai,
    xai,
    elevenLabsApiKey: settings.elevenLabsApiKey || import.meta.env.VITE_ELEVENLABS_API_KEY,
    elevenLabsVoiceId: settings.elevenLabsVoiceId,
    textModel: settings.textModel || (tier === 'free' ? FREE_TEXT_MODEL : PREMIUM_TEXT_MODEL),
    imageModel: settings.imageModel || DEFAULT_IMAGE_MODEL,
    imageResolution: settings.imageResolution || '1K',
    ttsModel: settings.ttsModel || DEFAULT_TTS_MODEL
  };
};

const calculateCost = (inputTokens: number, outputTokens: number): number => {
    const cost = (inputTokens * RATE_INPUT_TOKEN) + (outputTokens * RATE_OUTPUT_TOKEN);
    // Return at least 0.1 credit if usage occurred, rounded to 2 decimals
    return Math.max(0.1, Math.round(cost * 100) / 100);
};

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let clean = text.trim();
  // Remove markdown code blocks
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  return clean;
};

// -- Client-side Image Compression --
const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Target 512px max dimension
            const scale = 512 / Math.max(img.width, img.height);
            // Only scale down, never up
            const finalScale = scale < 1 ? scale : 1;
            
            canvas.width = img.width * finalScale;
            canvas.height = img.height * finalScale;
            
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Use JPEG 0.8 for storage efficiency
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

// -- OpenAI Helpers --

const callAIText = async (openai: OpenAI | null, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<{ content: string, cost: number }> => {
    if (!openai) throw new Error("AI provider not configured.");
    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        response_format: jsonMode ? { type: "json_object" } : undefined
    });
    
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = calculateCost(inputTokens, outputTokens);
    
    return { 
        content: response.choices[0].message.content || "",
        cost
    };
};

// -- Safety & Utilities --

const createSafeImagePrompt = async (originalContext: string, type: 'COVER' | 'SCENE', tone: string, tier: string = 'free'): Promise<string> => {
    const { gemini, openai, xai, textModel } = getConfig(tier);
    const instructions = `
        You are an art director. I need a visual description for an AI image generator.
        Context: "${originalContext}"
        Tone: ${tone}
        Type: ${type}
        Output ONLY the visual prompt description.
    `;

    try {
        if (isGeminiModel(textModel)) {
            const response = await gemini.models.generateContent({
                model: textModel,
                contents: [{ role: 'user', parts: [{ text: instructions }] }]
            });
            return response.text || "Atmospheric abstract art";
        } else {
            const provider = isXAIModel(textModel) ? xai : openai;
            const res = await callAIText(provider, textModel, "You are a helpful art director.", instructions);
            return res.content;
        }
    } catch (e) {
        return `Atmospheric ${tone} art, abstract style`;
    }
};

const chunkText = (text: string, maxLength: number = 4000): string[] => {
    if (text.length <= maxLength) return [text];
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};


/**
 * Step 1: Analyze the spark and suggest settings.
 */
export const analyzeStoryConcept = async (spark: string, tier: string = 'free'): Promise<{ data: { title: string; tone: string; recommendedChapters: number; recommendedFormat: StoryFormat }, cost: number }> => {
  const { gemini, openai, xai, textModel } = getConfig(tier);
  
  const prompt = `
    Analyze this story idea ("Spark"): "${spark}".
    Respond with a JSON object containing the following keys:
    {
      "title": "A compelling Title",
      "tone": "A distinct Tone",
      "recommendedChapters": 5,
      "recommendedFormat": "Novel"
    }
  `;

  if (textModel === 'local-gemma') {
    const { content, cost } = await callLocalLlama(prompt + "\nRespond with valid JSON ONLY.");
    return { data: JSON.parse(cleanJson(content)), cost };
  }

  if (!isGeminiModel(textModel)) {
     const provider = isXAIModel(textModel) ? xai : openai;
     const systemPrompt = "You are a creative writing assistant. Respond in valid JSON.";
     const { content, cost } = await callAIText(provider, textModel, systemPrompt, prompt, true);
     return { data: JSON.parse(cleanJson(content)), cost };
  }

  // Gemini
  const response = await gemini.models.generateContent({
    model: textModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json"
    }
  });

  const cost = calculateCost(
      response.usageMetadata?.promptTokenCount || 0,
      response.usageMetadata?.candidatesTokenCount || 0
  );

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  let data;
  try {
      data = JSON.parse(cleanJson(text));
  } catch (e) {
      console.error("Failed to parse analysis JSON:", text);
      throw e;
  }

  return { data, cost };
};

/**
 * Step 2: Generate the initial story structure based on CONFIRMED settings.
 */
export const generateStoryArchitecture = async (
  spark: string, 
  title: string, 
  format: StoryFormat,
  chapterCount: number,
  tier: string = 'free'
): Promise<{ data: { characters: Character[]; locations: Location[]; toc: Chapter[] }, cost: number }> => {
  const { gemini, openai, xai, textModel } = getConfig(tier);

  const prompt = `
    Story Idea: "${spark}"
    Title: "${title}"
    Format: ${format}
    Target Length: ${chapterCount} Chapters/Scenes.

    Create the blueprint in JSON format:
    {
      "characters": [{ "name": "...", "role": "...", "trait": "...", "description": "..." }],
      "locations": [{ "name": "...", "description": "..." }],
      "toc": [{ "chapter": 1, "title": "...", "summary": "..." }]
    }
  `;

  if (textModel === 'local-gemma') {
    const { content, cost } = await callLocalLlama(prompt + "\nRespond with valid JSON ONLY.");
    const data = JSON.parse(cleanJson(content));
    const chapters: Chapter[] = data.toc.map((c: any) => ({ ...c, content: "", isCompleted: false }));
    return { data: { characters: data.characters, locations: data.locations || [], toc: chapters }, cost };
  }

  if (!isGeminiModel(textModel)) {
     const provider = isXAIModel(textModel) ? xai : openai;
     const systemPrompt = `You are a story architect. Respond in valid JSON.`;
     const { content, cost } = await callAIText(provider, textModel, systemPrompt, prompt, true);
     const data = JSON.parse(cleanJson(content));
     const chapters: Chapter[] = data.toc.map((c: any) => ({ ...c, content: "", isCompleted: false }));
     return { data: { characters: data.characters, locations: data.locations || [], toc: chapters }, cost };
  }

  // Gemini
  const response = await gemini.models.generateContent({
    model: textModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json"
    }
  });

  const cost = calculateCost(
      response.usageMetadata?.promptTokenCount || 0,
      response.usageMetadata?.candidatesTokenCount || 0
  );

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  let data;
  try {
      data = JSON.parse(cleanJson(text));
  } catch (e) {
      console.error("Failed to parse blueprint JSON:", text);
      throw e;
  }
  
  const chapters: Chapter[] = data.toc.map((c: any) => ({ ...c, content: "", isCompleted: false }));

  return { data: { characters: data.characters, locations: data.locations || [], toc: chapters }, cost };
};

/**
 * Step 3: Generate a cover image for the story.
 */
export const generateCoverImage = async (title: string, tone: string, spark: string, tier: string = 'free'): Promise<{ url: string | undefined, cost: number }> => {
  const { gemini, openai, imageModel, imageResolution } = getConfig(tier);
  const safeVisualDescription = await createSafeImagePrompt(`${spark} (Title: ${title})`, 'COVER', tone, tier);

  try {
    let url: string | undefined;

    if (imageModel.startsWith('dall-e') && openai) {
        const response = await openai.images.generate({
            model: imageModel,
            prompt: safeVisualDescription,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        });
        const b64 = response.data[0].b64_json;
        url = b64 ? `data:image/png;base64,${b64}` : undefined;
    } else {
        const config: any = { imageConfig: { aspectRatio: "3:4" } };
        if (imageModel.includes('preview') || imageModel.includes('2.0')) {
            config.imageConfig.imageSize = imageResolution === 'Low' ? '1K' : imageResolution;
        }

        const response = await gemini.models.generateContent({
            model: imageModel,
            contents: [{ role: 'user', parts: [{ text: safeVisualDescription }] }],
            config: config
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }

    if (url && imageResolution === 'Low') {
        url = await compressImage(url);
    }

    return { url, cost: RATE_IMAGE };

  } catch (e) {
    console.error("Failed to generate cover", e);
    return { url: undefined, cost: 0 };
  }
};

/**
 * Step 4: Generate a banner image for a chapter.
 */
export const generateChapterBanner = async (chapterTitle: string, chapterSummary: string, storyTitle: string, tone: string, tier: string = 'free'): Promise<{ url: string | undefined, cost: number }> => {
  const { gemini, openai, imageModel, imageResolution } = getConfig(tier);
  const context = `Story: ${storyTitle}\nChapter: ${chapterTitle}\nSummary: ${chapterSummary}`;
  const safeVisualDescription = await createSafeImagePrompt(context, 'SCENE', tone, tier);

  try {
    let url: string | undefined;

    if (imageModel.startsWith('dall-e') && openai) {
        const response = await openai.images.generate({
            model: imageModel,
            prompt: safeVisualDescription,
            n: 1,
            size: "1024x1024", 
            response_format: "b64_json"
        });
        const b64 = response.data[0].b64_json;
        url = b64 ? `data:image/png;base64,${b64}` : undefined;
    } else {
        const config: any = { imageConfig: { aspectRatio: "16:9" } };
        if (imageModel.includes('preview') || imageModel.includes('2.0')) {
            config.imageConfig.imageSize = imageResolution === 'Low' ? '1K' : imageResolution;
        }

        const response = await gemini.models.generateContent({
            model: imageModel,
            contents: [{ role: 'user', parts: [{ text: safeVisualDescription }] }],
            config: config
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }

    if (url && imageResolution === 'Low') {
        url = await compressImage(url);
    }

    return { url, cost: RATE_IMAGE };

  } catch (e) {
    console.error("Failed to generate banner", e);
    return { url: undefined, cost: 0 };
  }
};

/**
 * Co-writer function: Generates prose based on chat history.
 */
export const generateProse = async (
  history: { role: string; text: string }[],
  currentChapter: Chapter,
  format: StoryFormat,
  instruction: string,
  tier: string = 'free'
): Promise<{ text: string, cost: number }> => {
  const { gemini, openai, xai, textModel } = getConfig(tier);

  const context = `
    Current Chapter: ${currentChapter.title}
    Summary: ${currentChapter.summary}
    Current Draft: ${currentChapter.content}
    Format: ${format}
  `;

  let formatInstruction = "Write standard prose.";
  if (format === 'Screenplay') formatInstruction = "Write in standard Screenplay format.";
  if (format === 'Comic Script') formatInstruction = "Write in Comic Script format.";

  const prompt = `
    ${context}
    ---
    Instruction: ${instruction}
    ${formatInstruction}
    Output ONLY the story content.
  `;

  if (textModel === 'local-gemma') {
    const { content, cost } = await callLocalLlama(prompt);
    return { text: content, cost };
  }

  if (!isGeminiModel(textModel)) {
      const provider = isXAIModel(textModel) ? xai : openai;
      if (!provider) throw new Error("Selected provider is not configured.");
      
      const messages: any[] = history.map(msg => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.text
      }));
      messages.unshift({ role: "system", content: "You are a co-writer." });
      messages.push({ role: "user", content: prompt });

      const response = await provider.chat.completions.create({
          model: textModel,
          messages: messages
      });
      
      const cost = calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
      return { text: response.choices[0].message.content || "", cost };
  }

  // Gemini
  const response = await gemini.models.generateContent({
    model: textModel,
    contents: [
        ...history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
        { role: 'user', parts: [{ text: prompt }] }
    ]
  });

  const cost = calculateCost(
      response.usageMetadata?.promptTokenCount || 0,
      response.usageMetadata?.candidatesTokenCount || 0
  );

  return { text: response.text || "", cost };
};

/**
 * TTS: Generate speech.
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore', tier: string = 'free'): Promise<{ audio: AudioBuffer | null, cost: number }> => {
  const { gemini, openai, ttsModel, elevenLabsApiKey, elevenLabsVoiceId } = getConfig(tier);
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  
  // Use ElevenLabs if configured
  if (elevenLabsApiKey) {
    console.log("Using ElevenLabs TTS...");
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}?output_format=pcm_24000`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) throw new Error(`ElevenLabs error: ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await decodeAudioData(new Uint8Array(arrayBuffer), outputAudioContext, 24000, 1);
        const cost = Math.round((text.length * RATE_ELEVENLABS_CHAR) * 100) / 100;
        return { audio: audioBuffer, cost };
    } catch (e) {
        console.error("ElevenLabs failed, falling back...", e);
    }
  }

  const textChunks = chunkText(text, 3500); 
  const audioBuffers: AudioBuffer[] = [];
  const estimatedCost = Math.round((text.length * RATE_TTS_CHAR) * 100) / 100;

  try {
    for (const chunk of textChunks) {
        let chunkBuffer: AudioBuffer | null = null;

        if (!isGeminiModel(ttsModel) && openai) {
            const openAIVoiceMap: Record<string, string> = { 'Kore': 'alloy', 'Puck': 'echo', 'Charon': 'fable', 'Fenrir': 'onyx', 'Zephyr': 'nova' };
            const response = await openai.audio.speech.create({
                model: ttsModel,
                voice: (openAIVoiceMap[voiceName] || 'alloy') as any,
                input: chunk,
            });
            const arrayBuffer = await response.arrayBuffer();
            chunkBuffer = await outputAudioContext.decodeAudioData(arrayBuffer);

        } else {
            const response = await gemini.models.generateContent({
                model: ttsModel,
                contents: [{ parts: [{ text: chunk }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                chunkBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            }
        }
        if (chunkBuffer) audioBuffers.push(chunkBuffer);
    }

    if (audioBuffers.length === 0) return { audio: null, cost: 0 };
    
    return { 
        audio: audioBuffers.length === 1 ? audioBuffers[0] : mergeAudioBuffers(audioBuffers, outputAudioContext), 
        cost: estimatedCost 
    };

  } catch (error) {
    console.error("TTS Generation Error:", error);
    return { audio: null, cost: 0 };
  }
};


// -- Helper functions for Audio --
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function mergeAudioBuffers(buffers: AudioBuffer[], ctx: AudioContext): AudioBuffer {
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
    const numberOfChannels = buffers[0].numberOfChannels;
    const result = ctx.createBuffer(numberOfChannels, totalLength, buffers[0].sampleRate);
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const resultData = result.getChannelData(channel);
        let offset = 0;
        for (const buffer of buffers) {
            if (channel < buffer.numberOfChannels) {
                resultData.set(buffer.getChannelData(channel), offset);
            }
            offset += buffer.length;
        }
    }
    return result;
}

