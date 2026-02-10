
import React, { useRef, useState, useMemo } from 'react';
import { Story, StoryFormat } from '../types';
import { supabaseService } from '../services/supabaseService';

interface StoryLibraryProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onCreateNew: () => void;
  onDeleteStory: (id: string, e: React.MouseEvent) => void;
  onImportStory: (file: File) => void;
  onBackupStory: (story: Story, e: React.MouseEvent) => void;
  isPublicView?: boolean;
  currentUserId?: string;
}

const FORMAT_OPTIONS: StoryFormat[] = [
    'Novel', 
    'Short Story', 
    'Screenplay', 
    'Comic Script', 
    'Webtoon', 
    'Children\'s Book', 
    'Educational Story'
];

interface StoryCardProps {
    story: Story;
    onSelect: (story: Story) => void;
    onBackup: (story: Story, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    currentUserId?: string;
}

const StoryCard: React.FC<StoryCardProps> = ({ story, onSelect, onBackup, onDelete, currentUserId }) => (
    <div
        onClick={() => onSelect(story)}
        className="group relative bg-dark-surface border border-dark-border rounded-3xl cursor-pointer hover:border-cobalt transition-all hover:shadow-[0_20px_50px_-12px_rgba(96,165,250,0.1)] flex flex-col h-full overflow-hidden"
    >
        {/* Cover Image Area */}
        <div className="aspect-[3/4.5] w-full bg-zinc-900 relative overflow-hidden">
            {story.coverImage ? (
                <img 
                    src={story.coverImage} 
                    alt={story.title} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-out"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center p-8 text-center" title={story.id}>
                    <span className="font-serif italic text-zinc-700 text-xl tracking-tighter">GérerTales</span>
                </div>
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

            {/* Chapter Badge */}
            <div className="absolute top-5 right-5 bg-white/10 backdrop-blur-xl text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-white/20 uppercase tracking-[0.15em]">
                {story.toc?.filter(c => c.content.length > 0).length || 0}/{story.toc?.length || 0} CH
            </div>

            {/* Social Stats Overlay */}
            {story.isPublic && (
                <div className="absolute top-5 left-5 flex gap-2">
                    <div className="bg-black/40 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        {story.likesCount || 0}
                    </div>
                    <div className="bg-black/40 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        {story.ratingAverage?.toFixed(1) || "0.0"}
                    </div>
                </div>
            )}
        </div>

        {/* Details */}
        <div className="p-6 flex-1 flex flex-col relative">
            <div className="absolute -top-12 left-6 right-6">
                <h3 className="text-xl font-serif text-white mb-2 group-hover:text-cobalt transition-colors line-clamp-2 leading-tight drop-shadow-md">
                {story.title}
                </h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    {story.format}
                </p>
            </div>

            <p className="text-xs text-text-muted line-clamp-3 mb-6 mt-8 font-sans leading-relaxed">
                {story.spark}
            </p>

            <div className="mt-auto flex items-center justify-between pt-6 border-t border-dark-border/50">
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                    {new Date(story.lastModified).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                </span>
                
                <div className="flex items-center gap-1">
                    {/* Backup Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onBackup(story, e); }}
                        className="text-zinc-600 hover:text-cobalt transition-colors p-2.5 rounded-xl hover:bg-zinc-800"
                        title="Export Tale"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </button>

                    {/* Delete Button (Owner Only) */}
                    {(!currentUserId || story.ownerId === currentUserId) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(story.id, e); }}
                            className="text-zinc-600 hover:text-red-500 transition-colors p-2.5 rounded-xl hover:bg-zinc-800"
                            title="Delete Tale"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const StoryLibrary: React.FC<StoryLibraryProps> = ({ 
  stories, 
  onSelectStory, 
  onCreateNew, 
  onDeleteStory,
  onImportStory,
  onBackupStory,
  isPublicView = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StoryFormat | 'All'>('All');
  const [publicStories, setPublicStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(isPublicView);

  React.useEffect(() => {
    if (isPublicView) {
        setIsLoading(true);
        supabaseService.getPublicStories()
            .then(setPublicStories)
            .finally(() => setIsLoading(false));
    }
  }, [isPublicView]);

  const displayStories = isPublicView ? publicStories : stories;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportStory(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sortedStories = useMemo(() => {
      return [...displayStories].sort((a, b) => b.lastModified - a.lastModified);
  }, [displayStories]);

  const filteredStories = useMemo(() => {
      return sortedStories.filter(s => {
          const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                              s.spark.toLowerCase().includes(search.toLowerCase());
          const matchesFilter = filter === 'All' || s.format === filter;
          return matchesSearch && matchesFilter;
      });
  }, [sortedStories, search, filter]);

  const collections = useMemo(() => {
    const map: Record<string, Story[]> = {};
    displayStories.forEach(s => {
      const name = s.collection || 'Uncategorized';
      if (!map[name]) map[name] = [];
      map[name].push(s);
    });
    return map;
  }, [displayStories]);

  const recentStories = useMemo(() => {
      return sortedStories.slice(0, 3);
  }, [sortedStories]);

  if (isLoading) return <div className="flex-1 flex items-center justify-center bg-dark-bg font-serif text-zinc-500 animate-pulse">Consulting the Archives...</div>

  return (
    <div className="flex-1 h-full bg-dark-bg p-8 md:p-12 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl font-serif text-text-main font-medium tracking-tight">
                {isPublicView ? "Library Explorer" : "Your Library"}
            </h1>
            <p className="text-text-muted mt-2 font-sans text-lg">
                {isPublicView ? "Discover the next era of storytelling." : "Resume your narratives or spark a new one."}
            </p>
          </div>
          {!isPublicView && (
            <div className="flex gap-4">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".gtale,.json"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-zinc-800 text-text-main border border-dark-border px-8 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-700 transition-all active:scale-95"
                >
                    Import
                </button>
                <button
                    onClick={onCreateNew}
                    className="bg-cobalt text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-blue-500 transition-all shadow-xl shadow-cobalt/20 hover:shadow-2xl hover:-translate-y-1 active:scale-95"
                >
                    + New Story
                </button>
            </div>
          )}
        </div>

        {displayStories.length > 0 && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input 
                            type="text"
                            placeholder="Search titles or sparks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-dark-surface border border-dark-border rounded-2xl py-4 pl-12 pr-4 text-sm font-sans focus:border-cobalt outline-none transition-all"
                        />
                    </div>
                    <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="bg-dark-surface border border-dark-border rounded-2xl px-6 py-4 text-sm font-sans focus:border-cobalt outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="All">All Formats</option>
                        {FORMAT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            </div>
        )}

        {/* Recently Opened (Only if no search/filter) */}
        {displayStories.length > 0 && search === '' && filter === 'All' && (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cobalt">
                        {isPublicView ? "Featured Works" : "Recently Opened"}
                    </h2>
                    <div className="h-px flex-1 bg-dark-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {recentStories.map(story => (
                        <div 
                            key={`recent-${story.id}`}
                            onClick={() => onSelectStory(story)}
                            className="group flex gap-4 bg-dark-surface border border-dark-border p-4 rounded-2xl cursor-pointer hover:border-cobalt transition-all hover:shadow-xl hover:shadow-cobalt/5"
                        >
                            <div className="w-20 aspect-[3/4] rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                                {story.coverImage ? (
                                    <img src={story.coverImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800" />
                                )}
                            </div>
                            <div className="flex flex-col justify-center overflow-hidden">
                                <h4 className="font-serif text-text-main group-hover:text-cobalt transition-colors truncate">{story.title}</h4>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{story.format}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-8">
            {displayStories.length > 0 && search === '' && filter === 'All' ? (
                Object.entries(collections).map(([name, collectionStories]) => (
                    <div key={name} className="space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{name}</h2>
                            <div className="h-px flex-1 bg-dark-border" />
                            <span className="text-[10px] font-bold text-zinc-600">{collectionStories.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                            {collectionStories.map((story) => (
                                <StoryCard 
                                    key={story.id} 
                                    story={story} 
                                    onSelect={onSelectStory} 
                                    onBackup={onBackupStory} 
                                    onDelete={onDeleteStory} 
                                />
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                filteredStories.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                        {filteredStories.map((story) => (
                            <StoryCard 
                                key={story.id} 
                                story={story} 
                                onSelect={onSelectStory} 
                                onBackup={onBackupStory} 
                                onDelete={onDeleteStory} 
                            />
                        ))}
                    </div>
                )
            )}

            {filteredStories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 border border-dashed border-dark-border rounded-[32px] bg-dark-surface/30">
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-8 text-zinc-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-serif text-text-main mb-3">No stories found</h3>
                    <p className="text-zinc-500 mb-12 max-w-sm text-center font-sans">
                        {stories.length === 0 ? "Your collection is currently empty. Ignite a new spark to begin your journey." : "No stories match your current search or filter."}
                    </p>
                    <div className="flex gap-6">
                        {stories.length === 0 ? (
                            <>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs text-zinc-400 font-bold uppercase tracking-widest hover:text-white transition-colors border-b border-zinc-700 hover:border-white pb-1"
                                >
                                    Import File
                                </button>
                                <button
                                    onClick={onCreateNew}
                                    className="text-xs text-cobalt font-bold uppercase tracking-widest hover:text-white transition-colors border-b border-cobalt hover:border-white pb-1"
                                >
                                    Start Writing
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => { setSearch(''); setFilter('All'); }}
                                className="text-xs text-cobalt font-bold uppercase tracking-widest hover:text-white transition-colors border-b border-cobalt hover:border-white pb-1"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StoryLibrary;
