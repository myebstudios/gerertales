
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

            {/* Right Column: Studio Config */}
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
