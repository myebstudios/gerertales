
import { Modality } from "@google/genai";
import { getConfig, RATE_TTS_CHAR, RATE_ELEVENLABS_CHAR } from "./aiUtils";

export const VOICE_LISTS: Record<string, any> = {
    'gemini': [
        { name: 'Kore', id: 'Kore' },
        { name: 'Puck', id: 'Puck' },
        { name: 'Charon', id: 'Charon' },
        { name: 'Fenrir', id: 'Fenrir' },
        { name: 'Zephyr', id: 'Zephyr' }
    ],
    'openai': [
        { name: 'Alloy', id: 'alloy' },
        { name: 'Echo', id: 'echo' },
        { name: 'Fable', id: 'fable' },
        { name: 'Onyx', id: 'onyx' },
        { name: 'Nova', id: 'nova' },
        { name: 'Shimmer', id: 'shimmer' }
    ],
    'elevenlabs': [
        { name: 'Rachel', id: '21m00Tcm4TlvDq8ikWAM' },
        { name: 'Drew', id: '29vD33N1CtxCmqQRPOHJ' },
        { name: 'Clyde', id: '2EiwWnXFnvU5JabPnv8n' },
        { name: 'Paul', id: '5Q0t7uMcjvnagumLfvZi' },
        { name: 'Domi', id: 'AZnzlk1XvdvUeBnXmlld' },
        { name: 'Dave', id: 'CYw3kZ02Hs0563khs1Fj' },
        { name: 'Fin', id: 'D38z5RcWu1voky8WS1ja' },
        { name: 'Sarah', id: 'EXAVITQu4vr4xnSDxMaL' },
        { name: 'Antoni', id: 'ErXwobaYiN019PkySvjV' },
        { name: 'Thomas', id: 'GBv7mTt0atIp3Br8iCZE' },
        { name: 'Charlie', id: 'IKne3meq5aSn9XLyUdCD' }
    ],
    'xai': [
        { name: 'Grok Beta', id: 'grok-1' }
    ]
};

export const getElevenLabsVoices = (): { name: string; id: string }[] => {
    let settings: any = {};
    try {
        settings = JSON.parse(localStorage.getItem('gerertales_settings') || '{}');
    } catch (e) {
        settings = {};
    }
    const africanVoices = Array.isArray(settings.elevenLabsAfricanVoices)
        ? settings.elevenLabsAfricanVoices
              .filter((v: any) => v && typeof v.id === 'string' && v.id.trim() && typeof v.name === 'string')
              .map((v: any) => ({ name: `${v.name} (African)`, id: v.id }))
        : [];
    return [...VOICE_LISTS.elevenlabs, ...africanVoices];
};

const resolveElevenLabsVoice = (voiceName: string) => {
    const voices = getElevenLabsVoices();
    return voices.find(v => v.name === voiceName) || voices[0];
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

export const generateSpeech = async (text: string, voiceName: string = 'Rachel', tier: string = 'free'): Promise<{ audio: AudioBuffer | null, cost: number }> => {
  const { gemini, openai, ttsModel, elevenLabsApiKey } = getConfig(tier);
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  
  try {
    if (ttsModel.includes('eleven') && elevenLabsApiKey) {
        const voice = resolveElevenLabsVoice(voiceName);
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: ttsModel,
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) throw new Error("ElevenLabs error");
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await outputAudioContext.decodeAudioData(arrayBuffer);
        const cost = Math.round((text.length * RATE_ELEVENLABS_CHAR) * 100) / 100;
        return { audio: audioBuffer, cost };
    }

    if (ttsModel.startsWith('tts-') && openai) {
        const voice = VOICE_LISTS.openai.find((v: any) => v.name === voiceName) || VOICE_LISTS.openai[0];
        const response = await openai.audio.speech.create({
            model: ttsModel,
            voice: voice.id as any,
            input: text,
        });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await outputAudioContext.decodeAudioData(arrayBuffer);
        const cost = Math.round((text.length * RATE_TTS_CHAR) * 100) / 100;
        return { audio: audioBuffer, cost };
    }

    if (ttsModel.includes('gemini') || !ttsModel) {
        const voice = VOICE_LISTS.gemini.find((v: any) => v.name === voiceName) || VOICE_LISTS.gemini[0];
        const textChunks = chunkText(text, 3500); 
        const audioBuffers: AudioBuffer[] = [];
        
        for (const chunk of textChunks) {
            const response = await gemini.models.generateContent({
                model: 'gemini-1.5-flash', 
                contents: [{ parts: [{ text: chunk }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.id } } },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const chunkBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                audioBuffers.push(chunkBuffer);
            }
        }
        
        if (audioBuffers.length === 0) throw new Error("No audio generated by Gemini");
        const cost = Math.round((text.length * RATE_TTS_CHAR) * 100) / 100;
        return { 
            audio: audioBuffers.length === 1 ? audioBuffers[0] : mergeAudioBuffers(audioBuffers, outputAudioContext), 
            cost 
        };
    }

    throw new Error(`Unsupported TTS model: ${ttsModel}`);
  } catch (error) {
    return { audio: null, cost: 0 };
  }
};

export const generateSpeechStream = async (
    text: string,
    voiceName: string = 'Rachel',
    tier: string = 'free'
): Promise<{ audio: HTMLAudioElement | null; cost: number; abort?: () => void }> => {
    const { ttsModel, elevenLabsApiKey } = getConfig(tier);
    if (!ttsModel.includes('eleven') || !elevenLabsApiKey) {
        return { audio: null, cost: 0 };
    }

    const voice = resolveElevenLabsVoice(voiceName);
    const controller = new AbortController();

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: ttsModel,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            output_format: "mp3_44100_128"
        }),
        signal: controller.signal
    });

    if (!response.ok || !response.body) {
        return { audio: null, cost: 0 };
    }

    const mediaSource = new MediaSource();
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = URL.createObjectURL(mediaSource);

    const appendChunk = (sourceBuffer: SourceBuffer, chunk: Uint8Array) =>
        new Promise<void>((resolve, reject) => {
            const onError = () => {
                sourceBuffer.removeEventListener('error', onError);
                sourceBuffer.removeEventListener('updateend', onUpdate);
                reject(new Error("SourceBuffer error"));
            };
            const onUpdate = () => {
                sourceBuffer.removeEventListener('error', onError);
                sourceBuffer.removeEventListener('updateend', onUpdate);
                resolve();
            };
            sourceBuffer.addEventListener('error', onError);
            sourceBuffer.addEventListener('updateend', onUpdate);
            sourceBuffer.appendBuffer(chunk);
        });

    mediaSource.addEventListener('sourceopen', async () => {
        if (!response.body) return;
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const reader = response.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value && value.byteLength > 0) {
                    await appendChunk(sourceBuffer, value);
                }
            }
        } catch (e) {
            // Ignore stream aborts
        } finally {
            try { mediaSource.endOfStream(); } catch (e) { }
        }
    }, { once: true });

    const cost = Math.round((text.length * RATE_ELEVENLABS_CHAR) * 100) / 100;
    return { audio, cost, abort: () => controller.abort() };
};
