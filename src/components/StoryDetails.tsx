import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Story, Chapter, Character, Location } from '../types';
import { supabaseService } from '../services/supabaseService';
import * as ImageService from '../services/imageService';
import { useNotify } from '../services/NotificationContext';
import { useStore } from '../services/store';

const StoryDetails: React.FC = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { notify } = useNotify();
    const { userProfile, deductCredits, setStories, stories } = useStore();
    
    const [story, setStory] = useState<Story | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'cast' | 'chapters'>('info');
    
    // UI State for Image Gen
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [generatingChapterIdx, setGeneratingChapterIdx] = useState<number | null>(null);

    useEffect(() => {
        if (storyId) {
            supabaseService.getStoryById(storyId).then(res => {
                if (res) setStory(res);
                setIsLoading(false);
            }).catch(() => setIsLoading(false));
        }
    }, [storyId]);

    const handleSave = async () => {
        if (!story || !userProfile?.id) return;
        setIsSaving(true);
        try {
            await supabaseService.saveStory(userProfile.id, story);
            notify("Tale metadata updated.");
            setStories(stories.map(s => s.id === story.id ? story : s));
        } catch (e) { notify("Failed to save changes."); } finally { setIsSaving(false); }
    };

    const handleRegenerateCover = async () => {
        if (!story || !userProfile?.id) return;
        if (userProfile.credits < 25) return notify("Insufficient credits for cover generation.");

        setIsGeneratingCover(true);
        try {
            const { url, cost } = await ImageService.generateCoverImage(story.title, story.tone, story.spark, userProfile.subscriptionTier);
            if (url) {
                const finalUrl = await supabaseService.uploadImage(userProfile.id, url, 'cover_regen.png');
                const updated = { ...story, coverImage: finalUrl };
                setStory(updated);
                await supabaseService.saveStory(userProfile.id, updated);
                const { data: { user } } = await supabaseService.getCurrentUser() as any;
                await deductCredits(user, cost, "Cover Regeneration");
                notify("New cover art generated.");
            }
        } catch (e) { console.error(e); } finally { setIsGeneratingCover(false); }
    };

    const handleRegenerateBanner = async (idx: number) => {
        if (!story || !userProfile?.id) return;
        if (userProfile.credits < 20) return notify("Insufficient credits for banner generation.");

        setGeneratingChapterIdx(idx);
        const chapter = story.toc[idx];
        try {
            const { url, cost } = await ImageService.generateChapterBanner(
                chapter.title,
                chapter.summary || "A new scene.",
                story.title,
                story.tone,
                userProfile.subscriptionTier
            );
            if (url) {
                const finalUrl = await supabaseService.uploadImage(userProfile.id, url, `banner_regen_${idx}.png`);
                const newToc = [...story.toc];
                newToc[idx] = { ...newToc[idx], bannerImage: finalUrl };
                const updated = { ...story, toc: newToc };
                setStory(updated);
                await supabaseService.saveStory(userProfile.id, updated);
                const { data: { user } } = await supabaseService.getCurrentUser() as any;
                await deductCredits(user, cost, "Banner Regeneration");
                notify(`Scene ${idx + 1} banner updated.`);
            }
        } catch (e) { console.error(e); } finally { setGeneratingChapterIdx(null); }
    };

    const togglePublish = async () => {
        if (!story || !userProfile?.id) return;
        const newState = !story.isPublic;
        const updated = { ...story, isPublic: newState, publishedAt: newState ? Date.now() : story.publishedAt };
        setStory(updated);
        try {
            await supabaseService.saveStory(userProfile.id, updated);
            notify(newState ? "Tale published to the library!" : "Tale moved to drafts.");
        } catch (e) {}
    };

    if (isLoading) return <div className="h-screen w-screen bg-dark-bg flex items-center justify-center font-serif text-text-muted animate-pulse">Consulting the Ledger...</div>;
    if (!story) return <div className="h-screen w-screen bg-dark-bg flex items-center justify-center font-serif text-text-muted">Tale not found.</div>;

    const isOwner = userProfile?.id === story.ownerId;

    return (
        <div className="flex-1 bg-dark-bg text-text-main font-sans overflow-y-auto no-scrollbar pb-32">
            {/* Header Hero */}
            <div className="relative h-[400px] w-full overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-black/60 z-10" />
                {story.coverImage ? (
                    <img src={story.coverImage} className="w-full h-full object-cover grayscale opacity-50" />
                ) : (
                    <div className="w-full h-full bg-zinc-900" />
                )}
                
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-8">
                    <div className="max-w-4xl space-y-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt px-4 py-1.5 rounded-full border border-cobalt/30 bg-cobalt/5">
                            {story.format}
                        </span>
                        <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tighter">{story.title}</h1>
                        <p className="text-zinc-400 font-serif italic text-lg max-w-2xl mx-auto line-clamp-2">"{story.spark}"</p>
                    </div>
                </div>

                <button 
                    onClick={() => navigate(-1)} 
                    className="absolute top-8 left-8 z-30 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Library
                </button>
            </div>

            <main className="max-w-7xl mx-auto px-8 -mt-12 relative z-30">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Sidebar Actions */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-dark-card border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8 sticky top-8">
                            <div className="aspect-[3/4.5] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-xl group relative">
                                {story.coverImage ? <img src={story.coverImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center italic text-zinc-800">No Cover</div>}
                                {isOwner && (
                                    <div className={`absolute inset-0 bg-black/60 transition-all flex items-center justify-center ${isGeneratingCover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button 
                                            onClick={handleRegenerateCover}
                                            disabled={isGeneratingCover}
                                            className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50"
                                        >
                                            {isGeneratingCover ? 'Generating...' : 'Regenerate Cover'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => navigate(`/writing/${story.id}`)} className="w-full py-4 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all shadow-xl shadow-white/5">Continue Writing</button>
                                <button onClick={() => navigate(`/read/${story.id}`)} className="w-full py-4 rounded-2xl bg-cobalt text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-cobalt/20">Enter Reading Mode</button>
                                {isOwner && (
                                    <button 
                                        onClick={togglePublish}
                                        className={`w-full py-4 rounded-2xl border text-[11px] font-black uppercase tracking-[0.2em] transition-all 
                                        ${story.isPublic ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/5' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5'}`}
                                    >
                                        {story.isPublic ? 'Move to Drafts' : 'Publish Tale'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Tabs */}
                        <div className="flex gap-8 border-b border-white/5">
                            {(['info', 'cast', 'chapters'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                    {tab}
                                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cobalt shadow-[0_0_10px_var(--color-cobalt)]" />}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'info' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                                <section className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">The Story Spark</label>
                                    <textarea readOnly={!isOwner} value={story.spark} onChange={(e) => setStory({...story, spark: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg font-serif italic text-zinc-300 leading-relaxed outline-none focus:border-cobalt transition-all resize-none min-h-[120px]" />
                                </section>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tale Title</label>
                                        <input readOnly={!isOwner} value={story.title} onChange={(e) => setStory({...story, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-cobalt" />
                                    </section>
                                    <section className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Atmosphere / Tone</label>
                                        <input readOnly={!isOwner} value={story.tone} onChange={(e) => setStory({...story, tone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-cobalt" />
                                    </section>
                                </div>
                                {isOwner && <button onClick={handleSave} disabled={isSaving} className="bg-zinc-800 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all disabled:opacity-50">{isSaving ? 'Syncing...' : 'Save Metadata Changes'}</button>}
                            </div>
                        )}

                        {activeTab === 'cast' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                                <section className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Dramatis Personae</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {story.characters.map((char, i) => (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-xl font-serif text-white">{char.name}</h4>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-cobalt bg-cobalt/10 px-2 py-1 rounded">{char.role}</span>
                                                </div>
                                                <p className="text-sm text-zinc-400 font-serif italic">"{char.trait}"</p>
                                                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{char.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'chapters' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                {story.toc.map((ch, i) => (
                                    <div key={i} className="group bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:border-cobalt/30 transition-all flex flex-col md:flex-row gap-8 items-start">
                                        <div className="w-full md:w-48 aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0 relative">
                                            {ch.bannerImage ? <img src={ch.bannerImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800 italic text-[10px]">No Banner</div>}
                                            {isOwner && (
                                                <div className={`absolute inset-0 bg-black/60 transition-all flex items-center justify-center ${generatingChapterIdx === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <button 
                                                        onClick={() => handleRegenerateBanner(i)}
                                                        disabled={generatingChapterIdx !== null}
                                                        className="text-[8px] font-black uppercase tracking-widest text-white border border-white/20 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                                                    >
                                                        {generatingChapterIdx === i ? 'Generating...' : 'Regen Banner'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-2xl font-serif text-white">{ch.title}</h4>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Chapter {ch.chapter}</span>
                                            </div>
                                            <p className="text-sm text-zinc-500 italic font-serif leading-relaxed line-clamp-2">"{ch.summary}"</p>
                                            <div className="pt-6 flex gap-6">
                                                <button onClick={() => navigate(`/writing/${story.id}`)} className="text-[10px] font-black uppercase tracking-widest text-cobalt hover:text-white">Edit Prose</button>
                                                <button onClick={() => navigate(`/read/${story.id}`)} className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white">Preview Reader</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StoryDetails;
