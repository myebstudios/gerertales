
import React, { useState } from 'react';
import { Story } from '../types';

interface StoryBibleProps {
    story: Story;
}

type BibleTab = 'characters' | 'world' | 'chapters';

const StoryBible: React.FC<StoryBibleProps> = ({ story }) => {
    const [activeTab, setActiveTab] = useState<BibleTab>('characters');

    return (
        <div className="flex flex-col h-full bg-dark-bg text-text-main">
            {/* Tab Header */}
            <div className="flex border-b border-dark-border">
                <button
                    onClick={() => setActiveTab('characters')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'characters'
                            ? 'text-accent-primary border-b-2 border-accent-primary bg-dark-surface'
                            : 'text-text-muted hover:text-text-main hover:bg-dark-surface/50'
                        }`}
                >
                    Dramatis Personae
                </button>
                <button
                    onClick={() => setActiveTab('world')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'world'
                            ? 'text-accent-primary border-b-2 border-accent-primary bg-dark-surface'
                            : 'text-text-muted hover:text-text-main hover:bg-dark-surface/50'
                        }`}
                >
                    World Atlas
                </button>
                <button
                    onClick={() => setActiveTab('chapters')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'chapters'
                            ? 'text-accent-primary border-b-2 border-accent-primary bg-dark-surface'
                            : 'text-text-muted hover:text-text-main hover:bg-dark-surface/50'
                        }`}
                >
                    Narrative Arc
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {activeTab === 'characters' && (
                    <div className="space-y-4">
                        {story.characters.length === 0 ? (
                            <div className="text-center text-text-muted py-12">
                                <p className="font-serif italic">No characters yet.</p>
                                <p className="text-sm mt-2">Characters will appear as the story develops.</p>
                            </div>
                        ) : (
                            story.characters.map((char, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-dark-surface border border-dark-border hover:border-accent-primary/30 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-serif text-lg text-text-main font-semibold">{char.name}</h3>
                                        <span className="text-xs px-2 py-1 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                                            {char.role}
                                        </span>
                                    </div>
                                    <p className="text-sm text-accent-secondary italic mb-2">{char.trait}</p>
                                    {char.description && (
                                        <p className="text-sm text-text-muted leading-relaxed">{char.description}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'world' && (
                    <div className="space-y-4">
                        {story.locations.length === 0 ? (
                            <div className="text-center text-text-muted py-12">
                                <p className="font-serif italic">No locations yet.</p>
                                <p className="text-sm mt-2">The world will expand as the story unfolds.</p>
                            </div>
                        ) : (
                            story.locations.map((loc, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-dark-surface border border-dark-border hover:border-accent-secondary/30 transition-all"
                                >
                                    <h3 className="font-serif text-lg text-text-main font-semibold mb-2 flex items-center gap-2">
                                        <span className="text-accent-secondary">📍</span>
                                        {loc.name}
                                    </h3>
                                    <p className="text-sm text-text-muted leading-relaxed">{loc.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'chapters' && (
                    <div className="space-y-3">
                        {story.toc.map((chapter, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border transition-all ${chapter.isCompleted
                                        ? 'bg-dark-surface border-green-500/30 hover:border-green-500/50'
                                        : idx === story.activeChapterIndex
                                            ? 'bg-accent-primary/5 border-accent-primary hover:border-accent-primary'
                                            : 'bg-dark-surface/50 border-dark-border hover:border-dark-border/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-serif text-base text-text-main font-semibold">
                                        {chapter.chapter}. {chapter.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {chapter.isCompleted && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                                ✓ Complete
                                            </span>
                                        )}
                                        {idx === story.activeChapterIndex && !chapter.isCompleted && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                                                In Progress
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {chapter.summary && (
                                    <p className="text-sm text-text-muted leading-relaxed">{chapter.summary}</p>
                                )}
                                {chapter.content && (
                                    <div className="mt-2 pt-2 border-t border-dark-border/50">
                                        <p className="text-xs text-text-muted">
                                            {chapter.content.split(' ').length} words written
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryBible;
