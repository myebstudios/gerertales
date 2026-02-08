
import React, { useState, useEffect } from 'react';
import { UserProfile, Story } from '../types';

interface UserProfileViewProps {
  profile: UserProfile;
  stories: Story[];
  onUpdateProfile: (profile: UserProfile) => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ profile, stories, onUpdateProfile }) => {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [isEditing, setIsEditing] = useState(false);

  // Stats Calculation
  const totalStories = stories.length;
  const totalChapters = stories.reduce((acc, story) => acc + story.toc.length, 0);
  const writtenChapters = stories.reduce((acc, story) => 
    acc + story.toc.filter(c => c.content.trim().length > 50).length, 0
  );
  
  // Rough word count estimation
  const totalWords = stories.reduce((acc, story) => 
    acc + story.toc.reduce((cAcc, c) => cAcc + (c.content.trim().split(/\s+/).length || 0), 0), 0
  );

  const handleSave = () => {
    onUpdateProfile({
      ...profile,
      name,
      bio,
    });
    setIsEditing(false);
  };

  return (
    <div className="flex-1 h-full bg-dark-bg p-8 md:p-12 overflow-y-auto animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex items-start justify-between border-b border-dark-border pb-8">
            <div className="flex items-center gap-6">
                <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-serif text-white shadow-2xl"
                    style={{ backgroundColor: profile.avatarColor }}
                >
                    {name.charAt(0).toUpperCase()}
                </div>
                <div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <input 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-transparent border-b border-cobalt text-3xl font-serif text-text-main focus:outline-none w-full"
                                placeholder="Your Name"
                            />
                            <input 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="bg-transparent border-b border-zinc-700 text-sm font-sans text-zinc-400 focus:outline-none focus:border-cobalt w-full"
                                placeholder="A short bio..."
                            />
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-4xl font-serif text-text-main mb-2">{profile.name}</h1>
                            <p className="text-zinc-400 font-sans italic">{profile.bio}</p>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
                                Member since {new Date(profile.joinedDate).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all
                    ${isEditing 
                        ? 'bg-cobalt text-white hover:bg-blue-500 shadow-lg shadow-cobalt/20' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-dark-border'}`}
            >
                {isEditing ? 'Save Profile' : 'Edit Profile'}
            </button>
        </div>

        {/* Stats Grid */}
        <div>
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Career Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard label="Stories Created" value={totalStories} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                } />
                <StatCard label="Chapters Drafted" value={writtenChapters} subValue={`/ ${totalChapters} planned`} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                } />
                <StatCard label="Total Words" value={totalWords.toLocaleString()} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                } />
                <StatCard label="Writing Streak" value={"1 Day"} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
                    </svg>
                } />
            </div>
        </div>

        {/* Recent Activity Placeholder - Could be actual logs later */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 opacity-50 pointer-events-none grayscale">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Achievements (Coming Soon)</h3>
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700" />
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700" />
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700" />
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subValue, icon }: { label: string, value: string | number, subValue?: string, icon: React.ReactNode }) => (
    <div className="bg-dark-surface border border-dark-border p-6 rounded-xl hover:border-cobalt/50 transition-colors group">
        <div className="text-zinc-600 mb-4 group-hover:text-cobalt transition-colors">
            {icon}
        </div>
        <div className="text-3xl font-serif text-text-main mb-1">
            {value} <span className="text-xs font-sans text-zinc-500 ml-1">{subValue}</span>
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {label}
        </div>
    </div>
);

export default UserProfileView;

