
import React, { useState, useEffect } from 'react';
import { AppSettings, Theme, TTSProvider, UserProfile } from '../types';
import SubscriptionPlans from './SubscriptionPlans';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface SettingsViewProps {
  onSave: (settings: AppSettings) => void;
  onCancel: () => void;
  userProfile?: UserProfile;
  onUpdateCredits?: (amount: number) => void;
  user: User | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  openAiApiKey: '',
  xAIApiKey: '',
  elevenLabsApiKey: '',
  textModel: 'gemini-1.5-flash',
  imageModel: 'imagen-3',
  imageResolution: '1K',
  ttsModel: 'tts-1',
  elevenLabsVoiceId: 'cgSgSjJ47ptB6SHCPjD2',
  ttsProvider: 'ai',
  theme: 'nordic-dark'
};

const SettingsView: React.FC<SettingsViewProps> = ({ onSave, onCancel, userProfile, onUpdateCredits, user }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showXAIKey, setShowXAIKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [creditsInput, setCreditsInput] = useState<number>(userProfile?.credits || 0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gerertales_settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleChange = (field: keyof AppSettings, value: string | TTSProvider | Theme) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('gerertales_settings', JSON.stringify(settings));
    if (onUpdateCredits && creditsInput !== userProfile?.credits) {
        onUpdateCredits(creditsInput);
    }
    onSave(settings);
  };

  const handleTopUp = async (amount: number) => {
      alert(`Initiating top-up for ${amount} credits... (Redirecting to Stripe)`);
      try {
          const { data, error } = await supabase.functions.invoke('create-credit-topup', {
              body: { amount, userId: user?.id }
          });
          if (data?.url) window.location.href = data.url;
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="flex-1 h-full bg-dark-bg p-8 md:p-16 overflow-y-auto animate-in fade-in duration-500 no-scrollbar">
      <div className="max-w-4xl mx-auto space-y-20 pb-32">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-serif text-text-main font-medium tracking-tight">Studio Settings</h1>
            <p className="text-text-muted font-sans text-lg mt-2">Personalize your writing environment and AI preferences.</p>
          </div>
          <div className="flex gap-4">
              <button onClick={onCancel} className="px-8 py-3 rounded-2xl text-sm font-bold text-zinc-500 hover:text-white transition-all">Cancel</button>
              <button onClick={handleSave} className="px-10 py-3 rounded-2xl text-sm font-black uppercase tracking-widest bg-cobalt text-white shadow-xl shadow-cobalt/20 hover:bg-blue-500 transition-all active:scale-95">Save Profile</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Left Column: Account & Credits */}
            <div className="lg:col-span-1 space-y-10">
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-dark-border pb-3">Your Account</h3>
                    
                    <div className="bg-dark-surface border border-dark-border rounded-[2rem] p-8 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cobalt/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cobalt/10 transition-all duration-700" />
                        
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center text-xl font-black text-cobalt shadow-inner" style={{ backgroundColor: userProfile?.avatarColor + '20', color: userProfile?.avatarColor }}>
                                {userProfile?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-serif text-lg text-white">{userProfile?.name}</h4>
                                <p className="text-xs text-zinc-500">{user?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <span>Current Credits</span>
                                <span className="text-cobalt">{userProfile?.credits || 0} / 500</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-cobalt transition-all duration-1000 ease-out shadow-[0_0_10px_var(--color-cobalt)]" 
                                    style={{ width: `${Math.min(100, ((userProfile?.credits || 0) / 500) * 100)}%` }} 
                                />
                            </div>
                        </div>

                        <button 
                            onClick={() => document.getElementById('subscriptions')?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                            Manage Subscription
                        </button>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-dark-border pb-3">Quick Top-up</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { amount: 100, price: '$5' },
                            { amount: 500, price: '$20', popular: true }
                        ].map(pkg => (
                            <button 
                                key={pkg.amount}
                                onClick={() => handleTopUp(pkg.amount)}
                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-1 group active:scale-95
                                ${pkg.popular ? 'bg-cobalt/5 border-cobalt/20' : 'bg-dark-surface border-dark-border hover:border-zinc-700'}`}
                            >
                                <span className={`text-lg font-black ${pkg.popular ? 'text-cobalt' : 'text-white'}`}>{pkg.amount}</span>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credits</span>
                                <div className="mt-2 text-xs font-serif italic text-zinc-400 group-hover:text-white">{pkg.price}</div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Right Column: AI & Studio Config */}
            <div className="lg:col-span-2 space-y-12">
                
                {/* Visual Settings */}
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-dark-border pb-3">Visual Workspace</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'nordic-dark', label: 'Nordic Night', color: '#18181b', desc: 'Minimal zinc' },
                            { id: 'midnight', label: 'Deep Ocean', color: '#020617', desc: 'True dark' },
                            { id: 'paper-light', label: 'Classic Ink', color: '#faf9f6', desc: 'High contrast' }
                        ].map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => handleChange('theme', theme.id as Theme)}
                                className={`p-5 rounded-3xl border transition-all flex flex-col items-start gap-4 text-left
                                ${settings.theme === theme.id 
                                    ? 'border-cobalt bg-cobalt/5 shadow-xl shadow-cobalt/5' 
                                    : 'border-dark-border bg-dark-surface/50 hover:bg-dark-surface hover:border-zinc-700'}`}
                            >
                                <div className="w-10 h-10 rounded-xl border-4 border-black/20 shadow-inner" style={{ backgroundColor: theme.color }} />
                                <div>
                                    <h4 className={`text-sm font-bold ${settings.theme === theme.id ? 'text-white' : 'text-zinc-400'}`}>{theme.label}</h4>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black mt-1">{theme.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* AI Configuration */}
                <section className="space-y-8 bg-dark-surface/30 border border-white/5 rounded-[2.5rem] p-8 md:p-12">
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-cobalt">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-serif text-white">AI Neural Engine</h3>
                                <p className="text-sm text-zinc-500">Configure the models powering your narratives.</p>
                            </div>
                        </div>

                        {/* Text Model */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Creative Co-Writer</label>
                                <p className="text-xs text-zinc-600 leading-relaxed">The reasoning engine used for brainstorming and prose generation.</p>
                            </div>
                            <select 
                                value={settings.textModel}
                                onChange={(e) => handleChange('textModel', e.target.value)}
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-cobalt outline-none appearance-none cursor-pointer hover:bg-zinc-800 transition-colors"
                            >
                                <optgroup label="Google DeepMind">
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                </optgroup>
                                <optgroup label="x.ai">
                                    <option value="grok-2-latest">Grok 2</option>
                                    <option value="grok-beta">Grok Beta</option>
                                </optgroup>
                                <optgroup label="OpenAI">
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Image Model */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Illustration Model</label>
                                <p className="text-xs text-zinc-600 leading-relaxed">The visual engine used for covers and scene banners.</p>
                            </div>
                            <select 
                                value={settings.imageModel}
                                onChange={(e) => handleChange('imageModel', e.target.value)}
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-cobalt outline-none appearance-none cursor-pointer hover:bg-zinc-800 transition-colors"
                            >
                                <option value="imagen-3">Imagen 3 (Recommended)</option>
                                <option value="gemini-2.0-flash-exp">Gemini 2.0 (Fast)</option>
                                <option value="dall-e-3">DALL-E 3 (Artistic)</option>
                            </select>
                        </div>

                        {/* Image Resolution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Illustration Quality</label>
                                <p className="text-xs text-zinc-600 leading-relaxed">Higher resolutions consume more storage and credits.</p>
                            </div>
                            <div className="flex gap-2 p-1 bg-zinc-900 border border-white/5 rounded-2xl">
                                {['Low', '1K', '2K'].map(res => (
                                    <button
                                        key={res}
                                        onClick={() => handleChange('imageResolution', res as any)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all
                                        ${settings.imageResolution === res ? 'bg-cobalt text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                                    >
                                        {res}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Keys */}
                        <div className="space-y-6 pt-10 border-t border-white/5">
                            <h4 className="text-xs font-bold text-zinc-400">Bring Your Own Keys</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">Gemini Key</label>
                                    <input 
                                        type={showKey ? "text" : "password"}
                                        value={settings.apiKey}
                                        onChange={(e) => handleChange('apiKey', e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-xs text-text-main focus:border-cobalt outline-none font-mono"
                                    />
                                    <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-9 text-zinc-600 hover:text-white">
                                        {showKey ? "Hide" : "Show"}
                                    </button>
                                </div>

                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">OpenAI Key</label>
                                    <input 
                                        type={showOpenAiKey ? "text" : "password"}
                                        value={settings.openAiApiKey || ''}
                                        onChange={(e) => handleChange('openAiApiKey', e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-xs text-text-main focus:border-cobalt outline-none font-mono"
                                    />
                                    <button onClick={() => setShowOpenAiKey(!showOpenAiKey)} className="absolute right-4 top-9 text-zinc-600 hover:text-white">
                                        {showOpenAiKey ? "Hide" : "Show"}
                                    </button>
                                </div>

                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">x.ai Key</label>
                                    <input 
                                        type={showXAIKey ? "text" : "password"}
                                        value={settings.xAIApiKey || ''}
                                        onChange={(e) => handleChange('xAIApiKey', e.target.value)}
                                        placeholder="xai-..."
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-xs text-text-main focus:border-cobalt outline-none font-mono"
                                    />
                                    <button onClick={() => setShowXAIKey(!showXAIKey)} className="absolute right-4 top-9 text-zinc-600 hover:text-white">
                                        {showXAIKey ? "Hide" : "Show"}
                                    </button>
                                </div>

                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">ElevenLabs Key</label>
                                    <input 
                                        type={showElevenLabsKey ? "text" : "password"}
                                        value={settings.elevenLabsApiKey || ''}
                                        onChange={(e) => handleChange('elevenLabsApiKey', e.target.value)}
                                        placeholder="Key..."
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-xs text-text-main focus:border-cobalt outline-none font-mono"
                                    />
                                    <button onClick={() => setShowElevenLabsKey(!showElevenLabsKey)} className="absolute right-4 top-9 text-zinc-600 hover:text-white">
                                        {showElevenLabsKey ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Subscription Plans */}
        <section id="subscriptions" className="pt-10 border-t border-dark-border">
            <SubscriptionPlans 
                userProfile={userProfile!} 
                userId={user?.id || ''} 
                userEmail={user?.email || ''} 
            />
        </section>

      </div>
    </div>
  );
};

export default SettingsView;
