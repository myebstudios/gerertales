
import React, { useState, useEffect } from 'react';
import { AppSettings, Theme, TTSProvider, UserProfile } from '../types';

interface SettingsViewProps {
  onSave: (settings: AppSettings) => void;
  onCancel: () => void;
  userProfile?: UserProfile;
  onUpdateCredits?: (amount: number) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  openAiApiKey: '',
  textModel: 'gemini-3-flash-preview',
  imageModel: 'gemini-2.5-flash-image',
  imageResolution: '1K',
  ttsModel: 'gemini-2.5-flash-preview-tts',
  ttsProvider: 'ai',
  theme: 'nordic-dark'
};

const SettingsView: React.FC<SettingsViewProps> = ({ onSave, onCancel, userProfile, onUpdateCredits }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
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
    // Save credits if changed
    if (onUpdateCredits && creditsInput !== userProfile?.credits) {
        onUpdateCredits(creditsInput);
    }
    onSave(settings);
  };

  return (
    <div className="flex-1 h-full bg-dark-bg p-8 md:p-12 overflow-y-auto animate-in fade-in duration-300">
      <div className="max-w-2xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-serif text-text-main font-medium mb-4">Settings</h1>
          <p className="text-text-muted font-sans text-sm">Configure the AI models, voice engines, and aesthetics for your studio.</p>
        </div>

        <div className="space-y-8">

           {/* User Credits Section (Testing) */}
           <div className="bg-dark-surface border border-dark-border rounded-xl p-6 space-y-4 shadow-lg">
             <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">AI Credits</h3>
                    <p className="text-xs text-zinc-500 mt-1">Manage your credit balance for AI features.</p>
                </div>
                <div className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase rounded border border-yellow-500/20">
                    Testing Mode
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                <input 
                    type="number"
                    value={creditsInput}
                    onChange={(e) => setCreditsInput(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 bg-zinc-800 border border-dark-border rounded-lg p-3 text-sm text-text-main focus:border-cobalt outline-none font-mono text-center"
                />
                <span className="text-sm text-zinc-500">Current Balance: <span className="text-cobalt font-bold">{userProfile?.credits || 0}</span></span>
             </div>
             <p className="text-xs text-zinc-600 italic">Adjust this value to simulate purchasing or using credits.</p>
          </div>
          
          {/* Theme Section */}
           <div className="bg-dark-surface border border-dark-border rounded-xl p-6 space-y-4 shadow-lg">
             <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Studio Theme</h3>
                    <p className="text-xs text-zinc-500 mt-1">Customize your writing environment.</p>
                </div>
             </div>
             
             <div className="grid grid-cols-3 gap-3">
                 {[
                     { id: 'nordic-dark', label: 'Nordic Night', color: '#18181b' },
                     { id: 'midnight', label: 'Midnight', color: '#0f172a' },
                     { id: 'paper-light', label: 'Paper & Ink', color: '#faf9f6' }
                 ].map(theme => (
                     <button
                        key={theme.id}
                        onClick={() => handleChange('theme', theme.id as Theme)}
                        className={`p-3 rounded-lg border flex items-center gap-3 transition-all
                        ${settings.theme === theme.id 
                            ? 'border-cobalt bg-cobalt/10' 
                            : 'border-dark-border hover:bg-zinc-800/50'}`}
                     >
                         <div className="w-6 h-6 rounded-full border border-dark-border" style={{ backgroundColor: theme.color }}></div>
                         <span className={`text-sm font-medium ${settings.theme === theme.id ? 'text-cobalt' : 'text-text-main'}`}>
                             {theme.label}
                         </span>
                     </button>
                 ))}
             </div>
          </div>

          {/* Google API Key Section */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 space-y-4 shadow-lg">
             <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Google Gemini API Key</h3>
                    <p className="text-xs text-zinc-500 mt-1">Leave empty to use the hosted default key (if available).</p>
                </div>
                <div className="px-2 py-1 bg-cobalt/10 text-cobalt text-[10px] font-bold uppercase rounded border border-cobalt/20">
                    Secure Storage
                </div>
             </div>
             
             <div className="relative">
                <input 
                    type={showKey ? "text" : "password"}
                    value={settings.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-zinc-800 border border-dark-border rounded-lg p-3 text-sm text-text-main focus:border-cobalt outline-none font-mono"
                />
                <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-text-main text-xs uppercase font-bold"
                >
                    {showKey ? 'Hide' : 'Show'}
                </button>
             </div>
          </div>

          {/* OpenAI API Key Section */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 space-y-4 shadow-lg">
             <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">OpenAI API Key</h3>
                    <p className="text-xs text-zinc-500 mt-1">Required for GPT-4o, DALL-E 3, and OpenAI Voices.</p>
                </div>
             </div>
             
             <div className="relative">
                <input 
                    type={showOpenAiKey ? "text" : "password"}
                    value={settings.openAiApiKey || ''}
                    onChange={(e) => handleChange('openAiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-zinc-800 border border-dark-border rounded-lg p-3 text-sm text-text-main focus:border-cobalt outline-none font-mono"
                />
                <button 
                    onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-text-main text-xs uppercase font-bold"
                >
                    {showOpenAiKey ? 'Hide' : 'Show'}
                </button>
             </div>
          </div>

          {/* Models Configuration */}
          <div className="space-y-6">
             <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest border-b border-dark-border pb-2">Model Configuration</h3>
             
             {/* Text Model */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <label className="text-sm text-text-main font-medium">Co-Writer Model</label>
                <div className="md:col-span-2">
                    <select 
                        value={settings.textModel}
                        onChange={(e) => handleChange('textModel', e.target.value)}
                        className="w-full bg-zinc-800 border border-dark-border rounded-lg p-3 text-sm text-text-main focus:border-cobalt outline-none appearance-none"
                    >
                        <optgroup label="Google Gemini">
                            <option value="gemini-3-flash-preview">Gemini 3.0 Flash (Fastest)</option>
                            <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Best Reasoning)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        </optgroup>
                        <optgroup label="OpenAI">
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                        </optgroup>
                    </select>
                </div>
             </div>

             {/* Image Model & Resolution */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <label className="text-sm text-text-main font-medium mt-3">Illustrator</label>
                <div className="md:col-span-2 space-y-3">
                    <select 
                        value={settings.imageModel}
                        onChange={(e) => handleChange('imageModel', e.target.value)}
                        className="w-full bg-zinc-800 border border-dark-border rounded-lg p-3 text-sm text-text-main focus:border-cobalt outline-none appearance-none"
                    >
                        <optgroup label="Google Gemini">
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Standard)</option>
                            <option value="gemini-3-pro-image-preview">Gemini 3.0 Pro Image (High Quality)</option>
                        </optgroup>
                        <optgroup label="OpenAI">
                            <option value="dall-e-3">DALL-E 3</option>
                        </optgroup>
                    </select>

                    <div className="flex gap-2 flex-wrap">
                         <span className="text-xs text-zinc-500 self-center">Resolution:</span>
                         <div className="flex gap-1 flex-1">
                             {['Low', '1K', '2K', '4K'].map(res => {
                                 // Logic: Low/1K always available. 2K/4K only for Pro.
                                 const isPro = settings.imageModel === 'gemini-3-pro-image-preview';
                                 const disabled = (res === '2K' || res === '4K') && !isPro;
                                 
                                 return (
                                    <button
                                        key={res}
                                        onClick={() => handleChange('imageResolution', res)}
                                        className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-md transition-all border border-dark-border 
                                            ${settings.imageResolution === res ? 'bg-zinc-700 text-cobalt border-cobalt' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}
                                            ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
                                        `}
                                        disabled={disabled}
                                        title={disabled ? 'Only available for Gemini 3.0 Pro Image' : res === 'Low' ? 'Reduces storage usage (512px)' : ''}
                                    >
                                        {res === 'Low' ? 'Low (Saver)' : res}
                                    </button>
                                 );
                             })}
                         </div>
                    </div>
                </div>
             </div>

             {/* TTS Configuration */}
             <div className="space-y-4 pt-4 border-t border-dark-border">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-sm text-text-main font-medium">Voice Engine</label>
                    <div className="md:col-span-2 flex gap-2 p-1 bg-zinc-800 rounded-lg border border-dark-border">
                        <button 
                            onClick={() => handleChange('ttsProvider', 'ai')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.ttsProvider === 'ai' ? 'bg-cobalt text-white shadow-sm' : 'text-zinc-400 hover:text-text-main'}`}
                        >
                            AI Neural (High Quality)
                        </button>
                        <button 
                            onClick={() => handleChange('ttsProvider', 'browser')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.ttsProvider === 'browser' ? 'bg-cobalt text-white shadow-sm' : 'text-zinc-400 hover:text-text-main'}`}
                        >
                            Browser (Offline)
                        </button>
                    </div>
                 </div>

                 {settings.ttsProvider === 'ai' && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-fade-in">
                        <label className="text-sm text-text-main font-medium">AI Narrator Model</label>
                        <div className="md:col-span-2">
                            <select 
                                value={settings.ttsModel}
                                onChange={(e) => handleChange('ttsModel', e.target.value)}
                                className="w-full bg-zinc-800 border border-dark-border rounded-lg p-3 text-sm text-text-main focus:border-cobalt outline-none appearance-none"
                            >
                                <optgroup label="Google Gemini">
                                    <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash TTS</option>
                                </optgroup>
                                <optgroup label="OpenAI">
                                    <option value="tts-1">OpenAI TTS 1</option>
                                    <option value="tts-1-hd">OpenAI TTS 1 HD</option>
                                </optgroup>
                            </select>
                        </div>
                     </div>
                 )}
             </div>
          </div>

        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-8 border-t border-dark-border">
            <button 
                onClick={onCancel}
                className="px-6 py-2 text-sm text-zinc-400 hover:text-text-main hover:bg-zinc-800 rounded-full transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-8 py-2 bg-cobalt text-white text-sm font-bold rounded-full hover:bg-blue-500 shadow-lg shadow-cobalt/20 transition-all transform hover:-translate-y-1"
            >
                Save Changes
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsView;

