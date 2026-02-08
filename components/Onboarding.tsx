
import React, { useState } from 'react';
import { StoryConfig, StoryFormat, Character, Chapter, Location, StoryBlueprintData } from '../types';
import * as GeminiService from '../services/geminiService';

interface OnboardingProps {
  onConfirm: (config: StoryConfig, blueprint: StoryBlueprintData) => void;
  isLoading: boolean;
  onCheckCredits: () => boolean;
  onDeductCredits: (cost: number, feature: string) => void;
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

const Onboarding: React.FC<OnboardingProps> = ({ onConfirm, isLoading, onCheckCredits, onDeductCredits }) => {
  const [step, setStep] = useState<'INPUT' | 'CONFIG_REVIEW' | 'BLUEPRINT_REVIEW'>('INPUT');
  const [spark, setSpark] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Proposed Config
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState('');
  const [chapterCount, setChapterCount] = useState(5);
  const [format, setFormat] = useState<StoryFormat>('Novel');

  // Proposed Blueprint
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [toc, setToc] = useState<Chapter[]>([]);

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (spark.trim() && !isAnalyzing && !isLoading) {
      if (!onCheckCredits()) return;

      setIsAnalyzing(true);
      try {
        const { data: analysis, cost } = await GeminiService.analyzeStoryConcept(spark);
        onDeductCredits(cost, "Idea Analysis");

        setTitle(analysis.title);
        setTone(analysis.tone);
        setChapterCount(analysis.recommendedChapters);
        setFormat(analysis.recommendedFormat);
        setStep('CONFIG_REVIEW');
      } catch (e) {
        console.error(e);
        alert("Could not analyze this spark. Please try again.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleGenerateBlueprint = async () => {
    if (!onCheckCredits()) return;

    setIsAnalyzing(true);
    try {
        const { data: architecture, cost } = await GeminiService.generateStoryArchitecture(
            spark,
            title,
            format,
            chapterCount
        );
        onDeductCredits(cost, "Blueprint Generation");
        
        setCharacters(architecture.characters);
        setLocations(architecture.locations);
        setToc(architecture.toc);
        setStep('BLUEPRINT_REVIEW');
    } catch (e) {
        console.error(e);
        alert("Failed to generate blueprint. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleFinalSubmit = () => {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg p-6 relative overflow-hidden text-text-main">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_10%,_#18181b_0%,_transparent_60%)] pointer-events-none opacity-40" />

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

                    <button
                    type="button"
                    onClick={handleRandom}
                    disabled={isAnalyzing || isLoading}
                    className="text-xs font-sans text-text-muted hover:text-cobalt transition-colors tracking-widest uppercase border-b border-transparent hover:border-cobalt pb-0.5"
                    >
                    Or Surprise Me
                    </button>
                </div>
                </form>
            </div>
        )}

        {/* ... (Other steps unchanged except button text removal of fixed credits) ... */}
        
        {step === 'CONFIG_REVIEW' && (
             <div className="w-full max-w-2xl mx-auto bg-dark-surface border border-dark-border rounded-2xl p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                <h2 className="text-2xl font-serif text-text-main mb-1">Proposed Structure</h2>
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
                    {/* ... Inputs ... */}
                    <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Format</label>
                            <select
                                value={format}
                                onChange={(e) => setFormat(e.target.value as StoryFormat)}
                                className="w-full bg-zinc-800/50 border border-dark-border rounded-lg p-3 text-text-main focus:border-cobalt outline-none font-sans appearance-none"
                            >
                                {FORMAT_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
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

                    <div className="pt-6 flex gap-4">
                        <button 
                            onClick={() => setStep('INPUT')}
                            className="flex-1 py-3 rounded-lg border border-dark-border text-zinc-400 hover:text-text-main hover:bg-zinc-800 transition-colors text-sm font-medium"
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
                <div className="mb-6 border-b border-dark-border pb-4">
                    <h2 className="text-2xl font-serif text-text-main mb-1">Story Blueprint</h2>
                    <p className="text-text-muted text-sm font-sans">Review and refine your story elements before writing begins.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-8 pr-2 no-scrollbar">
                    {/* Characters */}
                    <div className="space-y-4">
                         <h3 className="text-xs font-bold uppercase tracking-widest text-cobalt sticky top-0 bg-dark-surface py-2 z-10">Characters</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {characters.map((char, idx) => (
                                <div key={idx} className="bg-zinc-800/30 border border-dark-border rounded-xl p-4 space-y-2">
                                    <input 
                                        className="w-full bg-transparent font-serif font-bold text-text-main focus:outline-none border-b border-transparent focus:border-cobalt"
                                        value={char.name}
                                        onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                                        placeholder="Name"
                                    />
                                    <input 
                                        className="w-full bg-transparent text-xs text-zinc-400 focus:outline-none border-b border-transparent focus:border-cobalt uppercase tracking-wide"
                                        value={char.role}
                                        onChange={(e) => updateCharacter(idx, 'role', e.target.value)}
                                        placeholder="Role"
                                    />
                                     <textarea 
                                        className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none border-b border-transparent focus:border-cobalt resize-none"
                                        value={char.description || char.trait}
                                        onChange={(e) => updateCharacter(idx, 'description', e.target.value)}
                                        rows={2}
                                        placeholder="Description"
                                    />
                                </div>
                            ))}
                         </div>
                    </div>
                    {/* Locations, TOC - Unchanged structure, just context */}
                    <div className="space-y-4">
                         <h3 className="text-xs font-bold uppercase tracking-widest text-cobalt sticky top-0 bg-dark-surface py-2 z-10">Scenes</h3>
                         <div className="space-y-3">
                            {toc.map((chapter, idx) => (
                                <div key={idx} className="flex gap-4 items-start p-3 bg-zinc-800/20 border border-dark-border rounded-lg">
                                    <span className="text-zinc-500 font-mono text-sm pt-1">{(idx + 1).toString().padStart(2, '0')}</span>
                                    <div className="flex-1 space-y-1">
                                         <input 
                                            className="w-full bg-transparent font-serif font-medium text-text-main focus:outline-none border-b border-transparent focus:border-cobalt"
                                            value={chapter.title}
                                            onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                                        />
                                        <textarea 
                                            className="w-full bg-transparent text-sm text-zinc-400 focus:outline-none border-b border-transparent focus:border-cobalt resize-none"
                                            value={chapter.summary}
                                            onChange={(e) => updateChapter(idx, 'summary', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-dark-border flex gap-4 mt-6">
                     <button 
                        onClick={() => setStep('CONFIG_REVIEW')}
                        className="flex-1 py-3 rounded-lg border border-dark-border text-zinc-400 hover:text-text-main hover:bg-zinc-800 transition-colors text-sm font-medium"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleFinalSubmit}
                        disabled={isLoading}
                        className="flex-[2] bg-cobalt text-white py-3 rounded-lg font-medium text-sm tracking-wide shadow-lg shadow-cobalt/20 hover:bg-blue-500 transition-all flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <span>Initialising Story</span>
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                            </>
                        ) : "Confirm & Write"}
                    </button>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;

