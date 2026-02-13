
import React, { useState, useEffect } from 'react';
import { StoryConfig, StoryFormat, Character, Chapter, Location, StoryBlueprintData } from '../types';
import * as TextService from '../services/textService';
import { useNotify } from '../services/NotificationContext';

interface OnboardingProps {
  onConfirm: (config: StoryConfig, blueprint: StoryBlueprintData) => void;
  isLoading: boolean;
  onCheckCredits: () => boolean;
  onDeductCredits: (cost: number, feature: string) => void;
  userTier?: string;
}

const RANDOM_SPARKS = [
  "A clockmaker invents a device that stops time for everyone but him.",
  "A botanist discovers a plant that grows faster when told secrets.",
  "In a city where silence is currency, a musician becomes a thief.",
  "A letter arrives 50 years late, revealing a family secret.",
  "A chef whose dishes make people remember their forgotten childhoods.",
  "An architect designs a building that doesn't exist in the daylight.",
  "A detective investigates a crime that hasn't happened yet."
];

const FORMAT_OPTIONS: StoryFormat[] = [
    'Novel', 
    'Short Story', 
    'Screenplay', 
    'Comic Script', 
    'Webtoon', 
    'Children\'s Book', 
    'Educational Story'
];

const Onboarding: React.FC<OnboardingProps> = ({ onConfirm, isLoading, onCheckCredits, onDeductCredits, userTier = 'free' }) => {
  const [step, setStep] = useState<'INPUT' | 'CONFIG_REVIEW' | 'BLUEPRINT_REVIEW'>('INPUT');
  const [spark, setSpark] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { notify } = useNotify();
  
  // Proposed Config
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState('');
  const [chapterCount, setChapterCount] = useState(5);
  const [format, setFormat] = useState<StoryFormat>('Novel');

  // Proposed Blueprint
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [toc, setToc] = useState<Chapter[]>([]);

  // Load Draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('gerertales_onboarding_draft');
    if (savedDraft) {
        try {
            const draft = JSON.parse(savedDraft);
            if (draft.spark) setSpark(draft.spark);
            if (draft.title) setTitle(draft.title);
            if (draft.tone) setTone(draft.tone);
            if (draft.format) setFormat(draft.format);
            if (draft.chapterCount) setChapterCount(draft.chapterCount);
            if (draft.characters) setCharacters(draft.characters);
            if (draft.locations) setLocations(draft.locations);
            if (draft.toc) setToc(draft.toc);
            if (draft.step) setStep(draft.step);
        } catch (e) {
            console.warn("Failed to load onboarding draft", e);
        }
    }
  }, []);

  // Save Draft
  useEffect(() => {
    const draft = {
        spark, title, tone, format, chapterCount, characters, locations, toc, step
    };
    localStorage.setItem('gerertales_onboarding_draft', JSON.stringify(draft));
  }, [spark, title, tone, format, chapterCount, characters, locations, toc, step]);

  const clearDraft = () => {
      localStorage.removeItem('gerertales_onboarding_draft');
  };

  const handleInputSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (spark.trim() && !isAnalyzing && !isLoading) {
      if (!onCheckCredits()) return;

      setIsAnalyzing(true);
      try {
        const { data: analysis, cost } = await TextService.analyzeStoryConcept(spark, userTier);
        onDeductCredits(cost, "Idea Analysis");

        setTitle(analysis.title);
        setTone(analysis.tone);
        setChapterCount(analysis.recommendedChapters);
        setFormat(analysis.recommendedFormat);
        setStep('CONFIG_REVIEW');
      } catch (e) {
        console.error(e);
        notify("Could not analyze this spark. Please try again.", "error");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleGenerateBlueprint = async () => {
    if (!onCheckCredits()) return;

    setIsAnalyzing(true);
    try {
        const { data: architecture, cost } = await TextService.generateStoryArchitecture(
            spark,
            title,
            format,
            chapterCount,
            userTier
        );
        onDeductCredits(cost, "Blueprint Generation");
        
        setCharacters(architecture.characters);
        setLocations(architecture.locations);
        setToc(architecture.toc);
        setStep('BLUEPRINT_REVIEW');
    } catch (e) {
        console.error(e);
        notify("Failed to generate blueprint. Please try again.", "error");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleFinalSubmit = () => {
    clearDraft();
    onConfirm(
        { spark, title, tone, format, chapterCount },
        { characters, locations, toc }
    );
  };

  const handleRandom = () => {
    if (isLoading || isAnalyzing) return;
    const randomSpark = RANDOM_SPARKS[Math.floor(Math.random() * RANDOM_SPARKS.length)];
    setSpark(randomSpark);
  };

  const handleTour = () => {
      setSpark("A legendary chef in a floating city who loses their sense of taste right before a royal banquet.");
      setTitle("The Flavorless Feast");
      setTone("Whimsical yet high-stakes culinary drama");
      setFormat("Short Story");
      setChapterCount(3);
      setCharacters([
          { name: "Chef Zephyr", role: "Protagonist", trait: "Meticulous", description: "The premier chef of Aetheria." },
          { name: "Princess Luna", role: "Antagonist", trait: "Demanding", description: "The royal whose approval means life or exile." }
      ]);
      setToc([
          { chapter: 1, title: "The Vanishing Umami", content: "", summary: "Zephyr realizes his tongue has gone numb.", isCompleted: false },
          { chapter: 2, title: "Kitchen Chaos", content: "", summary: "Cooking by memory while avoiding the head waiter's suspicion.", isCompleted: false },
          { chapter: 3, title: "The Final Garnish", content: "", summary: "The banquet begins. A leap of faith in the final seasoning.", isCompleted: false }
      ]);
      setStep('BLUEPRINT_REVIEW');
  };

  // Editing handlers for Blueprint
  const updateCharacter = (idx: number, field: keyof Character, value: string) => {
      const newChars = [...characters];
      newChars[idx] = { ...newChars[idx], [field]: value };
      setCharacters(newChars);
  };

  const updateChapter = (idx: number, field: keyof Chapter, value: string) => {
      const newToc = [...toc];
      // @ts-ignore
      newToc[idx] = { ...newToc[idx], [field]: value };
      setToc(newToc);
  };
  
  const updateLocation = (idx: number, field: keyof Location, value: string) => {
      const newLocs = [...locations];
      newLocs[idx] = { ...newLocs[idx], [field]: value };
      setLocations(newLocs);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-dark-bg p-6 relative overflow-hidden text-text-main">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_10%,_#18181b_0%,_transparent_60%)] pointer-events-none opacity-40" />

      {/* Step Indicator */}
      <div className="absolute top-12 flex gap-3 z-20">
          {[
              { id: 'INPUT', label: 'Idea' },
              { id: 'CONFIG_REVIEW', label: 'Structure' },
              { id: 'BLUEPRINT_REVIEW', label: 'Blueprint' }
          ].map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step === s.id ? 'bg-cobalt w-6' : (idx < ['INPUT', 'CONFIG_REVIEW', 'BLUEPRINT_REVIEW'].indexOf(step) ? 'bg-zinc-600' : 'bg-zinc-800')}`} />
                  {step === s.id && <span className="text-[10px] uppercase tracking-widest font-bold text-cobalt animate-in fade-in slide-in-from-left-2">{s.label}</span>}
              </div>
          ))}
      </div>

      <div className="max-w-4xl w-full z-10 space-y-8">
        
        {step === 'INPUT' && (
            <div className="text-center space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-serif text-text-main font-medium tracking-tight">
                GérerTales
                </h1>
                
                <p className="text-text-muted font-sans text-lg tracking-wide">
                What is the <span className="text-cobalt font-serif italic">"What If"</span> on your mind?
                </p>

                <form onSubmit={handleInputSubmit} className="w-full relative group">
                <input
                    type="text"
                    value={spark}
                    onChange={(e) => setSpark(e.target.value)}
                    placeholder="A detective finds a clock that counts backwards..."
                    className="w-full bg-dark-surface/50 border-b-2 border-dark-border focus:border-cobalt outline-none py-4 px-2 text-xl md:text-2xl font-serif text-text-main placeholder-zinc-700 transition-all duration-300 text-center"
                    autoFocus
                    disabled={isAnalyzing || isLoading}
                />
                
                <div className="flex flex-col items-center gap-4 mt-12">
                    <button
                    type="submit"
                    disabled={!spark.trim() || isAnalyzing || isLoading}
                    className={`px-8 py-3 rounded-full text-sm font-sans font-medium tracking-widest uppercase transition-all duration-500 
                        ${isAnalyzing ? 'bg-zinc-800 text-zinc-500' : 'bg-text-main text-dark-bg hover:bg-cobalt hover:text-white shadow-lg shadow-cobalt/20 hover:shadow-xl hover:-translate-y-1'}`}
                    >
                    {isAnalyzing ? (
                        <span className="flex items-center gap-2">
                        <span>Analyzing...</span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                        </span>
                    ) : (
                        `Ignite`
                    )}
                    </button>

                    <div className="flex gap-6 mt-2">
                        <button
                            type="button"
                            onClick={handleRandom}
                            disabled={isAnalyzing || isLoading}
                            className="text-[10px] font-sans text-text-muted hover:text-cobalt transition-colors tracking-widest uppercase border-b border-transparent hover:border-cobalt pb-0.5"
                        >
                            Random Spark
                        </button>
                        <button
                            type="button"
                            onClick={handleTour}
                            disabled={isAnalyzing || isLoading}
                            className="text-[10px] font-sans text-cobalt hover:text-white transition-colors tracking-widest uppercase border-b border-transparent hover:border-white pb-0.5"
                        >
                            Sample Tour
                        </button>
                    </div>
                </div>
                </form>
            </div>
        )}

        {step === 'CONFIG_REVIEW' && (
             <div className="w-full max-w-2xl mx-auto bg-dark-surface border border-dark-border rounded-2xl p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                <div className="mb-8">
                    <h2 className="text-2xl font-serif text-text-main mb-1">Proposed Structure</h2>
                    <p className="text-text-muted text-sm font-sans">The Architect has outlined a potential container for your idea.</p>
                </div>

                <div className="space-y-6 mt-6">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Title</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-zinc-800/50 border border-dark-border rounded-lg p-3 text-lg font-serif text-text-main focus:border-cobalt outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Format</label>
                            <div className="relative">
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as StoryFormat)}
                                    className="w-full bg-zinc-800/50 border border-dark-border rounded-lg p-3 text-text-main focus:border-cobalt outline-none font-sans appearance-none pr-10"
                                >
                                    {FORMAT_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Chapters</label>
                            <input 
                                type="number" 
                                min="1"
                                max="20"
                                value={chapterCount}
                                onChange={(e) => setChapterCount(parseInt(e.target.value))}
                                className="w-full bg-zinc-800/50 border border-dark-border rounded-lg p-3 text-text-main focus:border-cobalt outline-none font-sans"
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Tone</label>
                            <input 
                                type="text" 
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-zinc-800/50 border border-dark-border rounded-lg p-3 text-text-main focus:border-cobalt outline-none font-sans"
                            />
                    </div>

                    <div className="pt-8 flex gap-4">
                        <button 
                            onClick={() => setStep('INPUT')}
                            className="flex-1 py-3 rounded-lg border border-dark-border text-zinc-500 hover:text-text-main hover:bg-zinc-800 transition-all text-sm font-medium tracking-wide"
                        >
                            Back
                        </button>
                         <button
                            onClick={handleGenerateBlueprint}
                            disabled={isAnalyzing}
                            className="flex-[2] bg-cobalt text-white py-3 rounded-lg font-medium text-sm tracking-wide shadow-lg shadow-cobalt/20 hover:bg-blue-500 transition-all flex justify-center items-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                 <span>Drafting...</span>
                                 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                                </>
                            ) : `Generate Blueprint`}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {step === 'BLUEPRINT_REVIEW' && (
             <div className="w-full bg-dark-surface border border-dark-border rounded-2xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 flex flex-col max-h-[85vh]">
                <div className="mb-6 border-b border-dark-border pb-6">
                    <h2 className="text-2xl font-serif text-text-main mb-1">Story Blueprint</h2>
                    <p className="text-text-muted text-sm font-sans italic">“The blueprint is not the building, but it determines the view.”</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-12 pr-4 no-scrollbar">
                    {/* Characters */}
                    <div className="space-y-4">
                         <div className="flex items-center justify-between sticky top-0 bg-dark-surface py-2 z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cobalt">Dramatis Personae</h3>
                            <button 
                                onClick={() => setCharacters([...characters, { name: '', role: '', trait: '', description: '' }])}
                                className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                + Add Character
                            </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {characters.map((char, idx) => (
                                <div key={idx} className="bg-zinc-800/30 border border-dark-border rounded-xl p-5 space-y-3 relative group/card">
                                    <button 
                                        onClick={() => setCharacters(characters.filter((_, i) => i !== idx))}
                                        className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <input 
                                        className="w-full bg-transparent font-serif font-bold text-text-main focus:outline-none border-b border-transparent focus:border-cobalt"
                                        value={char.name}
                                        onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                                        placeholder="Character Name"
                                    />
                                    <input 
                                        className="w-full bg-transparent text-xs text-cobalt/80 focus:outline-none border-b border-transparent focus:border-cobalt uppercase tracking-[0.1em] font-medium"
                                        value={char.role}
                                        onChange={(e) => updateCharacter(idx, 'role', e.target.value)}
                                        placeholder="Role (e.g. Protagonist)"
                                    />
                                     <textarea 
                                        className="w-full bg-transparent text-sm text-zinc-400 focus:outline-none border-b border-transparent focus:border-cobalt resize-none leading-relaxed"
                                        value={char.description || char.trait}
                                        onChange={(e) => updateCharacter(idx, 'description', e.target.value)}
                                        rows={2}
                                        placeholder="Brief description or personality traits..."
                                    />
                                </div>
                            ))}
                         </div>
                    </div>

                    {/* TOC */}
                    <div className="space-y-4">
                         <div className="flex items-center justify-between sticky top-0 bg-dark-surface py-2 z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cobalt">Narrative Arc (Scenes)</h3>
                         </div>
                         <div className="space-y-4">
                            {toc.map((chapter, idx) => (
                                <div key={idx} className="flex gap-6 items-start p-5 bg-zinc-800/10 border border-dark-border rounded-xl hover:border-zinc-700 transition-colors">
                                    <span className="text-zinc-600 font-mono text-xs pt-1 mt-1">{(idx + 1).toString().padStart(2, '0')}</span>
                                    <div className="flex-1 space-y-3">
                                         <input 
                                            className="w-full bg-transparent font-serif font-medium text-lg text-text-main focus:outline-none border-b border-transparent focus:border-cobalt"
                                            value={chapter.title}
                                            onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                                            placeholder="Scene Title"
                                        />
                                        <textarea 
                                            className="w-full bg-transparent text-sm text-zinc-400 focus:outline-none border-b border-transparent focus:border-cobalt resize-none leading-relaxed"
                                            value={chapter.summary}
                                            onChange={(e) => updateChapter(idx, 'summary', e.target.value)}
                                            rows={2}
                                            placeholder="What happens in this scene?"
                                        />
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-dark-border flex gap-4 mt-6">
                     <button 
                        onClick={() => setStep('CONFIG_REVIEW')}
                        className="flex-1 py-4 rounded-xl border border-dark-border text-zinc-500 hover:text-text-main hover:bg-zinc-800 transition-all text-sm font-medium tracking-wide"
                    >
                        Adjust Structure
                    </button>
                    <button
                        onClick={handleFinalSubmit}
                        disabled={isLoading}
                        className="flex-[2] bg-text-main text-dark-bg py-4 rounded-xl font-bold text-sm tracking-[0.1em] uppercase shadow-xl hover:bg-cobalt hover:text-white transition-all flex justify-center items-center gap-3 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <>
                                <span>Initialising Story</span>
                                <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"/>
                            </>
                        ) : (
                            <>
                                <span>Start Writing</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;

