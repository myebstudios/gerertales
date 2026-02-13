import React from 'react';

interface DialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'info' | 'danger';
}

const Dialog: React.FC<DialogProps> = ({ 
    isOpen, 
    title, 
    message, 
    confirmLabel = "Confirm", 
    cancelLabel = "Cancel", 
    onConfirm, 
    onCancel,
    type = 'info'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-300">
            <div className="bg-dark-surface border border-dark-border w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                <div className="space-y-4 text-center">
                    <h2 className="text-3xl font-serif text-white tracking-tight">{title}</h2>
                    <p className="text-zinc-400 leading-relaxed font-sans text-sm">
                        {message}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-all active:scale-95"
                    >
                        {cancelLabel}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl
                            ${type === 'danger' 
                                ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600' 
                                : 'bg-cobalt text-white shadow-cobalt/20 hover:bg-blue-500'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dialog;
