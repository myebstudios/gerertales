
import React, { useState, useEffect, useRef } from 'react';
import { Chapter, Story, TTSProvider, StoryComment } from '../types';
import { jsPDF } from "jspdf";
import * as GeminiService from '../services/geminiService';
import { supabaseService } from '../services/supabaseService';
import { useNotify } from '../services/NotificationContext';

interface StoryBlueprintProps {
  story: Story;
  currentChapterIndex: number;
  onChapterSelect: (index: number) => void;
  onContentUpdate: (content: string) => void;
  onChapterUpdate?: (index: number, updates: Partial<Chapter>) => void;
  onExport: () => void;
  checkCredits: () => boolean;
  deductCredits: (cost: number, feature: string) => void;
  focusMode?: boolean;
  onToggleFocus?: () => void;
  isOwner?: boolean;
  onTogglePublish?: () => void;
  userId?: string;
  onRefreshStory?: () => void;
}

const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

const StoryBlueprint: React.FC<StoryBlueprintProps> = ({ 
  story, 
  currentChapterIndex, 
  onChapterSelect, 
  onContentUpdate,
  onChapterUpdate,
  checkCredits,
  deductCredits,
  focusMode = false,
  onToggleFocus,
  isOwner = true,
  onTogglePublish,
  userId,
  onRefreshStory
}) => {
  const chapter = story.toc[currentChapterIndex];
  const { notify } = useNotify();

  // -- Local Stats --
  const wordCount = chapter?.content?.trim() ? chapter.content.trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200); // Average 200 wpm

  // -- UI State --
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); 
  const [showSettings, setShowSettings] = useState(false);

  // -- Social State --
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);

  // Fetch comments and social status
  useEffect(() => {
    if (story.isPublic) {
        supabaseService.getComments(story.id).then(setComments);
        if (userId) {
            supabaseService.hasUserLiked(userId, story.id).then(setHasLiked);
        }
    }
  }, [story.id, story.isPublic, userId]);

  const handleLike = async () => {
    if (!userId) return notify("Sign in to appreciate this tale!");
    try {
        await supabaseService.likeStory(userId, story.id);
        setHasLiked(true);
        if (onRefreshStory) onRefreshStory();
    } catch (e) { console.error(e); }
  };

  const handleRate = async (rating: number) => {
    if (!userId) return notify("Sign in to rate this tale!");
    try {
        await supabaseService.rateStory(userId, story.id, rating);
        setUserRating(rating);
        if (onRefreshStory) onRefreshStory();
    } catch (e) { console.error(e); }
  };

  const handlePostComment = async () => {
    if (!userId) return notify("Sign in to leave a comment!");
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
        await supabaseService.addComment(userId, story.id, newComment.trim());
        setNewComment('');
        const updated = await supabaseService.getComments(story.id);
        setComments(updated);
        if (onRefreshStory) onRefreshStory();
    } catch (e) { console.error(e); } finally {
        setIsPostingComment(false);
    }
  };

  const handleSaveToLibrary = async () => {
      if (!userId) return notify("Sign in to save this tale!");
      setIsSavingToLibrary(true);
      try {
          await supabaseService.saveToPersonalLibrary(userId, story.id);
          notify("Saved to your personal collection!");
      } catch (e) { console.error(e); } finally {
          setIsSavingToLibrary(false);
      }
  };

  // -- Settings State --
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('ai');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // -- Refs --
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // -- Export State --
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // -- Banner Generation State --
  const isGeneratingBannerRef = useRef<Set<number>>(new Set());
  const [isBannerLoading, setIsBannerLoading] = useState(false);

  // Reset banner generation state when switching stories
  useEffect(() => {
    isGeneratingBannerRef.current = new Set();
    setIsBannerLoading(false);
  }, [story.id]);

  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('gerertales_settings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setTtsProvider(parsed.ttsProvider || 'ai');
            if (parsed.ttsProvider === 'browser') {
            } else if (parsed.ttsModel && parsed.ttsModel.startsWith('tts')) {
                setSelectedVoice('alloy');
            } else {
                setSelectedVoice('Kore');
            }
        }
        const loadVoices = () => {
            const voices = synthesisRef.current.getVoices();
            setBrowserVoices(voices);
        };
        loadVoices();
        if (synthesisRef.current.onvoiceschanged !== undefined) {
            synthesisRef.current.onvoiceschanged = loadVoices;
        }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    stopAudio();
    setPlaybackProgress(0);
    audioBufferRef.current = null;
    
    // Check and generate banner if missing
    if (chapter && !chapter.bannerImage && onChapterUpdate && isOwner) {
        if (!isGeneratingBannerRef.current.has(currentChapterIndex)) {
             // Add a small delay to prevent rapid-fire generation
             const timer = setTimeout(async () => {
                 if (!isGeneratingBannerRef.current.has(currentChapterIndex) && checkCredits()) {
                     isGeneratingBannerRef.current.add(currentChapterIndex);
                     setIsBannerLoading(true);
                     
                     try {
                         const { url, cost } = await GeminiService.generateChapterBanner(
                             chapter.title,
                             chapter.summary || "A new scene.",
                             story.title,
                             story.tone
                         );
                         if (url) {
                             deductCredits(cost, "Scene Banner");
                             onChapterUpdate(currentChapterIndex, { bannerImage: url });
                         }
                     } catch (e) {
                         console.warn("Banner generation failed", e);
                     } finally {
                         setIsBannerLoading(false);
                     }
                 }
             }, 2000);
             return () => clearTimeout(timer);
        }
    } else {
        setIsBannerLoading(false);
    }
  }, [currentChapterIndex, story.id]);

  // -- Audio Logic --

  const stopAudio = () => {
    if (audioSourceRef.current) { 
        try { audioSourceRef.current.stop(); } catch (e) {} 
        audioSourceRef.current.disconnect();
    }
    if (audioContextRef.current) { audioContextRef.current.suspend(); }
    if (synthesisRef.current.speaking) { synthesisRef.current.cancel(); }
    if (progressIntervalRef.current) { window.clearInterval(progressIntervalRef.current); }
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
                       const duration = audioBufferRef.current.duration;
                       const offset = (playbackProgress / 100) * duration;
                       playBuffer(audioBufferRef.current, offset >= duration ? 0 : offset);
                   }
              } else {
                  playAiTTS();
              }
          }
      }
  };

  const playBrowserTTS = () => {
      if (!chapter?.content?.trim()) return;
      synthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(chapter.content);
      const voice = browserVoices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      utterance.onstart = () => { setIsPlaying(true); setPlaybackProgress(0); };
      utterance.onend = () => { setIsPlaying(false); setPlaybackProgress(100); };
      utterance.onerror = () => { setIsPlaying(false); };

      const words = chapter.content.split(' ').length;
      const estimatedDuration = words / 2.5; 
      let elapsed = 0;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = window.setInterval(() => {
          if (synthesisRef.current.paused || !synthesisRef.current.speaking) return;
          elapsed += 0.1;
          const p = Math.min((elapsed / estimatedDuration) * 100, 99);
          setPlaybackProgress(p);
      }, 100);
      synthesisRef.current.speak(utterance);
  };

  const playAiTTS = async () => {
    if (!chapter?.content?.trim()) return;
    if (audioBufferRef.current) {
        playBuffer(audioBufferRef.current, playbackProgress >= 100 ? 0 : (playbackProgress / 100) * audioBufferRef.current.duration);
        return;
    }
    
    if (!checkCredits()) return;

    setIsLoadingAudio(true);
    try {
        const { audio, cost } = await GeminiService.generateSpeech(chapter.content, selectedVoice);
        
        if (audio) {
            deductCredits(cost, "TTS Generation");
            audioBufferRef.current = audio;
            playBuffer(audio);
        } else {
            notify("Could not generate speech. Please check your connection.");
        }
    } catch (e) {
        console.error("Audio playback error", e);
    } finally {
        setIsLoadingAudio(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer, offset: number = 0) => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let ctx = audioContextRef.current;
      
      if (!ctx) {
          ctx = new AudioContextClass({sampleRate: 24000});
          audioContextRef.current = ctx;
      }

      if (ctx.state === 'suspended') {
          ctx.resume();
      }

      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch (e) {}
          audioSourceRef.current.disconnect();
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => { 
          if (progressIntervalRef.current) {
              const elapsed = ctx!.currentTime - startTimeRef.current;
              if (elapsed >= buffer.duration - 0.2) {
                 setIsPlaying(false); 
                 setPlaybackProgress(100);
                 clearInterval(progressIntervalRef.current);
              }
          }
      };

      audioSourceRef.current = source;
      source.start(0, offset);
      startTimeRef.current = ctx.currentTime - offset;
      setIsPlaying(true);
      
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = window.setInterval(() => {
           if (ctx && ctx.state === 'running') {
               const elapsed = ctx.currentTime - startTimeRef.current;
               const duration = buffer.duration;
               const p = Math.min((elapsed / duration) * 100, 100);
               setPlaybackProgress(p);
           }
      }, 100);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newProgress = parseFloat(e.target.value);
      setPlaybackProgress(newProgress);
      
      if (ttsProvider === 'ai' && audioBufferRef.current) {
          const duration = audioBufferRef.current.duration;
          const offset = (newProgress / 100) * duration;
          playBuffer(audioBufferRef.current, offset);
      }
  };

  const getVoiceOptions = () => {
      if (ttsProvider === 'browser') return browserVoices.map(v => v.name).sort();
      const savedSettings = localStorage.getItem('gerertales_settings');
      if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.ttsModel && parsed.ttsModel.startsWith('tts')) return OPENAI_VOICES;
      }
      return GEMINI_VOICES;
  };

  // Export handlers
  const handleExportText = () => {
    const element = document.createElement("a");
    const fileContent = story.toc.map(c => `Chapter ${c.chapter}: ${c.title}\n\n${c.content}\n\n`).join('***\n\n');
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${story.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = 40;
    doc.setFont("times", "bold");
    doc.setFontSize(24);
    doc.text(story.title, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    doc.setFontSize(14);
    doc.setFont("times", "italic");
    doc.text(`A ${story.format} by GérerTales`, pageWidth / 2, yPosition, { align: "center" });
    if (story.coverImage) {
        try {
            yPosition += 20;
            const imgProps = doc.getImageProperties(story.coverImage);
            const imgWidth = 100;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            doc.addImage(story.coverImage, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
        } catch (e) { console.warn("Could not add cover image to PDF", e); }
    }
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    story.toc.forEach((chapter) => {
        doc.addPage();
        yPosition = 30;
        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text(`Chapter ${chapter.chapter}: ${chapter.title}`, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 15;
        yPosition += 10;
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        const content = chapter.content || "(No content yet)";
        const lines = doc.splitTextToSize(content, maxWidth);
        lines.forEach((line: string) => {
            if (yPosition > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += 7;
        });
    });
    doc.save(`${story.title.replace(/\s+/g, '_')}.pdf`);
    setShowExportMenu(false);
  };

  const handleExportChapterTXT = () => {
    if (!chapter) return;
    const element = document.createElement("a");
    const fileContent = `Chapter ${chapter.chapter}: ${chapter.title}\n\n${chapter.content}`;
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  const handleExportChapterMD = () => {
    if (!chapter) return;
    const element = document.createElement("a");
    const fileContent = `# Chapter ${chapter.chapter}: ${chapter.title}\n\n${chapter.content}`;
    const file = new Blob([fileContent], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  if (!chapter) return <div className="flex flex-col h-full bg-dark-bg items-center justify-center text-text-muted font-serif animate-pulse"><p>Loading Chapter...</p></div>;

  return (
    <div className="flex flex-col h-full bg-dark-bg relative transition-all duration-500 overflow-hidden">
      
      {/* Refined Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-6">
            <div className="relative">
                <button 
                    onClick={() => setShowChapterDropdown(!showChapterDropdown)}
                    className="flex items-center gap-2 group"
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cobalt bg-cobalt/10 px-2 py-0.5 rounded-md">CH {chapter.chapter}</span>
                    <h2 className="text-sm font-serif font-medium text-text-main group-hover:text-cobalt transition-colors">{chapter.title}</h2>
                    <svg className={`w-4 h-4 text-zinc-600 transition-transform ${showChapterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {showChapterDropdown && (
                    <div className="absolute top-full left-0 mt-3 w-64 bg-dark-surface border border-dark-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {story.toc.map((ch, idx) => (
                            <button 
                                key={`dropdown-${ch.chapter}`}
                                onClick={() => { onChapterSelect(idx); setShowChapterDropdown(false); }}
                                className={`w-full text-left px-4 py-3 text-xs transition-colors border-b border-dark-border last:border-0 flex items-center justify-between group
                                ${idx === currentChapterIndex ? 'bg-cobalt/5 text-cobalt font-bold' : 'text-zinc-400 hover:text-text-main hover:bg-zinc-800'}`}
                            >
                                <span className="truncate pr-4">{idx + 1}. {ch.title}</span>
                                {idx === currentChapterIndex && <div className="w-1.5 h-1.5 bg-cobalt rounded-full shadow-[0_0_8px_var(--color-cobalt)]" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-4 w-px bg-dark-border" />

            {/* Progress Meter */}
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{wordCount} Words</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{readingTime}m Read</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Publish Toggle (Owner Only) */}
            {isOwner && (
                <button 
                    onClick={onTogglePublish}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border
                    ${story.isPublic 
                        ? 'bg-cobalt/10 border-cobalt/20 text-cobalt' 
                        : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'}`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${story.isPublic ? 'bg-cobalt animate-pulse' : 'bg-zinc-600'}`} />
                    {story.isPublic ? 'Published' : 'Publish'}
                </button>
            )}

            {/* Focus Toggle */}
            <button 
                onClick={onToggleFocus}
                className={`p-2.5 rounded-xl transition-all ${focusMode ? 'bg-cobalt text-white shadow-lg shadow-cobalt/20' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>

            <div className="relative">
                <button onClick={() => setShowExportMenu(!showExportMenu)} className={`p-2.5 rounded-xl transition-all ${showExportMenu ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`} title="Export Options">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                </button>
                {showExportMenu && (
                    <div className="absolute right-0 top-full mt-3 w-56 bg-dark-surface border border-dark-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Full Story</div>
                        <button onClick={handleExportText} className="w-full text-left px-4 py-3 text-xs text-text-main hover:bg-zinc-800 flex items-center gap-2 transition-colors">Export as Text</button>
                        <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-xs text-text-main hover:bg-zinc-800 flex items-center gap-2 transition-colors">Export as PDF</button>
                        
                        <div className="h-px bg-dark-border my-2" />
                        
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Chapter</div>
                        <button onClick={handleExportChapterTXT} className="w-full text-left px-4 py-3 text-xs text-text-main hover:bg-zinc-800 flex items-center gap-2 transition-colors">Export as .txt</button>
                        <button onClick={handleExportChapterMD} className="w-full text-left px-4 py-3 text-xs text-text-main hover:bg-zinc-800 flex items-center gap-2 transition-colors">Export as .md</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative no-scrollbar" onClick={() => { setShowExportMenu(false); setShowSettings(false); setShowChapterDropdown(false); }}>
        {/* Banner Image */}
        {(chapter.bannerImage || isBannerLoading) && (
            <div className="w-full h-56 md:h-80 relative overflow-hidden bg-zinc-900 border-b border-dark-border group">
                {chapter.bannerImage ? (
                    <img 
                        src={chapter.bannerImage} 
                        alt={chapter.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-1000 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent opacity-80" />
            </div>
        )}

        <div className={`px-8 md:px-24 lg:px-32 pb-48 relative z-20 ${!chapter.bannerImage && !isBannerLoading ? 'pt-16' : '-mt-16'}`}>
            <div className="max-w-4xl mx-auto">
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-sans font-black tracking-[0.2em] uppercase text-zinc-600">Chapter {chapter.chapter}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-text-main font-medium tracking-tight mb-6">{chapter.title}</h1>
                    <p className="text-xl text-text-muted font-serif italic border-l-2 border-zinc-800 pl-6 py-1">{chapter.summary}</p>
                </div>
                
                <textarea 
                    value={chapter.content} 
                    onChange={(e) => onContentUpdate(e.target.value)} 
                    placeholder={`The ${story.format.toLowerCase()} begins here... Ask the architect to write, or start typing yourself.`} 
                    className="w-full min-h-[70vh] resize-none outline-none font-serif text-xl md:text-2xl leading-[1.8] text-text-main placeholder-zinc-800 bg-transparent" 
                    spellCheck={false} 
                />

                {/* Social Interactions Section (Visible if Public) */}
                {story.isPublic && (
                    <div className="mt-32 pt-16 border-t border-white/5 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-8">
                                <button 
                                    onClick={handleLike}
                                    className="flex items-center gap-3 group"
                                >
                                    <div className={`p-4 rounded-2xl bg-zinc-900 border border-white/5 transition-all
                                        ${hasLiked ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-zinc-500 group-hover:text-red-500 group-hover:border-red-500/20 group-hover:bg-red-500/5'}`}>
                                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-xl font-serif text-white">{story.likesCount || 0}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Appreciations</span>
                                    </div>
                                </button>

                                <div className="flex items-center gap-3 group">
                                    <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 transition-all flex gap-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <svg 
                                                key={s} 
                                                onClick={() => handleRate(s)}
                                                className={`w-4 h-4 fill-current cursor-pointer transition-transform hover:scale-125
                                                ${s <= (userRating || story.ratingAverage || 0) ? 'text-yellow-500' : 'text-zinc-800'}`} 
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                            </svg>
                                        ))}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-serif text-white">{story.ratingAverage?.toFixed(1) || "0.0"}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Rating</span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveToLibrary}
                                disabled={isSavingToLibrary}
                                className="bg-white text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl disabled:opacity-50"
                            >
                                {isSavingToLibrary ? 'Saving...' : 'Add to Collection'}
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-12 bg-zinc-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5">
                            <h3 className="text-2xl font-serif text-white tracking-tight">Discussion ({comments.length})</h3>
                            
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex-shrink-0 border border-white/5" />
                                <div className="flex-1 space-y-4">
                                    <textarea 
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Leave your thoughts on this tale..."
                                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-6 text-sm outline-none focus:border-cobalt transition-all min-h-[120px] resize-none text-white placeholder-zinc-700"
                                    />
                                    <button 
                                        onClick={handlePostComment}
                                        disabled={isPostingComment || !newComment.trim()}
                                        className="bg-cobalt text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50"
                                    >
                                        {isPostingComment ? 'Posting...' : 'Post Comment'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-8 pt-8 border-t border-white/5">
                                {comments.map(comment => (
                                    <div key={comment.id} className="flex gap-6 group">
                                        <div className="w-10 h-10 rounded-full bg-cobalt/10 border border-cobalt/20 flex items-center justify-center text-cobalt font-bold text-xs">
                                            {comment.userName.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-bold text-white">{comment.userName}</span>
                                                <span className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter">
                                                    {new Date(comment.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
                                                {comment.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <div className="text-center py-8 text-zinc-600 font-serif italic">
                                        No thoughts shared yet. Be the first to start the discussion.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>

      {/* Floating Audio Bar */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 transition-all duration-700 ${focusMode ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="bg-dark-surface/90 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-3 px-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center gap-6 group/audio">
              
              <button onClick={handlePlayPause} disabled={isLoadingAudio} className="w-12 h-12 rounded-full bg-cobalt text-white flex items-center justify-center hover:bg-blue-500 transition-all shadow-xl shadow-cobalt/20 active:scale-95 shrink-0">
                  {isLoadingAudio ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" clipRule="evenodd" /></svg>}
              </button>
              
              <button 
                onClick={() => { stopAudio(); setPlaybackProgress(0); }} 
                className="w-10 h-10 rounded-full bg-zinc-800/50 text-zinc-500 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0 active:scale-95"
                title="Stop"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                  </svg>
              </button>

              <div className="flex-1 flex flex-col justify-center h-full gap-2 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                      <span className={isPlaying ? 'text-cobalt animate-pulse' : 'text-zinc-600'}>{isPlaying ? 'Narrating...' : 'Ready'}</span>
                      <span className="text-zinc-500">{Math.round(playbackProgress)}%</span>
                  </div>
                  
                  <input 
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={playbackProgress}
                      onChange={handleSeek}
                      disabled={ttsProvider === 'browser' || isLoadingAudio}
                      className={`w-full h-1 rounded-full appearance-none transition-all
                        ${ttsProvider === 'browser' ? 'bg-zinc-900 cursor-not-allowed' : 'bg-zinc-800 cursor-pointer'}
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cobalt [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-150`}
                      style={{
                          backgroundImage: ttsProvider === 'browser' ? 'none' : `linear-gradient(to right, var(--color-cobalt) ${playbackProgress}%, transparent ${playbackProgress}%)`
                      }}
                  />
              </div>

              <div className="relative">
                  <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-2xl transition-all ${showSettings ? 'bg-zinc-800 text-cobalt' : 'text-zinc-600 hover:text-text-main'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg></button>
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-6 w-64 bg-dark-surface border border-dark-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block">Voice Engine</label>
                                <div className="flex gap-1 p-1 bg-zinc-900 border border-dark-border rounded-xl">
                                    <button onClick={() => setTtsProvider('ai')} className={`flex-1 text-center py-2 text-[10px] font-bold rounded-lg transition-all ${ttsProvider === 'ai' ? 'bg-zinc-800 text-cobalt shadow-lg' : 'text-zinc-600'}`}>Neural</button>
                                    <button onClick={() => setTtsProvider('browser')} className={`flex-1 text-center py-2 text-[10px] font-bold rounded-lg transition-all ${ttsProvider === 'browser' ? 'bg-zinc-800 text-cobalt shadow-lg' : 'text-zinc-600'}`}>Native</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block">Select Persona</label>
                                <div className="max-h-40 overflow-y-auto no-scrollbar border border-dark-border rounded-xl bg-zinc-900 divide-y divide-dark-border/50">
                                    {getVoiceOptions().map(v => (
                                        <button key={v} onClick={() => { setSelectedVoice(v); stopAudio(); }} className={`w-full text-left px-4 py-3 text-[11px] transition-all flex items-center justify-between group/v ${selectedVoice === v ? 'text-cobalt bg-cobalt/5 font-bold' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                                            <span>{v}</span>
                                            {selectedVoice === v && <div className="w-1 h-1 bg-cobalt rounded-full" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default StoryBlueprint;
