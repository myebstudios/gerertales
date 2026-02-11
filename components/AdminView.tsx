import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AppSettings } from '../types';

const ENGINE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://young-mangos-buy.loca.lt';

interface Stats {
    requests: number;
    tokens: number;
    errors: number;
}

interface ActivityLog {
    type: 'request' | 'error' | 'token';
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
                message: data.type === 'request' ? `Prompt: ${data.prompt}...` : data.message,
                timestamp: new Date()
            };
            setLogs(prev => [newLog, ...prev].slice(0, 50));
        });

        return () => { socket.disconnect(); };
    }, []);

    const handleSaveSettings = () => {
        localStorage.setItem('gerertales_settings', JSON.stringify(settings));
        alert("Global Engine Settings Updated.");
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
                        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2">Total Requests</div>
                        <div className="text-4xl font-serif font-bold text-accent-primary">{stats.requests}</div>
                    </div>
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2">Token Flow</div>
                        <div className="text-4xl font-serif font-bold text-purple-400">{stats.tokens.toLocaleString()}</div>
                    </div>
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2">Engine Faults</div>
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Text Model</label>
                                    <select 
                                        value={settings.textModel}
                                        onChange={(e) => setSettings({...settings, textModel: e.target.value})}
                                        className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:border-cobalt outline-none"
                                    >
                                        <option value="local-gemma">GérerLlama (Local Gemma 3)</option>
                                        <optgroup label="Remote Providers">
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                            <option value="grok-2-latest">Grok 2</option>
                                            <option value="gpt-4o">GPT-4o</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 border-b border-dark-border pb-2">Infrastructure Keys</h3>
                                    
                                    {[
                                        { label: 'Gemini API', key: 'apiKey' },
                                        { label: 'OpenAI API', key: 'openAiApiKey' },
                                        { label: 'x.ai API', key: 'xAIApiKey' },
                                        { label: 'ElevenLabs API', key: 'elevenLabsApiKey' }
                                    ].map(item => (
                                        <div key={item.key} className="relative">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">{item.label}</label>
                                            <input 
                                                type={showKeys[item.key] ? "text" : "password"}
                                                value={(settings as any)[item.key] || ''}
                                                onChange={(e) => setSettings({...settings, [item.key]: e.target.value})}
                                                placeholder="Enter secret key..."
                                                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-text-main focus:border-cobalt outline-none font-mono"
                                            />
                                            <button onClick={() => toggleKey(item.key)} className="absolute right-3 top-7 text-[10px] text-zinc-500 hover:text-white uppercase font-bold">
                                                {showKeys[item.key] ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Live Pulse */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden flex flex-col h-[600px]">
                        <div className="px-8 py-5 border-b border-dark-border bg-dark-bg/50">
                            <h2 className="font-serif font-bold text-lg">Engine Pulse Log</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[11px] no-scrollbar">
                            {logs.length === 0 ? (
                                <div className="text-text-muted italic text-center py-20">Waiting for pulse...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-4 py-3 border-b border-dark-border last:border-0 group">
                                        <span className="text-zinc-600 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                                        <span className={`font-black shrink-0 ${
                                            log.type === 'request' ? 'text-accent-primary' : 
                                            log.type === 'error' ? 'text-rose-400' : 'text-purple-400'
                                        }`}>
                                            {log.type.toUpperCase()}
                                        </span>
                                        <span className="text-zinc-300 break-all">{log.message}</span>
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
