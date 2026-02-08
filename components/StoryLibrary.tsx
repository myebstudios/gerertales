import React, { useRef } from 'react';
import { Story } from '../types';

interface StoryLibraryProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onCreateNew: () => void;
  onDeleteStory: (id: string, e: React.MouseEvent) => void;
  onImportStory: (file: File) => void;
  onBackupStory: (story: Story, e: React.MouseEvent) => void;
}

const StoryLibrary: React.FC<StoryLibraryProps> = ({ 
  stories, 
  onSelectStory, 
  onCreateNew, 
  onDeleteStory,
  onImportStory,
  onBackupStory
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportStory(e.target.files[0]);
    }
    // Reset file input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 h-full bg-dark-bg p-8 md:p-12 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-serif text-text-main font-medium">Your Library</h1>
            <p className="text-text-muted mt-2 font-sans">Resume your narratives or spark a new one.</p>
          </div>
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
                className="bg-zinc-800 text-text-main border border-dark-border px-6 py-3 rounded-full text-sm font-semibold hover:bg-zinc-700 transition-all"
             >
                Import
             </button>
             <button
                onClick={onCreateNew}
                className="bg-text-main text-dark-bg px-6 py-3 rounded-full text-sm font-semibold hover:bg-cobalt hover:text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
             >
                + New Story
             </button>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-dark-border rounded-3xl bg-dark-surface/30">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-zinc-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
            </div>
            <h3 className="text-xl font-serif text-text-main mb-2">The shelves are empty</h3>
            <p className="text-zinc-500 mb-8">Ignite a spark or import a tale to begin.</p>
            <div className="flex gap-4">
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   className="text-zinc-400 border-b border-zinc-600 pb-0.5 hover:text-white hover:border-white transition-colors text-sm uppercase tracking-widest"
                >
                  Import
                </button>
                <button
                   onClick={onCreateNew}
                   className="text-cobalt border-b border-cobalt pb-0.5 hover:text-white hover:border-white transition-colors text-sm uppercase tracking-widest"
                >
                  Start Writing
                </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {stories.map((story) => (
              <div
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="group relative bg-dark-surface border border-dark-border rounded-xl cursor-pointer hover:border-cobalt transition-all hover:shadow-2xl hover:shadow-cobalt/5 flex flex-col h-full overflow-hidden"
              >
                {/* Cover Image Area */}
                <div className="aspect-[3/4] w-full bg-zinc-900 relative overflow-hidden">
                    {story.coverImage ? (
                        <img 
                            src={story.coverImage} 
                            alt={story.title} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center p-6 text-center">
                            <span className="font-serif italic text-zinc-700 text-lg">No Cover</span>
                        </div>
                    )}
                    
                    {/* Chapter Badge */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                         {story.toc.filter(c => c.content.length > 0).length}/{story.toc.length} CH
                    </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-serif text-text-main mb-2 group-hover:text-cobalt transition-colors line-clamp-2 leading-tight">
                    {story.title}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2 mb-4">
                    {story.spark}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-dark-border/50">
                         <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                            {new Date(story.lastModified).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                         </span>
                         
                         <div className="flex items-center gap-2">
                            {/* Backup Button */}
                            <button
                                onClick={(e) => onBackupStory(story, e)}
                                className="text-zinc-600 hover:text-cobalt transition-colors p-2 rounded-full hover:bg-zinc-800"
                                title="Backup Story (.gtale)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            </button>

                            {/* Delete Button */}
                             <button
                                onClick={(e) => onDeleteStory(story.id, e)}
                                className="text-zinc-600 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-zinc-800"
                                title="Delete Story"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                         </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryLibrary;
