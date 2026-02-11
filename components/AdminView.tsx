import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AppSettings } from '../types';
import { useNotify } from '../services/NotificationContext';

const ENGINE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://theme-decent-vehicle-lists.trycloudflare.com';

interface Stats {
    requests: number;
    tokens: number;
    errors: number;
}

interface ActivityLog {
    type: 'request' | 'error' | 'token' | 'complete';
    message: string;
    timestamp: Date;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  openAiApiKey: '',
  xAIApiKey: '',
  elevenLabsApiKey: '',
  textModel: 'local-gemma',
  imageModel: 'imagen-3',
  imageResolution: '1K',
  ttsModel: 'tts-1',
  elevenLabsVoiceId: 'cgSgSjJ47ptB6SHCPjD2',
  ttsProvider: 'ai',
  theme: 'nordic-dark'
};

const AdminView: React.FC = () => {
    const [stats, setStats] = useState<Stats>({ requests: 0, tokens: 0, errors: 0 });
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const { notify } = useNotify();
    
    // Global AI Settings
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Load settings
        const saved = localStorage.getItem('gerertales_settings');
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });

        const socket = io(ENGINE_URL);
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('stats:init', (data: Stats) => setStats(data));
        socket.on('stats:update', (data: Stats) => setStats(data));
        socket.on('activity', (data: any) => {
            const newLog: ActivityLog = {
                type: data.type,
                message: data.type === 'request' ? `Prompt: ${data.prompt}...` : (data.text || data.message || "Operation Complete"),
                timestamp: new Date()
            };
            setLogs(prev => [newLog, ...prev].slice(0, 50));
        });

        return () => { socket.disconnect(); };
    }, []);

    const handleSaveSettings = () => {
        localStorage.setItem('gerertales_settings', JSON.stringify(settings));
        notify("Global Engine Settings Updated.", "success");
    };

    const toggleKey = (key: string) => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-dark-bg text-text-main font-sans no-scrollbar">
            <div className="max-w-6xl mx-auto space-y-12 pb-20">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-text-main mb-2">Studio Control Room</h1>
                        <p className="text-text-muted">Global AI Engine & Infrastructure Management</p>
                    </div>
                    <div className="flex items-center gap-3 bg-dark-card border border-dark-border px-4 py-2 rounded-full">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`}></div>
                        <span className="text-sm font-medium">{isConnected ? 'Engine Roaring' : 'Engine Offline'}</span>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2 font-sans">Total Requests</div>
                        <div className="text-4xl font-serif font-bold text-accent-primary">{stats.requests}</div>
                    </div>
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2 font-sans">Token Flow</div>
                        <div className="text-4xl font-serif font-bold text-purple-400">{stats.tokens.toLocaleString()}</div>
                    </div>
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2 font-sans">Engine Faults</div>
                        <div className="text-4xl font-serif font-bold text-rose-400">{stats.errors}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Engine Configuration */}
                    <div className="space-y-6">
                        <section className="bg-dark-card border border-dark-border rounded-3xl p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-serif font-bold">Neural Engine Config</h2>
                                <button onClick={handleSaveSettings} className="px-6 py-2 bg-cobalt text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all">Apply Changes</button>
                            </div>

                            <div className="space-y-6">
                                {/* Text Model Selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-sans">Active Text Model</label>
                                    <select 
                                        value={settings.textModel}
                                        onChange={(e) => setSettings({...settings, textModel: e.target.value})}
                                        className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:border-cobalt outline-none font-sans"
                                    >
                                        <option value="local-gemma">GérerLlama (Local Gemma 3)</option>
                                        <optgroup label="x.ai (Grok)">
                                            <option value="grok-4-1-fast-reasoning">Grok 4.1 Fast Reasoning</option>
                                            <option value="grok-4-1-fast-non-reasoning">Grok 4.1 Fast</option>
                                            <option value="grok-3">Grok 3</option>
                                            <option value="grok-3-mini">Grok 3 Mini</option>
                                            <option value="grok-2-vision-1212">Grok 2 Vision</option>
                                        </optgroup>
                                        <optgroup label="Google DeepMind">
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        </optgroup>
                                        <optgroup label="OpenAI">
                                            <option value="gpt-4o">GPT-4o</option>
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Image Model Selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-sans">Illustration Engine</label>
                                    <select 
                                        value={settings.imageModel}
                                        onChange={(e) => setSettings({...settings, imageModel: e.target.value})}
                                        className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:border-cobalt outline-none font-sans"
                                    >
                                        <optgroup label="Google Imagen">
                                            <option value="imagen-3">Imagen 3 (Standard)</option>
                                            <option value="gemini-2.0-flash-exp">Gemini 2.0 (Fast)</option>
                                        </optgroup>
                                        <optgroup label="x.ai (Grok Imagine)">
                                            <option value="grok-imagine-image-pro">Grok Imagine Pro</option>
                                            <option value="grok-imagine-image">Grok Imagine</option>
                                            <option value="grok-2-image-1212">Grok 2 Image</option>
                                        </optgroup>
                                        <optgroup label="OpenAI DALL-E">
                                            <option value="dall-e-3">DALL-E 3</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dark-border">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 font-sans">Infrastructure Keys</h3>
                                    
                                    {[
                                        { label: 'Gemini API', key: 'apiKey' },
                                        { label: 'OpenAI API', key: 'openAiApiKey' },
                                        { label: 'x.ai API', key: 'xAIApiKey' },
                                        { label: 'ElevenLabs API', key: 'elevenLabsApiKey' }
                                    ].map(item => (
                                        <div key={item.key} className="relative">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block font-sans">{item.label}</label>
                                            <input 
                                                type={showKeys[item.key] ? "text" : "password"}
                                                value={(settings as any)[item.key] || ''}
                                                onChange={(e) => setSettings({...settings, [item.key]: e.target.value})}
                                                placeholder="Enter secret key..."
                                                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-text-main focus:border-cobalt outline-none font-mono"
                                            />
                                            <button onClick={() => toggleKey(item.key)} className="absolute right-3 top-7 text-[10px] text-zinc-500 hover:text-white uppercase font-bold font-sans">
                                                {showKeys[item.key] ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Live Pulse */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden flex flex-col h-[700px]">
                        <div className="px-8 py-5 border-b border-dark-border bg-dark-bg/50 flex justify-between items-center">
                            <h2 className="font-serif font-bold text-lg">Engine Pulse Log</h2>
                            <button onClick={() => setLogs([])} className="text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-rose-400 font-sans transition-colors">Clear Log</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[11px] no-scrollbar">
                            {logs.length === 0 ? (
                                <div className="text-text-muted italic text-center py-20 font-serif">Waiting for pulse...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-4 py-3 border-b border-dark-border last:border-0 group">
                                        <span className="text-zinc-600 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                                        <span className={`font-black shrink-0 ${
                                            log.type === 'request' ? 'text-accent-primary' : 
                                            log.type === 'error' ? 'text-rose-400' : 
                                            log.type === 'complete' ? 'text-emerald-400' : 'text-purple-400'
                                        }`}>
                                            {log.type.toUpperCase()}
                                        </span>
                                        <span className="text-zinc-300 break-all leading-relaxed">{log.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminView;
