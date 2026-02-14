
import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '../services/NotificationContext';

const Auth: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { notify } = useNotify();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabaseService.signUpWithEmail(email, password);
                if (error) throw error;
                notify('Check your email for the confirmation link!');
            } else {
                const { data, error } = await supabaseService.signInWithEmail(email, password);
                if (error) throw error;
                navigate('/library');
            }
        } catch (error: any) {
            notify(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await supabaseService.signInWithGoogle();
        } catch (error: any) {
            notify(error.message);
        }
    };

    return (
        <div className="min-h-screen w-full bg-dark-bg flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-serif text-text-main tracking-tighter">GérerTales</h1>
                    <p className="text-text-muted font-sans uppercase tracking-[0.2em] text-[10px] font-black">
                        {isSignUp ? 'Join the Studio' : 'Welcome Back'}
                    </p>
                </div>

                <div className="bg-dark-surface border border-dark-border rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Email Address</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-cobalt outline-none transition-all"
                                placeholder="writer@studio.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-cobalt outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-4 bg-cobalt text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-xl shadow-cobalt/20 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-border"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="px-4 bg-dark-surface text-zinc-600 font-bold">Or continue with</span></div>
                    </div>

                    <button 
                        onClick={handleGoogleLogin}
                        className="w-full py-4 bg-white/5 border border-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google Account
                    </button>
                </div>

                <div className="text-center">
                    <button 
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-zinc-500 hover:text-cobalt transition-colors font-bold uppercase tracking-widest"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
