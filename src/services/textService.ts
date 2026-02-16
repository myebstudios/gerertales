
import OpenAI from "openai";
import { Chapter, Character, Location, StoryFormat } from "../types";
import { getConfig, calculateCost, cleanJson } from "./aiUtils";

// xAI Internal Model Mapping
const XAI_MODEL_MAPPING: Record<string, string> = {
  'grok-4.1-fast-reasoning': 'grok-4.1-fast-reasoning',
  'grok-3': 'grok-3',
  'grok-2-1212': 'grok-3', // Fallback
  'grok-beta': 'grok-3-mini' // Fallback
};

const getModelId = (model: string) => XAI_MODEL_MAPPING[model] || model;

const callLocalLlama = async (prompt: string): Promise<{ content: string, cost: number }> => {
  try {
    const defaultUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001/api/generate' : 'https://terrorists-eco-filing-repair.trycloudflare.com/api/generate';
    const url = import.meta.env.VITE_GERERLLAMA_URL || defaultUrl;
    const apiKey = import.meta.env.VITE_GERERLLAMA_KEY || 'gererllama_test';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gererllama-key': apiKey,
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
    Task: Analyze this unique story idea ("Spark"): "${spark}"
    
    Determine the MOST APPROPRIATE story format based on the content, length, and style implied by the spark:
    - "Novel": Epic, complex narratives (typically 10-30 chapters)
    - "Short Story": Focused tales (3-7 chapters)
    - "Screenplay": Film/TV scripts (15-120 scenes based on length)
    - "Comic Script": Visual storytelling (varies by length)
    - "Webtoon": Episodic digital comics (varies)
    - "Children's Book": Simple narratives (1-5 chapters/pages)
    - "Educational Story": Teaching-focused (varies by topic)
    
    Analyze the spark and intelligently decide:
    1. What format best suits this story?
    2. How many chapters/scenes would be appropriate for complete storytelling?
    3. What tone captures the essence?
    4. What title would be evocative?
    
    Examples:
    - "A haiku about cherry blossoms" → Short Story with 1 chapter (poets use minimal structure)
    - "Epic space opera trilogy" → Novel with 18-24 chapters
    - "Quick thriller about a heist" → Short Story with 5-7 chapters
    - "Animated series about a robot" → Screenplay with 30-45 scenes
    
    Respond with a JSON object ONLY (don't include example values, analyze the actual spark):
    {
      "title": "[creative title based on spark]",
      "tone": "[multi-layered tone description]",
      "recommendedChapters": [appropriate number based on format and scope],
      "recommendedFormat": "[one of the formats listed above]"
    }
  `;

  if (textModel === 'local-gemma') {
    const { content, cost } = await callLocalLlama(prompt + "\nRespond with valid JSON ONLY.");
    return { data: JSON.parse(cleanJson(content)), cost };
  }

  const systemPrompt = "You are a master literary consultant. Analyze story concepts to determine the most appropriate format, length, and structure. Be intelligent about matching format to content—don't default to 'Novel' for everything. Respond in valid JSON.";
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

    Construct a detailed, unique blueprint. Ensure the narrative arc follows a sophisticated progression.
    
    Include:
    - Dramatis Personae: Complex characters with unique traits.
    - World Atlas: Specific, atmospheric locations that impact the plot.
    - Narrative Arc: Chapter summaries that avoid repetitive structures and focus on evolving tension.

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

  const systemPrompt = `You are a world-class story architect and world-builder. Your specialty is intricate plots and atmospheric settings. Respond in valid JSON.`;
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

  // Format-specific writing instructions
  let formatInstruction = "";
  switch (format) {
    case 'Screenplay':
      formatInstruction = `Write in STANDARD SCREENPLAY FORMAT:
- Scene headings (INT./EXT. LOCATION - TIME)
- Action lines (present tense, visual descriptions)
- Character names (centered, capitalized)
- Dialogue (under character names)
- Parentheticals for actor direction`;
      break;
    case 'Comic Script':
      formatInstruction = `Write in COMIC SCRIPT FORMAT:
- Panel descriptions (visual composition, what's shown)
- Character dialogue in quotation marks
- Sound effects in caps (BOOM, CRASH)
- Caption boxes for narration
- Note panel transitions`;
      break;
    case 'Webtoon':
      formatInstruction = `Write for WEBTOON vertical scroll format:
- Episodic pacing with cliffhangers
- Visual scene descriptions for panels
- Engaging dialogue
- Emotional beats clearly marked`;
      break;
    case "Children's Book":
      formatInstruction = `Write for CHILDREN'S BOOK format:
- Simple, clear language
- Short sentences and paragraphs
- Vivid, sensory descriptions
- Age-appropriate vocabulary
- Include moments for illustration`;
      break;
    case 'Educational Story':
      formatInstruction = `Write EDUCATIONAL NARRATIVE:
- Teach concepts through story
- Include clear explanations
- Engaging characters learning together
- Review key points naturally`;
      break;
    case 'Short Story':
      formatInstruction = `Write LITERARY SHORT STORY prose:
- Rich, evocative descriptions
- Character depth
- Tight, focused narrative
- Every word counts`;
      break;
    case 'Novel':
    default:
      formatInstruction = `Write NOVEL-QUALITY prose:
- Immersive, detailed descriptions
- Deep character development
- Natural dialogue
- World-building through scenes`;
  }

  const prompt = `
    ${context}
    ---
    Instruction: ${instruction}
    ${formatInstruction}
    
    Output ONLY the ${format} content. Match the format precisely.
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
  messages.unshift({ role: "system", content: `You are a co-writer specializing in ${format} writing. Match the format conventions precisely. Be creative and consistent with the established world.` });
  messages.push({ role: "user", content: prompt });

  const response = await xai.chat.completions.create({
    model: getModelId(textModel),
    messages: messages
  });

  const cost = calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
  return { text: response.choices[0].message.content || "", cost };
};
