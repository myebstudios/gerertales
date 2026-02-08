
import React, { useState, useEffect, useRef } from 'react';
import { Chapter, Story, TTSProvider } from '../types';
import { jsPDF } from "jspdf";
import * as GeminiService from '../services/geminiService';

interface StoryBlueprintProps {
  story: Story;
  currentChapterIndex: number;
  onChapterSelect: (index: number) => void;
  onContentUpdate: (content: string) => void;
  onChapterUpdate?: (index: number, updates: Partial<Chapter>) => void;
  onExport: () => void;
  checkCredits: () => boolean;
  deductCredits: (cost: number, feature: string) => void;
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
  deductCredits
}) => {
  const chapter = story.toc[currentChapterIndex];
  
  // -- Audio State --
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); 
  const [showSettings, setShowSettings] = useState(false);

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
    if (chapter && !chapter.bannerImage && onChapterUpdate) {
        // Use a unique key for the ref set (chapter index in this story context)
        if (!isGeneratingBannerRef.current.has(currentChapterIndex)) {
             if (checkCredits()) {
                 isGeneratingBannerRef.current.add(currentChapterIndex);
                 setIsBannerLoading(true);
                 
                 // Async generation
                 (async () => {
                     try {
                         const { url, cost } = await GeminiService.generateChapterBanner(
                             chapter.title,
                             chapter.summary || "A new scene.",
                             story.title,
                             story.tone
                         );
                         if (url) {
                             deductCredits(cost, "Scene Banner");
                             // Ensure we are still on the same story/chapter before updating?
                             // React state updates are generally safe, but we can verify index/id if needed.
                             // For now, assume user behavior flows naturally.
                             onChapterUpdate(currentChapterIndex, { bannerImage: url });
                         }
                     } catch (e) {
                         console.warn("Banner generation failed", e);
                     } finally {
                         setIsBannerLoading(false);
                     }
                 })();
             }
        }
    } else {
        setIsBannerLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterIndex, story.id]); // Added story.id to deps

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
                   // If we have a buffer but context is suspended, just resume
                   if (audioContextRef.current.state === 'suspended') {
                       await audioContextRef.current.resume();
                       setIsPlaying(true);
                   } else {
                       // If stopped or finished, restart from 0 or current progress
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
        // If buffer exists, play from beginning if we are at 100%, otherwise resume/play
        playBuffer(audioBufferRef.current, playbackProgress >= 100 ? 0 : (playbackProgress / 100) * audioBufferRef.current.duration);
        return;
    }
    
    // Check balance but don't deduct yet
    if (!checkCredits()) return;

    setIsLoadingAudio(true);
    try {
        const { audio, cost } = await GeminiService.generateSpeech(chapter.content, selectedVoice);
        
        if (audio) {
            deductCredits(cost, "TTS Generation");
            audioBufferRef.current = audio;
            playBuffer(audio);
        } else {
            alert("Could not generate speech. Please check your connection.");
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

      // Ensure context is running
      if (ctx.state === 'suspended') {
          ctx.resume();
      }

      // Stop previous source if any
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch (e) {}
          audioSourceRef.current.disconnect();
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => { 
          // Check if we effectively finished (within a small margin)
          // We rely on the interval for precise UI updates, this is a fallback cleanup
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
    <div className="flex flex-col h-full bg-dark-bg relative transition-colors duration-300">
      <div className="flex items-center justify-between px-8 py-6 border-b border-dark-border">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          {story.toc.map((ch, idx) => (
            <button key={ch.chapter} onClick={() => onChapterSelect(idx)} className={`whitespace-nowrap text-sm font-sans transition-colors ${idx === currentChapterIndex ? 'text-cobalt font-semibold border-b-2 border-cobalt pb-1' : 'text-text-muted hover:text-text-main'}`}>
              {idx + 1}. {ch.title}
            </button>
          ))}
        </div>
        <div className="relative ml-4">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className={`p-2 rounded-full transition-colors ${showExportMenu ? 'bg-zinc-800 text-white' : 'text-text-muted hover:bg-dark-surface hover:text-white'}`} title="Export">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </button>
            {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-dark-surface border border-dark-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Full Story</div>
                    <button onClick={handleExportText} className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-zinc-800 flex items-center gap-2">Export as Text</button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-zinc-800 flex items-center gap-2">Export as PDF</button>
                    
                    <div className="h-px bg-dark-border my-2" />
                    
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Chapter</div>
                    <button onClick={handleExportChapterTXT} className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-zinc-800 flex items-center gap-2">Export as .txt</button>
                    <button onClick={handleExportChapterMD} className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-zinc-800 flex items-center gap-2">Export as .md</button>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative" onClick={() => { setShowExportMenu(false); setShowSettings(false); }}>
        {/* Banner Image */}
        {(chapter.bannerImage || isBannerLoading) && (
            <div className="w-full h-48 md:h-64 relative overflow-hidden bg-zinc-900 border-b border-dark-border group">
                {chapter.bannerImage ? (
                    <img 
                        src={chapter.bannerImage} 
                        alt={chapter.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></span>
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent" />
            </div>
        )}

        <div className={`px-8 md:px-16 pb-32 relative z-20 ${!chapter.bannerImage && !isBannerLoading ? 'pt-8' : ''}`}>
            <div className="max-w-3xl mx-auto">
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-2"><span className="text-xs font-sans font-bold tracking-widest uppercase text-text-muted">Chapter {chapter.chapter}</span></div>
                    <h1 className="text-3xl font-serif text-text-main font-medium">{chapter.title}</h1>
                    <p className="mt-2 text-sm text-text-muted font-sans italic">{chapter.summary}</p>
                </div>
                <textarea value={chapter.content} onChange={(e) => onContentUpdate(e.target.value)} placeholder={`The ${story.format.toLowerCase()} begins here... Ask the architect to write, or start typing yourself.`} className="w-full h-[60vh] resize-none outline-none font-serif text-lg leading-relaxed text-text-main placeholder-zinc-700 bg-transparent" spellCheck={false} />
            </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4">
          <div className="bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-full p-2 px-4 shadow-2xl flex items-center gap-4 transition-all hover:scale-[1.01]">
              
              <button onClick={handlePlayPause} disabled={isLoadingAudio} className="w-10 h-10 rounded-full bg-cobalt text-white flex items-center justify-center hover:bg-blue-500 transition-colors shadow-lg shadow-cobalt/20 shrink-0">
                  {isLoadingAudio ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" clipRule="evenodd" /></svg>}
              </button>
              
              {/* Stop Button */}
              <button 
                onClick={() => { stopAudio(); setPlaybackProgress(0); }} 
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-colors shrink-0"
                title="Stop"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                  </svg>
              </button>

              <div className="flex-1 flex flex-col justify-center h-full gap-1">
                  <div className="flex justify-between items-center text-[10px] text-text-muted font-bold uppercase tracking-widest">
                      <span>{isPlaying ? 'Playing' : 'Ready'}</span>
                      <span className="text-cobalt">{Math.round(playbackProgress)}%</span>
                  </div>
                  
                  {/* Interactive Scrubbing Bar */}
                  <input 
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={playbackProgress}
                      onChange={handleSeek}
                      disabled={ttsProvider === 'browser'}
                      className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cobalt [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                      style={{
                          backgroundImage: `linear-gradient(to right, var(--color-cobalt) ${playbackProgress}%, #27272a ${playbackProgress}%)`
                      }}
                  />
              </div>

              <div className="relative">
                  <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-zinc-800 text-cobalt' : 'text-zinc-500 hover:text-text-main'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg></button>
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-4 w-64 bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Provider</label>
                                <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-dark-border">
                                    <span className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded ${ttsProvider === 'ai' ? 'bg-zinc-800 text-cobalt shadow' : 'text-zinc-500'}`}>{ttsProvider === 'ai' ? 'AI Neural' : 'AI'}</span>
                                    <span className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded ${ttsProvider === 'browser' ? 'bg-zinc-800 text-cobalt shadow' : 'text-zinc-500'}`}>{ttsProvider === 'browser' ? 'Browser' : 'Browser'}</span>
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-1 italic">Change provider in main Settings.</p>
                            </div>
                            <div>
                                <label className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Voice</label>
                                <div className="max-h-32 overflow-y-auto no-scrollbar border border-dark-border rounded-lg bg-zinc-900">
                                    {getVoiceOptions().map(v => (
                                        <button key={v} onClick={() => { setSelectedVoice(v); stopAudio(); }} className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-dark-border last:border-0 ${selectedVoice === v ? 'bg-cobalt/10 text-cobalt font-bold' : 'text-zinc-400 hover:text-text-main hover:bg-zinc-800'}`}>{v}</button>
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

