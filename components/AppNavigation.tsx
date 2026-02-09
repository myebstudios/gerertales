import React from 'react';
import { UserProfile } from '../types';
import { User } from '@supabase/supabase-js';
import { Link, useLocation } from 'react-router-dom';

interface AppNavigationProps {
  userProfile?: UserProfile;
  user: User | null;
  onLogin: () => void;
}

const AppNavigation: React.FC<AppNavigationProps> = ({ userProfile, user, onLogin }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Credit Ring Calculation
  const credits = userProfile?.credits || 0;
  const maxCreditsDisplay = 100; // Visual "Full" cap
  const progress = Math.min(100, Math.max(0, (credits / maxCreditsDisplay) * 100));
  
  const size = 52;
  const center = size / 2;
  const radius = 22;
  const strokeWidth = 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const ringColor = credits > 20 ? 'text-cobalt' : credits > 5 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="w-16 h-full bg-dark-surface border-r border-dark-border flex flex-col items-center py-6 gap-6 z-20">
      {/* Logo Icon / Studio Home */}
      <Link 
        to="/library"
        className="w-10 h-10 bg-cobalt rounded-xl flex items-center justify-center shadow-lg shadow-cobalt/20 mb-4 hover:scale-105 transition-transform"
        title="GererTales Studio"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
          <path d="M11.25 4.533A9.707 9.707 0 006 3.75c-4.553 0-8.25 3.697-8.25 8.25s3.697 8.25 8.25 8.25a9.768 9.768 0 004.586-1.166 9.768 9.768 0 004.586 1.166c4.553 0 8.25-3.697 8.25-8.25s-3.697-8.25-8.25-8.25a9.707 9.707 0 00-5.25.783zM12 21.75H6a8.25 8.25 0 01-5.322-14.706C2.079 12.31 6.545 16.29 11.25 16.5v5.25z" />
        </svg>
      </Link>

      {/* Discover / Public Explorer */}
      <Link
        to="/discover"
        className={`p-3 rounded-xl transition-all duration-300 group relative
          ${currentPath === '/discover' ? 'bg-zinc-800 text-cobalt' : 'text-zinc-500 hover:text-text-main hover:bg-zinc-800/50'}`}
        title="Discover"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
        </svg>
        <span className="absolute left-14 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-dark-border z-50">
            Explorer
        </span>
      </Link>

      {/* Library */}
      <Link
        to="/library"
        className={`p-3 rounded-xl transition-all duration-300 group relative
          ${currentPath === '/library' ? 'bg-zinc-800 text-cobalt' : 'text-zinc-500 hover:text-text-main hover:bg-zinc-800/50'}`}
        title="My Studio Library"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <span className="absolute left-14 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-dark-border z-50">
            Library
        </span>
      </Link>

      {/* Create / Writing */}
      <Link
        to="/onboarding"
        className={`p-3 rounded-xl transition-all duration-300 group relative
          ${currentPath === '/onboarding' ? 'bg-zinc-800 text-cobalt' : 'text-zinc-500 hover:text-text-main hover:bg-zinc-800/50'}`}
        title="New Story"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className="absolute left-14 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-dark-border z-50">
            New Story
        </span>
      </Link>

      {/* Settings */}
      <Link
        to="/settings"
        className={`p-3 rounded-xl transition-all duration-300 group relative
          ${currentPath === '/settings' ? 'bg-zinc-800 text-cobalt' : 'text-zinc-500 hover:text-text-main hover:bg-zinc-800/50'}`}
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="absolute left-14 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-dark-border z-50">
            Settings
        </span>
      </Link>

      {/* Auth Toggle */}
      {!user && (
        <button
          onClick={onLogin}
          className="p-3 rounded-xl transition-all duration-300 group relative text-zinc-500 hover:text-text-main hover:bg-zinc-800/50"
          title="Login with Cloud Sync"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="absolute left-14 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-dark-border z-50">
              Cloud Sync Login
          </span>
        </button>
      )}

      <div className="mt-auto flex flex-col items-center gap-4 mb-6 relative">
        {/* Active Writing Indicator (Only if writing) */}
        {currentPath.startsWith('/writing') && (
            <div
                className="p-3 rounded-xl bg-cobalt/10 text-cobalt border border-cobalt/20 cursor-default"
                title="Currently Writing"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
            </div>
        )}

        {/* User Profile Avatar with Credit Ring */}
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
                {/* Track */}
                <circle 
                    cx={center} cy={center} r={radius} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth={strokeWidth}
                    className="text-zinc-800"
                />
                {/* Progress */}
                <circle 
                    cx={center} cy={center} r={radius} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth={strokeWidth} 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`${ringColor} transition-all duration-700 ease-out`}
                />
            </svg>

            <Link
                to="/profile"
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all duration-300 shadow-lg border-2 z-10
                ${currentPath === '/profile' ? 'border-cobalt' : 'border-transparent hover:border-zinc-500'}`}
                style={{ backgroundColor: userProfile?.avatarColor || '#3f3f46' }}
                title={`Profile (${credits} credits available)`}
            >
                {userProfile ? userProfile.name.charAt(0).toUpperCase() : '?'}
            </Link>
        </div>
      </div>
    </div>
  );
};

export default AppNavigation;

