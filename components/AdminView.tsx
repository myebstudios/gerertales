import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://76.13.253.115:3001';

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

const AdminView: React.FC = () => {
    const [stats, setStats] = useState<Stats>({ requests: 0, tokens: 0, errors: 0 });
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(API_URL);

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

        socket.on('token', (token: string) => {
            // Optional: minimal feedback for streaming
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-dark-bg text-text-main font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-text-main mb-2">Studio Control Room</h1>
                        <p className="text-text-muted">Local Engine Monitoring & Admin Suite</p>
                    </div>
                    <div className="flex items-center gap-3 bg-dark-card border border-dark-border px-4 py-2 rounded-full">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`}></div>
                        <span className="text-sm font-medium">{isConnected ? 'Engine Roaring' : 'Engine Offline'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-sm uppercase tracking-wider mb-2 font-semibold">Total Requests</div>
                        <div className="text-4xl font-serif font-bold text-accent-primary">{stats.requests}</div>
                    </div>
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-sm uppercase tracking-wider mb-2 font-semibold">Token Flow</div>
                        <div className="text-4xl font-serif font-bold text-purple-400">{stats.tokens.toLocaleString()}</div>
                    </div>
                    <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                        <div className="text-text-muted text-sm uppercase tracking-wider mb-2 font-semibold">Engine Faults</div>
                        <div className="text-4xl font-serif font-bold text-rose-400">{stats.errors}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-dark-border bg-dark-bg/50">
                                <h2 className="font-serif font-bold">Live Activity Pulse</h2>
                            </div>
                            <div className="h-[400px] overflow-y-auto p-4 space-y-3 font-mono text-xs">
                                {logs.length === 0 ? (
                                    <div className="text-text-muted italic text-center py-10">Waiting for pulse...</div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="flex gap-4 py-2 border-b border-dark-border last:border-0">
                                            <span className="text-text-muted shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                                            <span className={`font-bold shrink-0 ${
                                                log.type === 'request' ? 'text-accent-primary' : 
                                                log.type === 'error' ? 'text-rose-400' : 'text-text-main'
                                            }`}>
                                                {log.type.toUpperCase()}
                                            </span>
                                            <span className="truncate">{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
                            <h2 className="font-serif font-bold mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <button className="w-full py-2 px-4 bg-dark-bg border border-dark-border hover:border-accent-primary rounded-lg text-sm transition-colors text-left">
                                    Refresh Engine
                                </button>
                                <button className="w-full py-2 px-4 bg-dark-bg border border-dark-border hover:border-accent-primary rounded-lg text-sm transition-colors text-left">
                                    Clear Live Logs
                                </button>
                                <button className="w-full py-2 px-4 bg-dark-bg border border-dark-border hover:border-rose-400 rounded-lg text-sm transition-colors text-left">
                                    Export Session Data
                                </button>
                            </div>
                        </div>

                        <div className="bg-accent-primary/10 border border-accent-primary/20 p-6 rounded-2xl">
                            <h2 className="font-serif font-bold mb-2 text-accent-primary">Alfa Note</h2>
                            <p className="text-sm text-text-main">
                                The engine is currently using <span className="font-bold">Gemma 3:4b</span>. 
                                Monitoring is local-only for maximum privacy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminView;
