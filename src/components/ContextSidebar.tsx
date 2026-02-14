
import React, { useState } from 'react';
import { Character, Location, Chapter } from '../types';

interface ContextSidebarProps {
  characters: Character[];
  locations?: Location[];
  tone: string;
  toc?: Chapter[];
  activeChapterIndex?: number;
  onJumpToChapter?: (index: number) => void;
  onUpdateCharacter?: (index: number, updates: Partial<Character>) => void;
  onUpdateLocation?: (index: number, updates: Partial<Location>) => void;
  onUpdateTone?: (tone: string) => void;
}

const ContextSidebar: React.FC<ContextSidebarProps> = ({ 
    characters, 
    locations = [], 
    tone, 
    toc = [],
    activeChapterIndex = 0,
    onJumpToChapter,
    onUpdateCharacter,
    onUpdateLocation,
    onUpdateTone
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bible' | 'scenes' | 'mood'>('bible');
  const [editingItem, setEditingItem] = useState<{type: 'char' | 'loc' | 'tone', index: number} | null>(null);

  return (
    <>
      {/* Sidebar Container */}
      <div 
          className={`fixed md:absolute right-0 top-0 bottom-0 h-full bg-dark-surface/95 backdrop-blur-2xl shadow-2xl transition-all duration-700 z-50 border-l border-white/5 flex
          ${isOpen ? 'w-80 md:w-96 translate-x-0' : 'w-0 md:w-12 translate-x-full md:translate-x-0'}`}
      >
          {/* Toggle Strip */}
          <button 
              onClick={() => setIsOpen(!isOpen)}
              className="hidden md:flex w-12 h-full flex-col items-center pt-12 bg-zinc-900/30 hover:bg-zinc-800/50 transition-all cursor-pointer border-r border-white/5 focus:outline-none group"
              aria-label="Toggle Context Sidebar"
          >
              <div className="flex flex-col items-center gap-8">
                  <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-zinc-500 group-hover:text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                  </div>
                  <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black tracking-[0.3em] text-zinc-600 uppercase whitespace-nowrap group-hover:text-zinc-400 transition-colors">
                      {isOpen ? 'Collapse Workspace' : 'Story Bible & Scenes'}
                  </div>
              </div>
          </button>

          {/* Mobile Toggle (only if closed) */}
          {!isOpen && (
              <button 
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-cobalt text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </button>
          )}

          {/* Content Area */}
          <div className={`flex-1 h-full flex flex-col transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Workspace</h2>
                  <button onClick={() => setIsOpen(false)} className="md:hidden text-zinc-500 hover:text-white">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              </div>

              {/* Tabs */}
              <div className="flex px-4 pt-4">
                  {[
                      { id: 'bible', label: 'Bible', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
                      { id: 'scenes', label: 'Scenes', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                      { id: 'mood', label: 'Mood', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }
                  ].map((tab) => (
                      <button 
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setEditingItem(null); }}
                        className={`flex-1 flex flex-col items-center gap-2 py-3 transition-all relative border-b-2 
                        ${activeTab === tab.id ? 'text-cobalt border-cobalt bg-cobalt/5 rounded-t-xl' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                          </svg>
                          <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                      </button>
                  ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                  
                  {activeTab === 'bible' && (
                      <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Tone */}
                        <div className="group">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Tone & Atmosphere</h4>
                                <button className="opacity-0 group-hover:opacity-100 text-[10px] text-cobalt uppercase font-bold transition-all">Edit</button>
                            </div>
                            <div className="text-sm font-serif italic text-zinc-300 bg-zinc-900/50 p-4 rounded-xl border border-white/5 leading-relaxed">
                                {tone}
                            </div>
                        </div>

                        {/* Characters */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Dramatis Personae</h4>
                                <button className="text-[10px] text-cobalt uppercase font-bold hover:text-white transition-colors">Add</button>
                            </div>
                            {characters.map((char, idx) => (
                                <div key={idx} className="group relative pl-5 border-l-2 border-zinc-800 hover:border-cobalt transition-all py-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h5 className="text-sm font-serif font-bold text-text-main">{char.name}</h5>
                                        <button className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-600 hover:text-cobalt transition-all">Edit</button>
                                    </div>
                                    <p className="text-[10px] text-cobalt font-black uppercase tracking-[0.1em] mb-2">{char.role}</p>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-sans line-clamp-3 group-hover:line-clamp-none transition-all">
                                        {char.description || char.trait}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Locations */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">World Atlas</h4>
                            </div>
                            {locations.length > 0 ? locations.map((loc, idx) => (
                                <div key={idx} className="group relative pl-5 border-l-2 border-zinc-800 hover:border-cobalt transition-all py-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h5 className="text-sm font-serif font-bold text-text-main">{loc.name}</h5>
                                        <button className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-600 hover:text-cobalt transition-all">Edit</button>
                                    </div>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-sans mt-2 line-clamp-3 group-hover:line-clamp-none transition-all">
                                        {loc.description}
                                    </p>
                                </div>
                            )) : (
                                <div className="text-[10px] italic text-zinc-700 font-serif">No locations mapped yet.</div>
                            )}
                        </div>
                      </div>
                  )}

                  {activeTab === 'scenes' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-500">
                           {toc.map((chapter, idx) => (
                               <button 
                                    key={chapter.chapter}
                                    onClick={() => onJumpToChapter && onJumpToChapter(idx)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group border
                                    ${activeChapterIndex === idx ? 'bg-cobalt/10 border-cobalt/30 shadow-lg shadow-cobalt/5' : 'border-transparent hover:bg-zinc-800/50 hover:border-white/5'}`}
                               >
                                   <div className="flex items-center gap-4 mb-2">
                                       <span className={`text-[10px] font-mono font-black ${activeChapterIndex === idx ? 'text-cobalt' : 'text-zinc-700 group-hover:text-zinc-500'}`}>
                                           {(idx + 1).toString().padStart(2, '0')}
                                       </span>
                                       <span className={`text-sm font-serif font-bold ${activeChapterIndex === idx ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'} truncate`}>
                                           {chapter.title}
                                       </span>
                                   </div>
                                   <p className={`text-[11px] leading-relaxed line-clamp-2 ${activeChapterIndex === idx ? 'text-cobalt/70' : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                                       {chapter.summary}
                                   </p>
                               </button>
                           ))}
                      </div>
                  )}

                  {activeTab === 'mood' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="p-6 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30 text-center">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-serif font-bold text-text-main mb-2">AI Moodboard</h3>
                                <p className="text-[10px] text-zinc-500 font-sans leading-relaxed mb-6">Visual inspirations generated from your story’s tone and context.</p>
                                <button className="bg-cobalt text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full hover:bg-blue-500 transition-all shadow-lg shadow-cobalt/20 active:scale-95">Generate Mood</button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              {/* Placeholder for mood images */}
                              {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="aspect-square bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden relative group">
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                      <div className="absolute bottom-3 left-3 text-[8px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">Inspiration {i}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

              </div>

              {/* Footer / Context Info */}
              <div className="p-6 border-t border-white/5 bg-zinc-900/30">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-600">
                      <span>Refining Tale...</span>
                      <span className="text-cobalt">v2.0 Beta</span>
                  </div>
              </div>
          </div>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default ContextSidebar;
