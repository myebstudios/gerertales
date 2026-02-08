
import React, { useState } from 'react';
import { Character, Location, Chapter } from '../types';

interface ContextSidebarProps {
  characters: Character[];
  locations?: Location[];
  tone: string;
  toc?: Chapter[];
  activeChapterIndex?: number;
  onJumpToChapter?: (index: number) => void;
}

const ContextSidebar: React.FC<ContextSidebarProps> = ({ 
    characters, 
    locations = [], 
    tone, 
    toc = [],
    activeChapterIndex = 0,
    onJumpToChapter 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bible' | 'scenes'>('bible');

  return (
    <>
      {/* Sidebar Container */}
      <div 
          className={`absolute right-0 top-0 bottom-0 h-full bg-dark-surface/95 backdrop-blur-xl shadow-2xl transition-all duration-500 z-50 border-l border-dark-border flex
          ${isOpen ? 'w-80 translate-x-0' : 'w-12 translate-x-0'}`}
      >
          {/* Toggle Strip */}
          <button 
              onClick={() => setIsOpen(!isOpen)}
              className="w-12 h-full flex flex-col items-center pt-8 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors cursor-pointer border-r border-dark-border focus:outline-none"
              aria-label="Toggle Context Sidebar"
          >
              {/* Vertical Text */}
              <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-sans font-bold tracking-widest text-zinc-500 uppercase whitespace-nowrap mt-4">
                  {isOpen ? 'Close' : 'Story Bible & Scenes'}
              </div>
          </button>

          {/* Content Area */}
          <div className={`flex-1 h-full flex flex-col transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              
              {/* Tabs */}
              <div className="flex border-b border-dark-border">
                  <button 
                    onClick={() => setActiveTab('bible')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'bible' ? 'text-cobalt border-b-2 border-cobalt bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                      Bible
                  </button>
                  <button 
                    onClick={() => setActiveTab('scenes')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'scenes' ? 'text-cobalt border-b-2 border-cobalt bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                      Scenes
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                  
                  {activeTab === 'bible' && (
                      <div className="space-y-8">
                        {/* Tone */}
                        <div>
                            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Tone</h4>
                            <div className="text-sm font-serif italic text-zinc-300 bg-zinc-800/50 p-3 rounded-lg border border-dark-border/50">
                                {tone}
                            </div>
                        </div>

                        {/* Characters */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Dramatis Personae</h4>
                            {characters.map((char, idx) => (
                                <div key={idx} className="group relative pl-4 border-l-2 border-zinc-800 hover:border-cobalt transition-colors">
                                    <h5 className="text-sm font-medium text-text-main">{char.name}</h5>
                                    <p className="text-[10px] text-cobalt uppercase tracking-wide mb-1">{char.role}</p>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                                        {char.description || char.trait}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Locations */}
                        {locations.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Locations</h4>
                                {locations.map((loc, idx) => (
                                    <div key={idx} className="group relative pl-4 border-l-2 border-zinc-800 hover:border-cobalt transition-colors">
                                        <h5 className="text-sm font-medium text-text-main">{loc.name}</h5>
                                        <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-1">
                                            {loc.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                  )}

                  {activeTab === 'scenes' && (
                      <div className="space-y-1">
                           {toc.map((chapter, idx) => (
                               <button 
                                    key={chapter.chapter}
                                    onClick={() => onJumpToChapter && onJumpToChapter(idx)}
                                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group border border-transparent
                                    ${activeChapterIndex === idx ? 'bg-cobalt/10 border-cobalt/30' : 'hover:bg-zinc-800'}`}
                               >
                                   <div className="flex items-center gap-3 mb-1">
                                       <span className={`text-xs font-mono ${activeChapterIndex === idx ? 'text-cobalt' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                           {(idx + 1).toString().padStart(2, '0')}
                                       </span>
                                       <span className={`text-sm font-medium ${activeChapterIndex === idx ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'} truncate`}>
                                           {chapter.title}
                                       </span>
                                   </div>
                                   <p className={`text-xs line-clamp-2 ${activeChapterIndex === idx ? 'text-cobalt/80' : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                                       {chapter.summary}
                                   </p>
                               </button>
                           ))}
                      </div>
                  )}

              </div>
          </div>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default ContextSidebar;

