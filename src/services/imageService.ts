
import { getConfig, RATE_IMAGE } from "./aiUtils";

const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        
        let src = base64;
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        if (isProduction && base64.includes('imgen.x.ai')) {
            src = base64.replace('https://imgen.x.ai', '/x-img');
        }

        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 512 / Math.max(img.width, img.height);
            const finalScale = scale < 1 ? scale : 1;
            canvas.width = img.width * finalScale;
            canvas.height = img.height * finalScale;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

const createSafeImagePrompt = async (originalContext: string, type: 'COVER' | 'SCENE', tone: string, tier: string = 'free'): Promise<string> => {
    const { xai } = getConfig(tier);
    const instructions = `
        You are an art director. I need a visual description for an AI image generator.
        Context: "${originalContext}"
        Tone: ${tone}
        Type: ${type}
        Output ONLY the visual prompt description. No conversational filler.
    `;

    try {
        const res = await xai?.chat.completions.create({
            model: "grok-beta",
            messages: [{ role: "user", content: instructions }]
        });
        return res?.choices[0].message.content || "Atmospheric abstract art";
    } catch (e) {
        return `Atmospheric ${tone} art, abstract style`;
    }
};

export const generateCoverImage = async (title: string, tone: string, spark: string, tier: string = 'free'): Promise<{ url: string | undefined, cost: number }> => {
  let { imageResolution } = getConfig(tier);
  const safeVisualDescription = await createSafeImagePrompt(`${spark} (Title: ${title})`, 'COVER', tone, tier);

  try {
    let url: string | undefined;

    const xAIApiKey = (getConfig(tier) as any).xAIApiKey; 
    const body = {
        model: "grok-imagine-image-pro",
        prompt: safeVisualDescription,
        aspect_ratio: "3:4",
        image_format: "base64"
    };
    
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocal ? "https://api.x.ai/v1" : "/x-api";

    const response = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${xAIApiKey}`
        },
        body: JSON.stringify(body)
    });
    
    if (response.ok) {
        const data = await response.json();
        // Force check for base64 response from xAI
        if (data.image) {
             url = `data:image/png;base64,${data.image}`;
        } else if (data.data?.[0]?.b64_json) {
             url = `data:image/png;base64,${data.data[0].b64_json}`;
        } else if (data.data?.[0]?.url) {
             url = data.data[0].url;
        }
    } else {
        const errText = await response.text();
        console.error("xAI Image API Error:", errText);
    }

    if (url && imageResolution === 'Low') {
        url = await compressImage(url);
    }

    return { url, cost: RATE_IMAGE };
  } catch (e) {
    console.error("Image generation service crash:", e);
    return { url: undefined, cost: 0 };
  }
};

export const generateChapterBanner = async (chapterTitle: string, chapterSummary: string, storyTitle: string, tone: string, tier: string = 'free'): Promise<{ url: string | undefined, cost: number }> => {
  let { imageResolution } = getConfig(tier);
  const context = `Story: ${storyTitle}\nChapter: ${chapterTitle}\nSummary: ${chapterSummary}`;
  const safeVisualDescription = await createSafeImagePrompt(context, 'SCENE', tone, tier);

  try {
    let url: string | undefined;

    const xAIApiKey = (getConfig(tier) as any).xAIApiKey;
    const body = {
        model: "grok-imagine-image-pro",
        prompt: safeVisualDescription,
        aspect_ratio: "16:9",
        image_format: "base64"
    };

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocal ? "https://api.x.ai/v1" : "/x-api";

    const response = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${xAIApiKey}`
        },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        const data = await response.json();
        if (data.image) {
             url = `data:image/png;base64,${data.image}`;
        } else if (data.data?.[0]?.b64_json) {
             url = `data:image/png;base64,${data.data[0].b64_json}`;
        } else if (data.data?.[0]?.url) {
             url = data.data[0].url;
        }
    }

    if (url && imageResolution === 'Low') {
        url = await compressImage(url);
    }

    return { url, cost: RATE_IMAGE };
  } catch (e) {
    return { url: undefined, cost: 0 };
  }
};
