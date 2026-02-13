
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Story, Message, StoryConfig, StoryBlueprintData, UserProfile, AppSettings, AI_COSTS } from './types';
import * as TextService from './services/textService';
import * as ImageService from './services/imageService';
import { applyTheme } from './services/themeService';
import { supabaseService } from './services/supabaseService';
import { supabase } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { analytics } from './services/analyticsService';
import { useNotify } from './services/NotificationContext';
import { useStore } from './services/store';

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
import AdminView from './components/AdminView';
import Dialog from './components/Dialog';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotify();

  const { 
    stories, setStories, 
    userProfile, setUserProfile,
    activeStoryId, setActiveStoryId,
    messages, setMessages,
    isAiProcessing, setIsAiProcessing,
    createStory, updateStoryContent, deductCredits
  } = useStore();
  
  const [dialog, setDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      type: 'info' | 'danger';
  }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
      type: 'info'
  });

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

  useEffect(() => {
    const syncData = async () => {
        if (user) {
            let profile = await supabaseService.getProfile(user.id);
            if (profile) {
                const metadata = user.user_metadata;
                if (metadata && (!profile.avatarUrl || profile.name === 'Guest Writer')) {
                    const updates: Partial<UserProfile> = {};
                    if (metadata.full_name && profile.name === 'Guest Writer') updates.name = metadata.full_name;
                    if (metadata.avatar_url && !profile.avatarUrl) updates.avatarUrl = metadata.avatar_url;
                    if (Object.keys(updates).length > 0) {
                        await supabaseService.updateProfile(user.id, updates);
                        profile = { ...profile, ...updates };
                    }
                }
                setUserProfile(profile);
                if (['/', '/auth'].includes(location.pathname)) navigate('/library');
                supabaseService.logAudit(user.id, 'auth', 'User logged in');
            } else {
                const metadata = user.user_metadata;
                const initialProfile: UserProfile = {
                    name: metadata?.full_name || "Guest Writer",
                    bio: "A traveler in the realm of imagination.",
                    avatarColor: "#60A5FA",
                    avatarUrl: metadata?.avatar_url,
                    joinedDate: Date.now(),
                    credits: 50,
                    subscriptionTier: 'free'
                };
                await supabaseService.updateProfile(user.id, initialProfile);
                setUserProfile(initialProfile);
                navigate('/library');
                supabaseService.logAudit(user.id, 'auth', 'New user registered');
            }
            const cloudStories = await supabaseService.getStories(user.id);
            setStories(cloudStories);
        } else {
            try {
                const savedStories = localStorage.getItem('gerertales_stories');
                if (savedStories) setStories(JSON.parse(savedStories));
                const savedProfile = localStorage.getItem('gerertales_profile');
                if (savedProfile) setUserProfile(JSON.parse(savedProfile));
                else setUserProfile({
                    name: "Guest Writer",
                    bio: "A traveler in the realm of imagination.",
                    avatarColor: "#60A5FA",
                    joinedDate: Date.now(),
                    credits: 50,
                    subscriptionTier: 'free'
                });
            } catch (e) {
                console.warn("Failed to load guest data", e);
            }
        }
    };
    syncData();
  }, [user]);

  useEffect(() => {
      const initSettings = async () => {
          try {
              let settings: AppSettings;
              const savedSettings = localStorage.getItem('gerertales_settings');
              if (savedSettings) settings = JSON.parse(savedSettings);
              else settings = { theme: 'nordic-dark' } as AppSettings;

              const globalConfig = await supabaseService.getSystemConfig();
              if (globalConfig) {
                  settings = { ...globalConfig, ...settings };
                  localStorage.setItem('gerertales_settings', JSON.stringify(settings));
              }
              applyTheme(settings.theme || 'nordic-dark');
          } catch (e) {
              applyTheme('nordic-dark');
          }
      };
      initSettings();
  }, [location.pathname]);

  const currentStory = stories.find(s => s.id === activeStoryId);
  
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'writing' && pathParts[2]) {
        const storyId = pathParts[2];
        if (!activeStoryId || activeStoryId !== storyId) {
            setActiveStoryId(storyId);
            if (!stories.find(s => s.id === storyId)) {
                supabaseService.getStoryById(storyId).then(story => {
                    if (story) setStories([story, ...stories]);
                });
            }
        }
    }
  }, [location.pathname]);

  const userTier = userProfile?.subscriptionTier || 'free';

  const hasCredits = (): boolean => {
      if (!userProfile || userProfile.credits <= 0) {
          notify("You have run out of credits. Please add more in Settings to continue.");
          return false;
      }
      return true;
  };

  const handleSelectStory = async (story: Story) => {
    if (!stories.find(s => s.id === story.id)) setStories([story, ...stories]);
    setActiveStoryId(story.id);
    setMessages([{
        id: 'restore',
        role: 'model',
        text: `Welcome to "${story.title}". We are currently at Chapter ${story.activeChapterIndex + 1}.`
    }]);
    navigate(`/writing/${story.id}`);
  };

  const handleDeleteStory = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDialog({
        isOpen: true,
        title: "Delete Tale",
        message: "Are you sure you want to discard this story forever? This action cannot be undone.",
        type: 'danger',
        onConfirm: () => {
            setStories(stories.filter(s => s.id !== id));
            if (user) supabaseService.deleteStory(user.id, id);
            setDialog(d => ({ ...d, isOpen: false }));
            notify("Tale discarded.");
        }
    });
  };

  const handleImportStory = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const imported = JSON.parse(content) as Story;
            imported.id = crypto.randomUUID();
            imported.lastModified = Date.now();
            imported.ownerId = user?.id;
            
            setStories([imported, ...stories]);
            if (user) await supabaseService.saveStory(user.id, imported);
            notify(`"${imported.title}" imported successfully.`);
        } catch (err) {
            notify("Failed to parse the tale file.");
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

  const handleSendMessage = async (text: string) => {
    if (!currentStory) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setIsAiProcessing(true);

    try {
      if (!hasCredits()) { setIsAiProcessing(false); return; }

      const currentChapter = currentStory.toc[currentStory.activeChapterIndex];
      const currentContent = currentChapter.content || '';
      const isProse = text.toLowerCase().includes('write') || currentContent.length < 50;

      if (isProse) {
        const { text: prose, cost } = await TextService.generateProse(
            currentMessages.map(m => ({role: m.role, text: m.text})), 
            currentChapter,
            currentStory.format,
            text,
            userTier
        );
        await deductCredits(user, cost, "Prose Generation");
        updateStoryContent(user, currentStory.id, currentStory.activeChapterIndex, currentContent ? `${currentContent}\n\n${prose}` : prose);
        setMessages([...currentMessages, { id: crypto.randomUUID(), role: 'model', text: "I've added that to the draft. How does it feel?" }]);
      } else {
        const { text: response, cost } = await TextService.generateProse(
            currentMessages.map(m => ({role: m.role, text: m.text})),
            currentChapter,
            currentStory.format,
            "Provide brief advice. Do not write prose.",
            userTier
        );
        await deductCredits(user, cost, "Chat");
        setMessages([...currentMessages, { id: crypto.randomUUID(), role: 'model', text: response }]);
      }
    } catch (error) {
      setMessages([...currentMessages, { id: crypto.randomUUID(), role: 'model', text: "Connection error." }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  if (authLoading) return <div className="h-screen w-screen bg-dark-bg flex items-center justify-center font-serif text-text-muted">Loading Studio...</div>;

  return (
    <div className={`flex h-screen w-screen bg-dark-bg text-text-main transition-all duration-500`}>
      {!['/auth', '/'].includes(location.pathname) && userProfile && (
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
              stories={[]} 
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
                onConfirm={(c, b) => createStory(user, c, b)} 
                isLoading={isAiProcessing} 
                onCheckCredits={hasCredits}
                onDeductCredits={(amt, feat) => deductCredits(user, amt, feat)}
                userTier={userTier}
             />
          } />

          <Route path="/writing/:storyId" element={
            currentStory ? (
                <>
                    <div className="w-full md:w-2/5 h-full z-10 border-r border-dark-border flex-shrink-0">
                        <ChatInterface 
                            messages={messages} 
                            onSendMessage={handleSendMessage}
                            isTyping={isAiProcessing}
                            chapterTitle={currentStory.toc[currentStory.activeChapterIndex]?.title || 'Untitled'}
                        />
                    </div>
                    <div className="w-full md:w-3/5 h-full relative">
                        <StoryBlueprint 
                            story={currentStory} 
                            currentChapterIndex={currentStory.activeChapterIndex}
                            onChapterSelect={(idx) => {
                                const updated = { ...currentStory, activeChapterIndex: idx };
                                setStories(stories.map(s => s.id === updated.id ? updated : s));
                                if (user) supabaseService.saveStory(user.id, updated);
                            }}
                            onContentUpdate={(content) => updateStoryContent(user, currentStory.id, currentStory.activeChapterIndex, content)}
                            onChapterUpdate={(idx, updates) => {
                                const updatedChapters = [...currentStory.toc];
                                updatedChapters[idx] = { ...updatedChapters[idx], ...updates };
                                const updatedStory = { ...currentStory, toc: updatedChapters };
                                setStories(stories.map(s => s.id === updatedStory.id ? updatedStory : s));
                                if (user) supabaseService.saveStory(user.id, updatedStory);
                            }}
                            checkCredits={hasCredits}
                            deductCredits={(amt, feat) => deductCredits(user, amt, feat)}
                            isOwner={user?.id === currentStory.ownerId}
                            onTogglePublish={async () => {
                                const isPublic = !currentStory.isPublic;
                                const updatedStory = { ...currentStory, isPublic, publishedAt: isPublic ? Date.now() : currentStory.publishedAt };
                                setStories(stories.map(s => s.id === updatedStory.id ? updatedStory : s));
                                if (user) await supabaseService.saveStory(user.id, updatedStory);
                            }}
                            userId={user?.id}
                            userCredits={userProfile?.credits}
                            onRefreshStory={async () => {
                                if (user) {
                                    const cloudStories = await supabaseService.getStories(user.id);
                                    setStories(cloudStories);
                                }
                            }}
                        />
                    </div>
                </>
            ) : <Navigate to="/library" />
          } />

          <Route path="/profile" element={
            userProfile ? (
                <UserProfileView 
                    profile={userProfile}
                    stories={stories}
                    onUpdateProfile={setUserProfile}
                    user={user}
                    onLogout={() => { supabaseService.signOut(); navigate('/auth'); }}
                />
            ) : <Navigate to="/auth" />
          } />

          <Route path="/settings" element={
            userProfile ? (
                <SettingsView 
                    onSave={() => {}}
                    onCancel={() => navigate('/library')}
                    userProfile={userProfile}
                    onUpdateCredits={(amt) => {
                        const updated = { ...userProfile, credits: amt };
                        setUserProfile(updated);
                        if (user) supabaseService.updateProfile(user.id, updated);
                    }}
                    onUpdateTier={(tier) => {
                        const updated = { ...userProfile, subscriptionTier: tier as any };
                        setUserProfile(updated);
                        if (user) supabaseService.updateProfile(user.id, updated);
                    }}
                    user={user}
                />
            ) : <Navigate to="/auth" />
          } />

          <Route path="/admin" element={userProfile?.isAdmin ? <AdminView /> : <Navigate to="/library" />} />
          <Route path="*" element={<Navigate to={user ? "/library" : "/auth"} />} />
        </Routes>
      </div>

      <Dialog 
          isOpen={dialog.isOpen}
          title={dialog.title}
          message={dialog.message}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(d => ({ ...d, isOpen: false }))}
          type={dialog.type}
          confirmLabel={dialog.type === 'danger' ? "Delete" : "Confirm"}
      />
    </div>
  );
};

export default App;
