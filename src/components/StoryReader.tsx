import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Story, Chapter, TTSProvider } from '../types';
import { supabaseService } from '../services/supabaseService';
import * as VoiceService from '../services/voiceService';
import { VOICE_LISTS } from '../services/voiceService';
import { useNotify } from '../services/NotificationContext';
import { useStore } from '../services/store';

const StoryReader: React.FC = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { notify } = useNotify();
    const { deductCredits, userProfile } = useStore();
    
    const [story, setStory] = useState<Story | null>(null);
    const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    
    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>('ai');
    const [selectedVoice, setSelectedVoice] = useState<string>('Rachel');
    const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const startTimeRef = useRef<number>(0);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

    useEffect(() => {
        if (storyId) {
            supabaseService.getStoryById(storyId).then(res => {
                if (res) setStory(res);
                setIsLoading(false);
            }).catch(() => setIsLoading(false));
        }
    }, [storyId]);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('gerertales_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setTtsProvider(parsed.ttsProvider || 'ai');
                if (parsed.ttsModel && parsed.ttsModel.includes('eleven')) setSelectedVoice('Rachel');
                else if (parsed.ttsModel && parsed.ttsModel.startsWith('tts')) setSelectedVoice('Alloy');
                else setSelectedVoice('Kore');
            }
            const loadVoices = () => setBrowserVoices(synthesisRef.current.getVoices());
            loadVoices();
            if (synthesisRef.current.onvoiceschanged !== undefined) synthesisRef.current.onvoiceschanged = loadVoices;
        } catch (e) {}
    }, []);

    const currentChapter = story?.toc[currentChapterIdx];

    useEffect(() => {
        stopAudio();
        setPlaybackProgress(0);
        audioBufferRef.current = null;
    }, [currentChapterIdx]);

    const stopAudio = () => {
        if (audioSourceRef.current) { 
            try { audioSourceRef.current.stop(); } catch (e) {} 
            audioSourceRef.current.disconnect();
        }
        if (audioContextRef.current) audioContextRef.current.suspend();
        if (synthesisRef.current.speaking) synthesisRef.current.cancel();
        if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
        setIsPlaying(false);
        setIsLoadingAudio(false);
    };

    const handlePlayPause = async () => {
        if (isPlaying) {
            if (ttsProvider === 'browser') {
                synthesisRef.current.pause();
                setIsPlaying(false);
            } else {
                if (audioContextRef.current) {
                    await audioContextRef.current.suspend();
                    setIsPlaying(false);
                }
            }
        } else {
            if (ttsProvider === 'browser') {
                if (synthesisRef.current.paused) {
                    synthesisRef.current.resume();
                    setIsPlaying(true);
                } else {
                    playBrowserTTS();
                }
            } else {
                if (audioBufferRef.current && audioContextRef.current) {
                    if (audioContextRef.current.state === 'suspended') {
                        await audioContextRef.current.resume();
                        setIsPlaying(true);
                    } else {
                        playBuffer(audioBufferRef.current, (playbackProgress / 100) * audioBufferRef.current.duration);
                    }
                } else {
                    playAiTTS();
                }
            }
        }
    };

    const playBrowserTTS = () => {
        if (!currentChapter?.content?.trim()) return;
        synthesisRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(currentChapter.content);
        const voice = browserVoices.find(v => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
        utterance.onstart = () => { setIsPlaying(true); setPlaybackProgress(0); };
        utterance.onend = () => { setIsPlaying(false); setPlaybackProgress(100); };
        
        const words = currentChapter.content.split(' ').length;
        const estimatedDuration = words / 2.5; 
        let elapsed = 0;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = window.setInterval(() => {
            if (synthesisRef.current.paused || !synthesisRef.current.speaking) return;
            elapsed += 0.1;
            setPlaybackProgress(Math.min((elapsed / estimatedDuration) * 100, 99));
        }, 100);
        synthesisRef.current.speak(utterance);
    };

    const playAiTTS = async () => {
        if (!currentChapter?.content?.trim()) return;
        if (!userProfile || userProfile.credits < 1) return notify("Credits needed for neural narration.");

        setIsLoadingAudio(true);
        try {
            const { audio, cost } = await VoiceService.generateSpeech(currentChapter.content, selectedVoice);
            if (audio) {
                const { data: { user } } = await supabase.auth.getUser();
                await deductCredits(user, cost, "Neural Reading");
                audioBufferRef.current = audio;
                playBuffer(audio);
            }
        } catch (e) { console.error(e); } finally { setIsLoadingAudio(false); }
    };

    const playBuffer = (buffer: AudioBuffer, offset: number = 0) => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        let ctx = audioContextRef.current || new AudioContextClass({sampleRate: 24000});
        audioContextRef.current = ctx;
        if (ctx.state === 'suspended') ctx.resume();
        if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch (e) {} audioSourceRef.current.disconnect(); }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
            const elapsed = ctx.currentTime - startTimeRef.current;
            if (elapsed >= buffer.duration - 0.2) { setIsPlaying(false); setPlaybackProgress(100); }
        };
        audioSourceRef.current = source;
        source.start(0, offset);
        startTimeRef.current = ctx.currentTime - offset;
        setIsPlaying(true);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = window.setInterval(() => {
            if (ctx.state === 'running') setPlaybackProgress(Math.min(((ctx.currentTime - startTimeRef.current) / buffer.duration) * 100, 100));
        }, 100);
    };

    const handleNext = () => {
        if (story && currentChapterIdx < story.toc.length - 1) {
            setCurrentChapterIdx(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrev = () => {
        if (currentChapterIdx > 0) {
            setCurrentChapterIdx(prev => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const getVoiceOptions = () => {
        if (ttsProvider === 'browser') return browserVoices.map(v => v.name).sort();
        const settings = JSON.parse(localStorage.getItem('gerertales_settings') || '{}');
        if (settings.ttsModel?.includes('eleven')) return VOICE_LISTS.elevenlabs.map((v:any) => v.name);
        if (settings.ttsModel?.startsWith('tts')) return VOICE_LISTS.openai.map((v:any) => v.name);
        return VOICE_LISTS.gemini.map((v:any) => v.name);
    };

    if (isLoading) return <div className="h-screen w-screen bg-dark-bg flex items-center justify-center font-serif text-text-muted animate-pulse">Opening the Tome...</div>;
    if (!story) return <div className="h-screen w-screen bg-dark-bg flex items-center justify-center font-serif text-text-muted">Tale not found.</div>;

    return (
        <div className="flex flex-col h-screen bg-dark-bg text-text-main font-serif selection:bg-cobalt selection:text-white">
            {/* Minimal Header */}
            <nav className="shrink-0 w-full z-50 px-8 py-6 flex items-center justify-between backdrop-blur-xl bg-dark-bg/60 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Exit
                </button>
                <div className="text-center">
                    <h1 className="text-sm font-medium tracking-tight line-clamp-1">{story.title}</h1>
                    <p className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter">Chapter {currentChapterIdx + 1} of {story.toc.length}</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Voice Engine Toggle */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowAudioSettings(!showAudioSettings)}
                            className={`p-2 rounded-xl transition-all ${showAudioSettings ? 'bg-cobalt/20 text-cobalt' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        </button>
                        {showAudioSettings && (
                            <div className="absolute right-0 top-full mt-4 w-64 bg-dark-surface border border-dark-border rounded-3xl shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Narration Engine</label>
                                        <div className="flex gap-1 p-1 bg-zinc-900 border border-dark-border rounded-xl">
                                            <button onClick={() => setTtsProvider('ai')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${ttsProvider === 'ai' ? 'bg-zinc-800 text-cobalt shadow-lg' : 'text-zinc-600'}`}>Neural</button>
                                            <button onClick={() => setTtsProvider('browser')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${ttsProvider === 'browser' ? 'bg-zinc-800 text-cobalt shadow-lg' : 'text-zinc-600'}`}>Native</button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Select Voice</label>
                                        <select 
                                            value={selectedVoice}
                                            onChange={(e) => { setSelectedVoice(e.target.value); stopAudio(); }}
                                            className="w-full bg-zinc-900 border border-dark-border rounded-xl p-3 text-xs text-white outline-none"
                                        >
                                            {getVoiceOptions().map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto pt-20 pb-40 px-8">
                <div className="max-w-3xl mx-auto space-y-16">
                    {/* Chapter Banner */}
                    {currentChapter?.bannerImage && (
                        <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl bg-zinc-900">
                            <img src={currentChapter.bannerImage} className="w-full h-full object-cover opacity-80" />
                        </div>
                    )}

                    <div className="space-y-10">
                        <div className="space-y-3 text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt">Chapter {currentChapter?.chapter}</span>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-tight">{currentChapter?.title}</h2>
                        </div>
                        
                        <div className="prose prose-invert prose-lg max-w-none">
                            {currentChapter?.content ? (
                                currentChapter.content.split('\n\n').map((para, i) => (
                                    <p key={i} className="text-zinc-300 leading-[1.9] text-xl md:text-2xl mb-10 text-justify">
                                        {para}
                                    </p>
                                ))
                            ) : (
                                <p className="text-zinc-600 italic text-center py-20">This chapter is still being drafted by the author.</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Nav */}
                    <div className="pt-24 border-t border-white/5 flex items-center justify-between">
                        <button 
                            onClick={handlePrev} 
                            disabled={currentChapterIdx === 0}
                            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-0"
                        >
                            Previous
                        </button>
                        
                        {currentChapterIdx === story.toc.length - 1 ? (
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-cobalt">Fin.</p>
                                <p className="text-xs text-zinc-600 font-sans italic">The end of this narrative arc.</p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleNext}
                                className="px-10 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl shadow-white/10"
                            >
                                Next Chapter
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* Sticky Audio Control Bar */}
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg px-8 z-50">
                <div className="bg-dark-surface/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 flex items-center gap-6 shadow-2xl">
                    <button 
                        onClick={handlePlayPause} 
                        disabled={isLoadingAudio}
                        className="w-12 h-12 rounded-full bg-cobalt text-white flex items-center justify-center hover:bg-blue-500 transition-all active:scale-95 shrink-0 shadow-lg shadow-cobalt/20"
                    >
                        {isLoadingAudio ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" /></svg> : <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>}
                    </button>

                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
                            <span>{isPlaying ? 'Narrating' : 'Paused'}</span>
                            <span>{Math.round(playbackProgress)}%</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cobalt transition-all duration-300" style={{ width: `${playbackProgress}%` }} />
                        </div>
                    </div>

                    <button 
                        onClick={stopAudio}
                        className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryReader;
