
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Story, Message, StoryConfig, StoryBlueprintData, UserProfile, AppSettings } from './types';
import * as GeminiService from './services/geminiService';
import { applyTheme } from './services/themeService';
import { supabaseService } from './services/supabaseService';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { analytics } from './services/analyticsService';

import Onboarding from './components/Onboarding';
import ChatInterface from './components/ChatInterface';
import StoryBlueprint from './components/StoryBlueprint';
import ContextSidebar from './components/ContextSidebar';
import AppNavigation from './components/AppNavigation';
import StoryLibrary from './components/StoryLibrary';
import UserProfileView from './components/UserProfileView';
import SettingsView from './components/SettingsView';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Load initial state
  const [stories, setStories] = useState<Story[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Guest Writer",
    bio: "A traveler in the realm of imagination.",
    avatarColor: "#60A5FA",
    joinedDate: Date.now(),
    credits: 50,
    subscriptionTier: 'free'
  });

  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync Data on Auth Change
  useEffect(() => {
    const syncData = async () => {
        if (user) {
            // Fetch from Supabase
            const profile = await supabaseService.getProfile(user.id);
            if (profile) {
                setUserProfile(profile);
                if (['/', '/auth'].includes(location.pathname)) {
                    navigate('/library');
                }
            } else {
                // Initialize profile in Supabase if new user
                await supabaseService.updateProfile(user.id, userProfile);
                navigate('/library');
            }

            const cloudStories = await supabaseService.getStories(user.id);
            setStories(cloudStories);
        } else {
            // Load from localStorage as guest
            try {
                const savedStories = localStorage.getItem('gerertales_stories');
                if (savedStories) setStories(JSON.parse(savedStories));
                
                const savedProfile = localStorage.getItem('gerertales_profile');
                if (savedProfile) setUserProfile(JSON.parse(savedProfile));
            } catch (e) {
                console.warn("Failed to load guest data", e);
            }
        }
    };

    syncData();
  }, [user]);

  // Theme Application Effect
  useEffect(() => {
      try {
          const savedSettings = localStorage.getItem('gerertales_settings');
          if (savedSettings) {
              const settings: AppSettings = JSON.parse(savedSettings);
              if (settings.theme) {
                  applyTheme(settings.theme);
              } else {
                  applyTheme('nordic-dark');
              }
          } else {
               applyTheme('nordic-dark');
          }
      } catch (e) {
          applyTheme('nordic-dark');
      }
  }, [location.pathname]);

  const currentStory = stories.find(s => s.id === activeStoryId);
  const userTier = userProfile.subscriptionTier || 'free';

  // -- Credit Management Helper --
  const hasCredits = (): boolean => {
      if (userProfile.credits <= 0) {
          alert("You have run out of credits. Please add more in Settings to continue.");
          return false;
      }
      return true;
  };

  const deductCredits = (cost: number, featureName: string) => {
      const newBalance = Math.max(0, parseFloat((userProfile.credits - cost).toFixed(2)));
      const updatedProfile = { ...userProfile, credits: newBalance };
      setUserProfile(updatedProfile);
      if (user) supabaseService.updateProfile(user.id, updatedProfile);
  };

  // -- Navigation Handlers --
  const handleSelectStory = (story: Story) => {
    if (!user) {
        navigate('/auth');
        return;
    }
    setActiveStoryId(story.id);
    setMessages([{
        id: 'restore',
        role: 'model',
        text: `Welcome back to "${story.title}". We are currently at Chapter ${story.activeChapterIndex + 1}.`
    }]);
    navigate(`/writing/${story.id}`);
  };

  const handleDeleteStory = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this story?")) {
      setStories(prev => prev.filter(s => s.id !== id));
      if (user) supabaseService.deleteStory(user.id, id);
    }
  };

  // -- AI Logic --
  const handleCreateStory = async (config: StoryConfig, blueprint: StoryBlueprintData) => {
    setIsAiProcessing(true);
    try {
      const newStoryId = crypto.randomUUID();
      const newStory: Story = {
        id: newStoryId,
        title: config.title,
        spark: config.spark,
        tone: config.tone,
        format: config.format,
        activeChapterIndex: 0,
        characters: blueprint.characters,
        locations: blueprint.locations,
        toc: blueprint.toc,
        lastModified: Date.now()
      };

      setStories(prev => [newStory, ...prev]);
      if (user) supabaseService.saveStory(user.id, newStory);
      setActiveStoryId(newStoryId);
      
      setMessages([{
        id: 'init',
        role: 'model',
        text: `I've initialized the ${config.format} blueprint for "${config.title}". Shall we start?`
      }]);
      
      navigate(`/writing/${newStoryId}`);

      // Background Cover Generation
      (async () => {
          const { url, cost } = await GeminiService.generateCoverImage(config.title, config.tone, config.spark, userTier);
          if (url) {
              setStories(prev => prev.map(s => s.id === newStoryId ? { ...s, coverImage: url } : s));
              deductCredits(cost, "Cover Image");
          }
      })();

    } catch (error) {
      alert("The Architect couldn't parse your idea.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!currentStory) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsAiProcessing(true);

    try {
      if (!hasCredits()) {
          setIsAiProcessing(false);
          return;
      }

      const currentChapter = currentStory.toc[currentStory.activeChapterIndex];
      const isProse = text.toLowerCase().includes('write') || currentChapter.content.length < 50;

      if (isProse) {
        const { text: prose, cost } = await GeminiService.generateProse(
            messages.concat(userMsg).map(m => ({role: m.role, text: m.text})), 
            currentChapter,
            currentStory.format,
            text,
            userTier
        );
        deductCredits(cost, "Prose Generation");
        handleContentUpdate(currentChapter.content ? `${currentChapter.content}\n\n${prose}` : prose);
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "I've added that to the draft. How does it feel?" }]);
      } else {
        const { text: response, cost } = await GeminiService.generateProse(
            messages.concat(userMsg).map(m => ({role: m.role, text: m.text})),
            currentChapter,
            currentStory.format,
            "Provide brief advice. Do not write prose.",
            userTier
        );
        deductCredits(cost, "Chat");
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Connection error." }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleContentUpdate = (newContent: string) => {
    if (currentStory) {
        const updatedChapters = [...currentStory.toc];
        updatedChapters[currentStory.activeChapterIndex].content = newContent;
        const updatedStory = { ...currentStory, toc: updatedChapters, lastModified: Date.now() };
        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
        if (user) supabaseService.saveStory(user.id, updatedStory);
    }
  };

  const handleImportStory = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const imported = JSON.parse(content) as Story;
            // Ensure unique ID for imported tale
            imported.id = crypto.randomUUID();
            imported.lastModified = Date.now();
            imported.ownerId = user?.id;
            
            setStories(prev => [imported, ...prev]);
            if (user) await supabaseService.saveStory(user.id, imported);
            alert(`"${imported.title}" imported successfully.`);
        } catch (err) {
            alert("Failed to parse the tale file. Make sure it's a valid .gtale or .json file.");
        }
    };
    reader.readAsText(file);
  };

  const handleBackupStory = (story: Story, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${story.title.replace(/\s+/g, '_')}.gtale`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleTogglePublish = async () => {
    if (currentStory && user) {
        const isPublic = !currentStory.isPublic;
        const updatedStory = { 
            ...currentStory, 
            isPublic, 
            publishedAt: isPublic ? Date.now() : currentStory.publishedAt 
        };
        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
        await supabaseService.saveStory(user.id, updatedStory);
    }
  };

  if (authLoading) return <div className="h-screen w-screen bg-dark-bg flex items-center justify-center font-serif text-text-muted">Loading Studio...</div>;

  return (
    <div className={`flex h-screen w-screen bg-dark-bg text-text-main transition-all duration-500 ${focusMode ? 'focus-mode' : ''}`}>
      {!focusMode && !['/auth', '/'].includes(location.pathname) && (
        <AppNavigation 
            userProfile={userProfile}
            user={user}
            onLogin={() => navigate('/auth')}
        />
      )}
      
      <div className={`flex-1 flex h-full relative ${['/', '/auth', '/onboarding', '/profile', '/settings', '/discover'].includes(location.pathname) ? 'overflow-y-auto no-scrollbar' : 'overflow-hidden'}`}>
        <Routes>
          <Route path="/" element={<LandingPage user={user} />} />
          <Route path="/auth" element={user ? <Navigate to="/library" /> : <Auth />} />
          
          <Route path="/discover" element={
            <StoryLibrary 
              stories={[]} // Will fetch public stories in component
              onSelectStory={handleSelectStory}
              onCreateNew={() => navigate('/onboarding')}
              onDeleteStory={() => {}}
              onImportStory={handleImportStory}
              onBackupStory={handleBackupStory}
              isPublicView={true}
              currentUserId={user?.id}
            />
          } />

          <Route path="/library" element={
            <StoryLibrary 
              stories={stories}
              onSelectStory={handleSelectStory}
              onCreateNew={() => navigate('/onboarding')}
              onDeleteStory={handleDeleteStory}
              onImportStory={handleImportStory}
              onBackupStory={handleBackupStory}
              currentUserId={user?.id}
            />
          } />

          <Route path="/onboarding" element={
            <Onboarding 
                onConfirm={handleCreateStory} 
                isLoading={isAiProcessing} 
                onCheckCredits={hasCredits}
                onDeductCredits={deductCredits}
                userTier={userTier}
             />
          } />

          <Route path="/writing/:storyId" element={
            currentStory ? (
                <>
                    {!focusMode && (
                        <div className="w-full md:w-2/5 h-full z-10 border-r border-dark-border flex-shrink-0">
                            <ChatInterface 
                                messages={messages} 
                                onSendMessage={handleSendMessage}
                                isTyping={isAiProcessing}
                                chapterTitle={currentStory.toc[currentStory.activeChapterIndex]?.title || 'Untitled'}
                            />
                        </div>
                    )}
                    <div className={`${focusMode ? 'w-full' : 'w-full md:w-3/5'} h-full relative`}>
                        <StoryBlueprint 
                            story={currentStory} 
                            currentChapterIndex={currentStory.activeChapterIndex}
                            onChapterSelect={(idx) => {
                                const updated = { ...currentStory, activeChapterIndex: idx };
                                setStories(prev => prev.map(s => s.id === updated.id ? updated : s));
                                if (user) supabaseService.saveStory(user.id, updated);
                            }}
                            onContentUpdate={handleContentUpdate}
                            checkCredits={hasCredits}
                            onDeductCredits={deductCredits}
                            focusMode={focusMode}
                            onToggleFocus={() => setFocusMode(!focusMode)}
                            isOwner={user?.id === currentStory.ownerId}
                            onTogglePublish={handleTogglePublish}
                        />
                    </div>
                </>
            ) : <Navigate to="/library" />
          } />

          <Route path="/profile" element={
            <UserProfileView 
                profile={userProfile}
                stories={stories}
                onUpdateProfile={setUserProfile}
                user={user}
                onLogout={() => { supabaseService.signOut(); navigate('/auth'); }}
            />
          } />

          <Route path="/settings" element={
            <SettingsView 
                onSave={() => {}}
                onCancel={() => navigate('/library')}
                userProfile={userProfile}
                onUpdateCredits={(amt) => {
                    const updated = { ...userProfile, credits: amt };
                    setUserProfile(updated);
                    if (user) supabaseService.updateProfile(user.id, updated);
                }}
                user={user}
            />
          } />

          <Route path="*" element={<Navigate to={user ? "/library" : "/auth"} />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
