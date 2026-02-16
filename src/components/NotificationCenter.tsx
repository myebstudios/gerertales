
import React from 'react';
import { useStore } from '../services/store';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { NotificationType } from '../types';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const { notifications, markAsRead, markAllAsRead, userProfile } = useStore();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'like': return '❤️';
            case 'comment': return '💬';
            case 'reply': return '↪️';
            case 'follow': return '👤';
            case 'story_update': return '📚';
            case 'recommendation': return '✨';
            case 'system': return '⚙️';
            default: return '🔔';
        }
    };

    const getMessage = (n: any) => {
        const actor = <span className="font-bold text-white">{n.actorName || 'A writer'}</span>;
        const story = n.storyTitle ? <span className="italic">"{n.storyTitle}"</span> : null;

        switch (n.type) {
            case 'like': return <>{actor} liked your tale {story}</>;
            case 'comment': return <>{actor} commented on {story}</>;
            case 'reply': return <>{actor} replied to your comment on {story}</>;
            case 'follow': return <>{actor} started following you</>;
            case 'story_update': return <>A new chapter is available in {story}</>;
            case 'recommendation': return <>We think you'll love {story}</>;
            default: return <>New activity from {actor}</>;
        }
    };

    const handleNotificationClick = (n: any) => {
        markAsRead(n.id);
        if (n.storyId) {
            navigate(`/details/${n.storyId}`);
        }
        onClose();
    };

    return (
        <div className="fixed top-6 left-20 w-96 max-h-[calc(100vh-48px)] bg-dark-card border border-white/10 rounded-3xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">The Ledger of Activity</h3>
                <button onClick={onClose} className="text-zinc-600 hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                        <div className="text-4xl opacity-20">📭</div>
                        <p className="text-sm text-zinc-600 font-serif italic">Your ledger is empty for now.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left p-6 flex gap-4 hover:bg-white/5 transition-all group ${!n.isRead ? 'bg-cobalt/5' : ''}`}
                            >
                                <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-lg relative">
                                    {n.actorAvatar ? (
                                        <img src={n.actorAvatar} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        getIcon(n.type)
                                    )}
                                    {!n.isRead && <div className="absolute -top-1 -right-1 w-3 h-3 bg-cobalt rounded-full border-2 border-dark-card animate-pulse" />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-200 transition-colors">
                                        {getMessage(n)}
                                    </p>
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest block">
                                        {formatDistanceToNow(n.createdAt)} ago
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-4 bg-zinc-900/50 border-t border-white/5 text-center">
                    <button 
                        onClick={() => userProfile?.id && markAllAsRead(userProfile.id)}
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
                    >
                        Archive All Notifications
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
