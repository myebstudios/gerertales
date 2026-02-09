
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface LandingPageProps {
    user: User | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ user }) => {
    return (
        <div className="min-h-screen bg-dark-bg text-text-main font-sans selection:bg-cobalt selection:text-white overflow-x-hidden w-full">
            {/* Nav */}
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
                    <Link to="/discover" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Library Explorer</Link>
                    {user ? (
                        <Link to="/library" className="bg-cobalt text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-cobalt/10 ring-1 ring-cobalt/30">
                            GererTales Studio
                        </Link>
                    ) : (
                        <>
                            <Link to="/auth" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Sign In</Link>
                            <Link to="/auth" className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">Get Started</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative pt-48 pb-32 px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
                    <div className="lg:col-span-7 space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                                <span className="w-1.5 h-1.5 bg-cobalt rounded-full animate-pulse shadow-[0_0_8px_var(--color-cobalt)]" />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Powered by Gemini 3.0 Flash</span>
                            </div>
                            <h1 className="text-7xl md:text-9xl font-serif leading-[0.95] tracking-tighter text-white">
                                Design your <br/> next <span className="italic text-zinc-600 font-normal">legacy.</span>
                            </h1>
                            <p className="text-xl text-zinc-500 font-sans leading-relaxed max-w-xl">
                                GérerTales is a high-end editorial studio where human creativity meets neural intelligence. Architect your world, draft your prose, and organize your collection in a workspace designed for masters.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 pt-4">
                            <Link to="/auth" className="bg-cobalt text-white px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-2xl shadow-cobalt/20 hover:-translate-y-1 active:scale-95 text-center">
                                Start Your Anthology
                            </Link>
                            <a href="#how-it-works" className="border border-white/10 text-white px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-center">
                                View The Process
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-5 relative group animate-in fade-in slide-in-from-right-8 duration-1000">
                        <div className="absolute inset-0 bg-cobalt/10 blur-[140px] rounded-full group-hover:bg-cobalt/20 transition-all duration-1000" />
                        <div className="relative aspect-[4/5] bg-zinc-900 border border-white/5 rounded-[3.5rem] p-4 shadow-2xl transform hover:rotate-2 transition-all duration-700 overflow-hidden">
                             <div className="w-full h-full rounded-[2.8rem] bg-black overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                                <img 
                                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop" 
                                    className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                                    alt="Editorial Workspace"
                                />
                                <div className="absolute bottom-12 left-12 right-12 z-20 space-y-3">
                                    <div className="h-0.5 w-12 bg-cobalt" />
                                    <h3 className="text-3xl font-serif text-white">The Midnight Collection</h3>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black">Anthology · Volume 01</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Library Explorer Preview */}
            <section className="py-32 px-8 bg-zinc-900/20">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="flex items-end justify-between border-b border-white/5 pb-8">
                        <div className="space-y-4">
                            <h2 className="text-4xl font-serif text-white tracking-tight">The Library Explorer.</h2>
                            <p className="text-zinc-500 text-lg max-w-md">Discover the latest masterpieces published by the GérerTales community.</p>
                        </div>
                        <Link to="/discover" className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt hover:text-white transition-colors pb-1">
                            Browse Catalog →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { title: "Echoes of Yaoundé", format: "Novel", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=600" },
                            { title: "The Solar Weaver", format: "Short Story", image: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=600" },
                            { title: "Midnight in Limbé", format: "Screenplay", image: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600" },
                            { title: "Circuit of Dreams", format: "Comic", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600" }
                        ].map((book, i) => (
                            <div key={i} className="group relative aspect-[3/4] bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/5 transition-all duration-500 hover:scale-[1.02] hover:border-white/20 shadow-2xl">
                                <img src={book.image} className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700" alt={book.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                <div className="absolute bottom-8 left-8 right-8 space-y-2">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-cobalt">{book.format}</span>
                                    <h4 className="text-xl font-serif text-white leading-tight">{book.title}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Detail */}
            <section className="py-40 bg-zinc-950/50 border-y border-white/5 px-8">
                <div className="max-w-7xl mx-auto space-y-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-8 order-2 lg:order-1">
                            <h2 className="text-5xl font-serif text-white leading-tight tracking-tight">Structured <br/> Story Architecture.</h2>
                            <p className="text-zinc-500 text-lg leading-relaxed font-sans max-w-lg">
                                Don't just stare at a blank page. The Architect helps you map out your characters, primary locations, and narrative arc before you write a single line. Every scene is part of a grander design.
                            </p>
                            <ul className="space-y-4 pt-4">
                                {[
                                    "Dramatis Personae tracking",
                                    "Location-based world building",
                                    "Chapter-by-chapter blueprinting",
                                    "Theme-consistent tone engine"
                                ].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                                        <div className="w-1.5 h-1.5 bg-cobalt rounded-full" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-zinc-900 aspect-video rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden order-1 lg:order-2">
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(96,165,250,0.1)_0%,_transparent_70%)]" />
                             <div className="p-12 flex flex-col h-full justify-center space-y-6">
                                <div className="space-y-2 opacity-40">
                                    <div className="h-2 w-32 bg-zinc-800 rounded-full" />
                                    <div className="h-2 w-48 bg-zinc-800 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-64 bg-cobalt/30 rounded-full" />
                                    <div className="h-4 w-40 bg-cobalt/20 rounded-full" />
                                </div>
                                <div className="space-y-2 opacity-40">
                                    <div className="h-2 w-56 bg-zinc-800 rounded-full" />
                                    <div className="h-2 w-24 bg-zinc-800 rounded-full" />
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-48 px-8">
                <div className="max-w-7xl mx-auto space-y-32">
                    <div className="max-w-3xl space-y-6">
                        <h2 className="text-6xl font-serif text-white tracking-tighter">Collaborate with intelligence.</h2>
                        <p className="text-zinc-500 text-xl font-sans leading-relaxed">Three stages to take a spark and turn it into a lasting narrative legacy.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
                        {[
                            { step: "01", title: "Ignite the Spark", desc: "Input a single line, a dream, or a complex concept. Our neural engine analyzes the core theme to suggest the ideal tone, format, and structure for your vision." },
                            { step: "02", title: "Architect the World", desc: "Collaborate on characters, settings, and your narrative arc. Every scene is mapped and summarized before drafting, ensuring a cohesive and powerful story." },
                            { step: "03", title: "Refine the Prose", desc: "Draft alongside the Architect in our distraction-free editor. Get real-time advice, descriptive expansions, or let the AI take the lead on complex sequences." }
                        ].map((item, idx) => (
                            <div key={idx} className="space-y-8 group border-l border-white/5 pl-8 hover:border-cobalt transition-colors duration-700">
                                <div className="text-6xl font-serif text-zinc-900 group-hover:text-cobalt/10 transition-colors duration-700">{item.step}</div>
                                <h3 className="text-2xl font-serif text-white">{item.title}</h3>
                                <p className="text-base text-zinc-500 leading-relaxed font-sans">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-48 px-8 bg-zinc-950/30">
                <div className="max-w-7xl mx-auto space-y-32">
                    <div className="text-center space-y-4">
                        <h2 className="text-5xl font-serif text-white tracking-tight">Choose your plan</h2>
                        <p className="text-zinc-500 text-lg">Scale your output as your stories grow.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            { name: "Writer", price: "$0", desc: "For exploring the studio.", features: ["50 Starting Credits", "Cloud Sync", "Standard Support"] },
                            { name: "Author", price: "$12", desc: "For serious storytellers.", features: ["500 Monthly Credits", "Premium Models", "Unlimited Stories", "Priority Support"], popular: true },
                            { name: "Studio", price: "$29", desc: "Professional suite.", features: ["Unlimited Credits*", "Custom Personas", "Early Access", "Shared Workspaces"] }
                        ].map((plan, i) => (
                            <div key={i} className={`p-10 rounded-[2.5rem] border flex flex-col space-y-10 transition-all duration-500 ${plan.popular ? 'bg-zinc-900 border-cobalt/30 shadow-2xl shadow-cobalt/5 ring-1 ring-cobalt/20' : 'bg-dark-surface border-white/5 hover:border-white/10'}`}>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-2xl font-serif text-white">{plan.name}</h3>
                                        {plan.popular && <span className="bg-cobalt text-white text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full">Most Popular</span>}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-serif text-white">{plan.price}</span>
                                        <span className="text-xs text-zinc-600 font-black uppercase tracking-widest">/ Month</span>
                                    </div>
                                    <p className="text-sm text-zinc-500 font-sans">{plan.desc}</p>
                                </div>
                                <ul className="space-y-4 flex-1">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-center gap-3 text-xs text-zinc-400">
                                            <svg className="w-4 h-4 text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/auth" className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center ${plan.popular ? 'bg-cobalt text-white shadow-xl shadow-cobalt/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                                    {plan.price === "$0" ? "Sign Up Free" : "Get Started"}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials (Minimalist) */}
            <section className="py-48 px-8 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <h2 className="text-5xl font-serif text-white leading-tight tracking-tighter">Drafted in <br/> GérerTales.</h2>
                    <div className="space-y-16">
                        <div className="space-y-6">
                            <p className="text-2xl font-serif text-zinc-300 italic leading-relaxed">
                                "The distraction-free interface and the architectural approach to storytelling changed my workflow. I no longer feel lost in my own drafts."
                            </p>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Esoe B. Fildine</h4>
                                <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Lead Designer @ SWEB Studios</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-60 px-8 text-center bg-black">
                <div className="max-w-4xl mx-auto space-y-12">
                    <h2 className="text-6xl md:text-8xl font-serif text-white tracking-tighter">Start your legacy.</h2>
                    <Link to="/auth" className="inline-block bg-cobalt text-white px-16 py-7 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all active:scale-95 shadow-2xl shadow-cobalt/30">
                        Join the Studio
                    </Link>
                    <div className="pt-24 space-y-6 opacity-30">
                        <div className="h-px w-24 bg-white mx-auto" />
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.5em]">© 2026 GérerTales Editorial Studio · Yaoundé</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
