import React, { useEffect, useState } from 'react';
import { AppSettings, UserProfile } from '../types';
import { useNotify } from '../services/NotificationContext';
import { supabaseService } from '../services/supabaseService';

const ENGINE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://terrorists-eco-filing-repair.trycloudflare.com';

interface GlobalStats {
    totalUsers: number;
    totalStories: number;
    activeToday: number;
    creditsIssued: number;
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
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<GlobalStats>({ totalUsers: 0, totalStories: 0, activeToday: 0, creditsIssued: 0 });
    const [view, setView] = useState<'users' | 'logs' | 'config'>('users');
    const { notify } = useNotify();

    const localEngineUrl = import.meta.env.VITE_GERERLLAMA_URL || "https://terrorists-eco-filing-repair.trycloudflare.com/api/generate";
    
    // Global AI Settings
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allProfiles = await supabaseService.getAllProfiles();
            const logs = await supabaseService.getAuditLogs();
            setProfiles(allProfiles);
            setAuditLogs(logs);

            // Basic Stats
            setStats({
                totalUsers: allProfiles.length,
                totalStories: 0, // Need service method for this
                activeToday: allProfiles.filter(p => new Date(p.joinedDate).toDateString() === new Date().toDateString()).length,
                creditsIssued: allProfiles.reduce((acc, p) => acc + (p.credits || 0), 0)
            });

            // Load settings
            const globalConfig = await supabaseService.getSystemConfig();
            if (globalConfig) {
                setSettings({ ...DEFAULT_SETTINGS, ...globalConfig });
            } else {
                const saved = localStorage.getItem('gerertales_settings');
                if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
            }
        } catch (e) {
            notify("Failed to load admin data.");
        }
    };

    const handleSaveSettings = async () => {
        try {
            await supabaseService.updateSystemConfig(settings);
            localStorage.setItem('gerertales_settings', JSON.stringify(settings));
            notify("Global Engine Settings Synced to Cloud.", "success");
            supabaseService.logAudit(undefined, 'admin_action', 'Updated global engine settings in Supabase');
        } catch (e) {
            notify("Failed to sync settings to cloud. Check permissions.");
        }
    };

    const toggleKey = (key: string) => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));

    const handlePromote = async (user: UserProfile) => {
        if (!user.id) return;
        const newIsAdmin = !user.isAdmin;
        try {
            await supabaseService.updateProfile(user.id, { isAdmin: newIsAdmin });
            notify(`${user.name} ${newIsAdmin ? 'promoted to' : 'removed from'} Admin.`);
            supabaseService.logAudit(undefined, 'admin_action', `Changed admin status for ${user.name} to ${newIsAdmin}`);
            loadData();
        } catch (e) {
            notify("Promotion failed.");
        }
    };

    const handleUpdateCredits = async (user: UserProfile, amount: number) => {
        if (!user.id) return;
        try {
            await supabaseService.updateProfile(user.id, { credits: amount });
            notify(`Updated credits for ${user.name}.`);
            supabaseService.logAudit(undefined, 'admin_action', `Updated credits for ${user.name} to ${amount}`);
            loadData();
        } catch (e) {
            notify("Update failed.");
        }
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-dark-bg text-text-main font-sans no-scrollbar">
            <div className="max-w-7xl mx-auto space-y-12 pb-20">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-text-main mb-2">Studio Control Room</h1>
                        <p className="text-text-muted">Platform Governance & Neural Infrastructure</p>
                    </div>
                    <div className="flex gap-2 bg-dark-card border border-dark-border p-1 rounded-xl">
                        {(['users', 'logs', 'config'] as const).map(v => (
                            <button 
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-cobalt text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatBox label="Total Citizens" value={stats.totalUsers} color="text-accent-primary" />
                    <StatBox label="Active Today" value={stats.activeToday} color="text-emerald-400" />
                    <StatBox label="Credits Flowing" value={stats.creditsIssued.toLocaleString()} color="text-purple-400" />
                    <StatBox label="Engine Node" value={localEngineUrl.includes('localhost') ? "Local" : "Tunnel"} color="text-cobalt" />
                </div>

                {view === 'users' && (
                    <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-dark-bg/50 border-b border-dark-border">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">User</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Joined</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tier</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Credits</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border">
                                {profiles.map((p, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: p.avatarColor }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{p.name}</div>
                                                    <div className="text-[10px] text-zinc-500">{p.role || 'Writer'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">{new Date(p.joinedDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${p.subscriptionTier === 'pro' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {p.subscriptionTier}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono">{p.credits}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {p.isSuperAdmin && <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest border border-purple-400/30 px-2 py-1 rounded">Super</span>}
                                                {p.isAdmin && <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-400/30 px-2 py-1 rounded">Admin</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button 
                                                    onClick={() => {
                                                        const amt = prompt(`Enter new credit balance for ${p.name}:`, p.credits.toString());
                                                        if (amt !== null) handleUpdateCredits(p, parseFloat(amt));
                                                    }}
                                                    className="text-cobalt hover:text-white text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Credits
                                                </button>
                                                {!p.isSuperAdmin && (
                                                    <button 
                                                        onClick={() => handlePromote(p)} 
                                                        className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        {p.isAdmin ? 'Demote' : 'Promote'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {view === 'logs' && (
                    <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden flex flex-col h-[600px]">
                        <div className="px-8 py-5 border-b border-dark-border bg-dark-bg/50 flex justify-between items-center">
                            <h2 className="font-serif font-bold text-lg">System Pulse Log</h2>
                            <button onClick={loadData} className="text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-cobalt font-sans transition-colors">Refresh</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[11px] no-scrollbar">
                            {auditLogs.map((log, i) => (
                                <div key={i} className="flex gap-4 py-3 border-b border-dark-border last:border-0 group">
                                    <span className="text-zinc-600 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                                    <span className={`font-black shrink-0 ${
                                        log.type === 'auth' ? 'text-accent-primary' : 
                                        log.type === 'admin_action' ? 'text-rose-400' : 
                                        log.type === 'billing' ? 'text-emerald-400' : 'text-purple-400'
                                    }`}>
                                        {log.type.toUpperCase()}
                                    </span>
                                    <span className="text-zinc-300 break-all leading-relaxed">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'config' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="bg-dark-card border border-dark-border rounded-3xl p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-serif font-bold">Neural Engine Config</h2>
                                <button onClick={handleSaveSettings} className="px-6 py-2 bg-cobalt text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all">Apply Changes</button>
                            </div>

                            <div className="space-y-6">
                                {/* Model Selections - Preserving current logic but styled */}
                                <ConfigSelect 
                                    label="Active Text Model" 
                                    value={settings.textModel} 
                                    onChange={(v) => setSettings({...settings, textModel: v})}
                                    options={[
                                        { label: 'Grok 2 (Latest)', value: 'grok-2-1212' },
                                        { label: 'Grok Beta', value: 'grok-beta' },
                                        { label: 'Grok 3 (Coming Soon)', value: 'grok-3' },
                                        { label: 'Grok 4.1 Fast Reasoning', value: 'grok-4-1-fast-reasoning' },
                                        { label: 'GérerLlama (Local)', value: 'local-gemma' }
                                    ]}
                                />
                                <ConfigSelect 
                                    label="Illustration Engine" 
                                    value={settings.imageModel} 
                                    onChange={(v) => setSettings({...settings, imageModel: v})}
                                    options={[
                                        { label: 'Grok Imagine Pro', value: 'grok-imagine-image-pro' },
                                        { label: 'Grok Vision Beta', value: 'grok-2-vision-beta' }
                                    ]}
                                />

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
                )}
            </div>
        </div>
    );
};

const StatBox = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
        <div className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-2 font-sans">{label}</div>
        <div className={`text-4xl font-serif font-bold ${color}`}>{value}</div>
    </div>
);

const ConfigSelect = ({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: {label: string, value: string}[] }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-sans">{label}</label>
        <select 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:border-cobalt outline-none font-sans"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export default AdminView;
