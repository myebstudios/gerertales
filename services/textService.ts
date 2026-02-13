
import OpenAI from "openai";
import { Chapter, Character, Location, StoryFormat } from "../types";
import { getConfig, calculateCost, cleanJson } from "./aiUtils";

// xAI Internal Model Mapping
const XAI_MODEL_MAPPING: Record<string, string> = {
    'grok-4.1-fast-reasoning': 'grok-beta', // Fallback to beta if 4.1 isn't available via standard endpoint
    'grok-3': 'grok-beta',
    'grok-2-1212': 'grok-2-1212',
    'grok-beta': 'grok-beta'
};

const getModelId = (model: string) => XAI_MODEL_MAPPING[model] || model;

const callLocalLlama = async (prompt: string): Promise<{ content: string, cost: number }> => {
    try {
        const defaultUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001/api/generate' : 'https://terrorists-eco-filing-repair.trycloudflare.com/api/generate';
        const url = import.meta.env.VITE_GERERLLAMA_URL || defaultUrl;
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
        const content = cleanJson(data.text || data.response || "");
        return { content, cost: 0.1 };
    } catch (e) {
        console.error("Local Llama Failure:", e);
        throw new Error("Local Engine Room is dark. Is GérerLlama running?");
    }
};

const callAIText = async (xai: OpenAI | null, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<{ content: string, cost: number }> => {
    if (!xai) throw new Error("xAI provider not configured.");
    
    // Hardening: Extract exact model name
    const modelId = getModelId(model);

    const response = await xai.chat.completions.create({
        model: modelId,
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

export const analyzeStoryConcept = async (spark: string, tier: string = 'free'): Promise<{ data: { title: string; tone: string; recommendedChapters: number; recommendedFormat: StoryFormat }, cost: number }> => {
  const { xai, textModel } = getConfig(tier);
  
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

  const systemPrompt = "You are a creative writing assistant. Respond in valid JSON.";
  const { content, cost } = await callAIText(xai, textModel, systemPrompt, prompt, true);
  return { data: JSON.parse(cleanJson(content)), cost };
};

export const generateStoryArchitecture = async (
  spark: string, 
  title: string, 
  format: StoryFormat,
  chapterCount: number,
  tier: string = 'free'
): Promise<{ data: { characters: Character[]; locations: Location[]; toc: Chapter[] }, cost: number }> => {
  const { xai, textModel } = getConfig(tier);

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

  const systemPrompt = `You are a story architect. Respond in valid JSON.`;
  const { content, cost } = await callAIText(xai, textModel, systemPrompt, prompt, true);
  const data = JSON.parse(cleanJson(content));
  const chapters: Chapter[] = data.toc.map((c: any) => ({ ...c, content: "", isCompleted: false }));
  return { data: { characters: data.characters, locations: data.locations || [], toc: chapters }, cost };
};

export const generateProse = async (
  history: { role: string; text: string }[],
  currentChapter: Chapter,
  format: StoryFormat,
  instruction: string,
  tier: string = 'free'
): Promise<{ text: string, cost: number }> => {
  const { xai, textModel } = getConfig(tier);

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

  if (!xai) throw new Error("xAI provider not configured.");
  
  const messages: any[] = history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
  }));
  messages.unshift({ role: "system", content: "You are a co-writer. Be creative and consistent with the established world." });
  messages.push({ role: "user", content: prompt });

  const response = await xai.chat.completions.create({
      model: getModelId(textModel),
      messages: messages
  });
  
  const cost = calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
  return { text: response.choices[0].message.content || "", cost };
};
