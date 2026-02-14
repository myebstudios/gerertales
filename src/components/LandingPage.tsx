
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Story } from '../types';
import { supabaseService } from '../services/supabaseService';

interface LandingPageProps {
    user: User | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ user }) => {
    const [previewStories, setPreviewStories] = useState<Story[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        supabaseService.getPublicStories().then(stories => {
            setPreviewStories(stories.slice(0, 4));
        });
    }, []);

    return (
        <div className="min-h-screen bg-dark-bg text-text-main font-sans selection:bg-cobalt selection:text-white overflow-x-hidden w-full no-scrollbar">
            {/* Minimal Global Nav */}
            <nav className="fixed top-0 w-full z-50 px-8 py-6 flex items-center justify-between backdrop-blur-xl bg-dark-bg/40 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cobalt rounded-lg flex items-center justify-center shadow-lg shadow-cobalt/20 text-white">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M11.25 4.533A9.707 9.707 0 006 3.75c-4.553 0-8.25 3.697-8.25 8.25s3.697 8.25 8.25 8.25a9.768 9.768 0 004.586-1.166 9.768 9.768 0 004.586 1.166c4.553 0 8.25-3.697 8.25-8.25s-3.697-8.25-8.25-8.25a9.707 9.707 0 00-5.25.783zM12 21.75H6a8.25 8.25 0 01-5.322-14.706C2.079 12.31 6.545 16.29 11.25 16.5v5.25z" />
                        </svg>
                    </div>
                    <span className="font-serif text-xl tracking-tighter font-medium text-white">GérerTales</span>
                </div>
                <div className="flex items-center gap-8">
                    <Link to="/discover" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Public Library</Link>
                    {user ? (
                        <Link to="/library" className="bg-cobalt text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-cobalt/10 ring-1 ring-cobalt/30">
                            The Studio
                        </Link>
                    ) : (
                        <>
                            <Link to="/auth" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Sign In</Link>
                            <Link to="/auth" className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">Get Started</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Cinematic Hero */}
            <main className="relative pt-60 pb-40 px-8">
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-16">
                    <div className="space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-2.5 rounded-full backdrop-blur-xl">
                            <span className="w-1.5 h-1.5 bg-cobalt rounded-full animate-pulse shadow-[0_0_8px_var(--color-cobalt)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">The Future of Editorial Intelligence</span>
                        </div>
                        <h1 className="text-7xl md:text-9xl font-serif leading-[0.9] tracking-tighter text-white">
                            Turn sparks <br/> into <span className="italic font-normal text-zinc-600">masterpieces.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-500 font-sans leading-relaxed max-w-3xl mx-auto">
                            GérerTales is the world's most sophisticated AI co-writing studio. Designed for serious storytellers who demand architectural precision and literary depth.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                        <Link to="/auth" className="bg-cobalt text-white px-16 py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-2xl shadow-cobalt/20 hover:-translate-y-1 active:scale-95">
                            Initialise Anthology
                        </Link>
                        <Link to="/discover" className="border border-white/10 text-white px-16 py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all">
                            Browse the Archives
                        </Link>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="pt-20 opacity-20 animate-bounce">
                        <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </div>
                </div>
                
                {/* Background Blobs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-cobalt/10 blur-[160px] rounded-full -z-10 pointer-events-none" />
            </main>

            {/* The Library Explorer (Top Stories) */}
            <section className="py-40 px-8 bg-zinc-950/40 relative border-y border-white/5">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cobalt">Curated Masterpieces</span>
                            <h2 className="text-5xl font-serif text-white tracking-tight">The Library Explorer.</h2>
                            <p className="text-zinc-500 text-lg max-w-xl">Deep narratives from our most visionary architects. Read, rate, and collect the future of literature.</p>
                        </div>
                        <Link to="/discover" className="text-[10px] font-black uppercase tracking-[0.3em] text-white hover:text-cobalt transition-colors flex items-center gap-3 group">
                            Full Catalog <span className="group-hover:translate-x-2 transition-transform">→</span>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                        {previewStories.map((story, i) => (
                            <div 
                                key={story.id} 
                                onClick={() => navigate(`/details/${story.id}`)}
                                className="group relative aspect-[3/4.5] bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-700 hover:scale-[1.03] hover:border-cobalt/40 shadow-2xl cursor-pointer"
                            >
                                {story.coverImage ? (
                                    <img src={story.coverImage} className="absolute inset-0 w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000 scale-110 group-hover:scale-100" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                                <div className="absolute bottom-10 left-10 right-10 z-20 space-y-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-cobalt">{story.format}</span>
                                        <h4 className="text-2xl font-serif text-white leading-tight">{story.title}</h4>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity delay-200">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-3 h-3 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                            <span className="text-[10px] font-black text-white">{story.likesCount || 0}</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Read Now</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Neural Capabilities Grid */}
            <section className="py-48 px-8 max-w-7xl mx-auto space-y-40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-center">
                    <div className="lg:col-span-5 space-y-10 order-2 lg:order-1">
                        <div className="space-y-6">
                            <h2 className="text-6xl font-serif text-white tracking-tighter leading-[0.95]">Architectural <br/> Storytelling.</h2>
                            <p className="text-zinc-500 text-xl font-sans leading-relaxed">GérerTales doesn't just write; it builds. We believe great stories require solid foundations.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-8">
                            <CapabilityItem 
                                title="World Atlas" 
                                desc="Map your settings with geographic and atmospheric consistency."
                            />
                            <CapabilityItem 
                                title="Neural Persona" 
                                desc="Characters that evolve based on their traits, memory, and interactions."
                            />
                            <CapabilityItem 
                                title="TOC Blueprinting" 
                                desc="Plan every movement of your narrative before the first draft."
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-7 aspect-[16/10] bg-zinc-900 border border-white/5 rounded-[3rem] p-12 relative overflow-hidden order-1 lg:order-2 shadow-inner">
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(96,165,250,0.05)_0%,_transparent_70%)]" />
                         <div className="w-full h-full border border-white/5 rounded-2xl flex flex-col justify-center p-12 space-y-8">
                             <div className="h-1.5 w-40 bg-zinc-800 rounded-full" />
                             <div className="space-y-3">
                                 <div className="h-4 w-full bg-cobalt/10 rounded-full" />
                                 <div className="h-4 w-4/5 bg-cobalt/10 rounded-full" />
                                 <div className="h-4 w-3/5 bg-cobalt/20 rounded-full" />
                             </div>
                             <div className="h-1.5 w-60 bg-zinc-800 rounded-full" />
                         </div>
                    </div>
                </div>
            </section>

            {/* Insightful Section: The Methodology */}
            <section className="py-48 px-8 bg-black">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-20">
                    <div className="space-y-6">
                        <span className="text-6xl font-serif text-zinc-900">01.</span>
                        <h3 className="text-2xl font-serif text-white">The Spark</h3>
                        <p className="text-zinc-500 leading-relaxed font-sans">Our engine analyzes your initial prompt to determine optimal structure, recommended word count, and a custom narrative atmosphere.</p>
                    </div>
                    <div className="space-y-6">
                        <span className="text-6xl font-serif text-zinc-900">02.</span>
                        <h3 className="text-2xl font-serif text-white">The Blueprint</h3>
                        <p className="text-zinc-500 leading-relaxed font-sans">Collaborate with the AI architect to design a complete Table of Contents, character arcs, and world rules before writing.</p>
                    </div>
                    <div className="space-y-6">
                        <span className="text-6xl font-serif text-zinc-900">03.</span>
                        <h3 className="text-2xl font-serif text-white">The Prose</h3>
                        <p className="text-zinc-500 leading-relaxed font-sans">Draft in a distraction-free studio with high-end typography and real-time AI assistance for descriptive expansion.</p>
                    </div>
                </div>
            </section>

            {/* Pricing Section (Clean & Premium) */}
            <section className="py-48 px-8 max-w-7xl mx-auto space-y-32">
                <div className="text-center space-y-6">
                    <h2 className="text-6xl font-serif text-white tracking-tighter">A plan for every architect.</h2>
                    <p className="text-zinc-500 text-xl font-sans">Choose your entry into the future of editorial work.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
                    <PlanCard 
                        name="Writer" 
                        price="$0" 
                        features={["50 Starting Credits", "Standard xAI Engine", "Public Library Access"]}
                    />
                    <PlanCard 
                        name="Author" 
                        price="$12" 
                        features={["500 Monthly Credits", "Grok-2 Premium Access", "Private Anthologies", "Priority Rendering"]}
                        featured
                    />
                    <PlanCard 
                        name="Studio" 
                        price="$29" 
                        features={["1200 Monthly Credits", "Custom Voice Engine", "Advanced World-Building", "Bespoke Personas"]}
                    />
                </div>
            </section>

            {/* Massive CTA Footer */}
            <footer className="py-64 px-8 text-center bg-dark-card border-t border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-cobalt to-transparent opacity-30" />
                <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <h2 className="text-7xl md:text-9xl font-serif text-white tracking-tighter">Your anthology <br/> awaits.</h2>
                    <Link to="/auth" className="inline-block bg-white text-black px-20 py-8 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_30px_60px_rgba(255,255,255,0.1)]">
                        Initialise Studio
                    </Link>
                    <div className="pt-32 space-y-8 opacity-20">
                        <div className="h-px w-32 bg-white mx-auto" />
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.6em]">© 2026 GérerTales Editorial Studio · Cameroonian Neural Heritage</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const CapabilityItem = ({ title, desc }: { title: string, desc: string }) => (
    <div className="space-y-2 border-l-2 border-white/5 pl-8 hover:border-cobalt transition-colors duration-500 py-2">
        <h4 className="text-xl font-serif text-white">{title}</h4>
        <p className="text-sm text-zinc-500 font-sans leading-relaxed">{desc}</p>
    </div>
);

const PlanCard = ({ name, price, features, featured }: { name: string, price: string, features: string[], featured?: boolean }) => (
    <div className={`p-12 rounded-[3rem] border flex flex-col space-y-12 transition-all duration-700 ${featured ? 'bg-zinc-900 border-cobalt shadow-[0_0_80px_rgba(96,165,250,0.1)] scale-105 relative z-10' : 'bg-dark-surface border-white/5 hover:border-white/10'}`}>
        <div className="space-y-4">
            <h3 className="text-2xl font-serif text-white">{name}</h3>
            <div className="flex items-baseline gap-1">
                <span className="text-6xl font-serif text-white">{price}</span>
                <span className="text-xs text-zinc-600 font-black uppercase tracking-widest">/ month</span>
            </div>
        </div>
        <ul className="space-y-5 flex-1">
            {features.map(f => (
                <li key={f} className="flex items-center gap-4 text-sm text-zinc-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${featured ? 'bg-cobalt' : 'bg-zinc-700'}`} />
                    {f}
                </li>
            ))}
        </ul>
        <Link to="/auth" className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all text-center ${featured ? 'bg-cobalt text-white shadow-xl shadow-cobalt/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
            Select Plan
        </Link>
    </div>
);

export default LandingPage;
