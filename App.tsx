
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Story, Message, Chapter, StoryConfig, StoryBlueprintData, UserProfile, AppSettings } from './types';
import * as GeminiService from './services/geminiService';
import { applyTheme } from './services/themeService';
import Onboarding from './components/Onboarding';
import ChatInterface from './components/ChatInterface';
import StoryBlueprint from './components/StoryBlueprint';
import ContextSidebar from './components/ContextSidebar';
import AppNavigation from './components/AppNavigation';
import StoryLibrary from './components/StoryLibrary';
import UserProfileView from './components/UserProfileView';
import SettingsView from './components/SettingsView';

const App: React.FC = () => {
  // Load initial state
  const [stories, setStories] = useState<Story[]>(() => {
    try {
      const saved = localStorage.getItem('gerertales_stories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
        const saved = localStorage.getItem('gerertales_profile');
        if (saved) return JSON.parse(saved);
    } catch {}
    
    // Default Profile
    return {
        name: "Guest Writer",
        bio: "A traveler in the realm of imagination.",
        avatarColor: "#60A5FA",
        joinedDate: Date.now(),
        credits: 50 // Default starting credits
    };
  });

  const [appState, setAppState] = useState<AppState>(AppState.LIBRARY);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  // Track generation status to prevent duplicate requests
  const generatingBannersRef = useRef<Set<string>>(new Set());

  // Persistence Effects
  useEffect(() => {
    try {
        localStorage.setItem('gerertales_stories', JSON.stringify(stories));
    } catch (e) {
        console.warn("Storage Quota Exceeded: Could not save stories locally.", e);
        // In a real app, we might switch to IndexedDB or alert the user.
    }
  }, [stories]);

  useEffect(() => {
    try {
        localStorage.setItem('gerertales_profile', JSON.stringify(userProfile));
    } catch (e) {
        console.warn("Could not save profile locally.", e);
    }
  }, [userProfile]);

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
  }, [appState]);

  const currentStory = stories.find(s => s.id === activeStoryId);

  // -- Credit Management Helper --
  // Checks if user has positive balance to start
  const hasCredits = (): boolean => {
      if (userProfile.credits <= 0) {
          alert("You have run out of credits. Please add more in Settings to continue.");
          return false;
      }
      return true;
  };

  // Deducts exact cost after operation
  const deductCredits = (cost: number, featureName: string) => {
      const newBalance = Math.max(0, parseFloat((userProfile.credits - cost).toFixed(2)));
      console.log(`[Credits] Action: ${featureName} | Cost: ${cost} | Balance: ${newBalance}`);
      
      setUserProfile(prev => ({
          ...prev,
          credits: newBalance
      }));
  };

  const handleUpdateCredits = (newAmount: number) => {
      setUserProfile(prev => ({
          ...prev,
          credits: newAmount
      }));
  };


  // -- Navigation --

  const handleNavigate = (state: AppState) => {
    setAppState(state);
    if (state === AppState.LIBRARY || state === AppState.ONBOARDING || state === AppState.PROFILE || state === AppState.SETTINGS) {
      setActiveStoryId(null);
      setMessages([]);
    }
  };

  const handleSelectStory = (story: Story) => {
    setActiveStoryId(story.id);
    setAppState(AppState.WRITING);
    // Restore or Init Chat.
    setMessages([{
        id: 'restore',
        role: 'model',
        text: `Welcome back to "${story.title}". We are currently at Chapter ${story.activeChapterIndex + 1}.`
    }]);
  };

  const handleDeleteStory = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this story? This cannot be undone.")) {
      setStories(prev => prev.filter(s => s.id !== id));
      if (activeStoryId === id) {
        setAppState(AppState.LIBRARY);
        setActiveStoryId(null);
        setMessages([]);
      }
    }
  };

  const handleBackupStory = (story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    const latestStoryVersion = stories.find(s => s.id === story.id) || story;
    const data = JSON.stringify(latestStoryVersion, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${latestStoryVersion.title.replace(/\s+/g, '_')}.gtale`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportStory = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const importedStory = JSON.parse(content) as Story;
            if (!importedStory.title || !importedStory.toc) throw new Error("Invalid format");

            const newStory = {
                ...importedStory,
                id: crypto.randomUUID(),
                title: `${importedStory.title} (Imported)`,
                lastModified: Date.now()
            };

            setStories(prev => [newStory, ...prev]);
            alert(`Imported "${newStory.title}" successfully.`);
        } catch (error) {
            console.error(error);
            alert("Failed to import story. Invalid file format.");
        }
    };
    reader.readAsText(file);
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
      setUserProfile(newProfile);
  };

  const handleSettingsSave = () => {
       const savedSettings = localStorage.getItem('gerertales_settings');
        if (savedSettings) {
            const settings: AppSettings = JSON.parse(savedSettings);
            applyTheme(settings.theme);
        }
      alert('Settings saved successfully.');
  };

  // -- AI Logic --

  const handleCreateStory = async (config: StoryConfig, blueprint: StoryBlueprintData) => {
    setIsAiProcessing(true);
    setAppState(AppState.ARCHITECTING);
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
      setActiveStoryId(newStoryId);
      
      setMessages([{
        id: 'init',
        role: 'model',
        text: `I've initialized the ${config.format} blueprint for "${config.title}". Shall we start writing Chapter 1?`
      }]);
      setAppState(AppState.WRITING);

      // Background Cover Generation
      (async () => {
          try {
             if (hasCredits()) {
                 try {
                    const { url, cost } = await GeminiService.generateCoverImage(config.title, config.tone, config.spark);
                    if (url) {
                        setStories(prev => prev.map(s => s.id === newStoryId ? { ...s, coverImage: url } : s));
                        deductCredits(cost, "Cover Image");
                    }
                 } catch (e) {
                     console.warn("Cover generation failed", e);
                 }
             }
          } catch (bgError) {
              console.error("Critical background generation error:", bgError);
          }
      })();

    } catch (error) {
      console.error("Failed to generate story:", error);
      setAppState(AppState.ONBOARDING);
      alert("The Architect couldn't parse your idea. Please try again.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!currentStory) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsAiProcessing(true);

    try {
      if (!hasCredits()) {
           setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'model',
              text: "Insufficient credits to proceed."
          }]);
          setIsAiProcessing(false);
          return;
      }

      const currentChapter = currentStory.toc[currentStory.activeChapterIndex];
      const isRequestingProse = text.toLowerCase().includes('write') || 
                                text.toLowerCase().includes('describe') || 
                                text.toLowerCase().includes('scene') ||
                                currentChapter.content.length < 50;

      if (isRequestingProse) {
        // Generate Prose
        const { text: prose, cost } = await GeminiService.generateProse(
            updatedMessages.map(m => ({role: m.role, text: m.text})), 
            currentChapter,
            currentStory.format,
            text
        );
        
        deductCredits(cost, "Prose Generation");

        const updatedChapters = [...currentStory.toc];
        updatedChapters[currentStory.activeChapterIndex] = {
            ...currentChapter,
            content: currentChapter.content ? `${currentChapter.content}\n\n${prose}` : prose
        };

        const updatedStory = {
            ...currentStory,
            toc: updatedChapters,
            lastModified: Date.now()
        };

        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));

        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'model',
            text: "I've added that to the draft. How does it feel?"
        }]);

      } else {
        // Chat
        const { text: response, cost } = await GeminiService.generateProse(
            updatedMessages.map(m => ({role: m.role, text: m.text})),
            currentChapter,
            currentStory.format,
            "Provide brief advice or answer the user's question about the story direction. Do not write prose."
        );
        
        deductCredits(cost, "Chat");

         setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'model',
            text: response
        }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'model',
          text: "I'm having trouble connecting to the muse (API Error)."
      }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleChapterSelect = (index: number) => {
    if (currentStory) {
        const updatedStory = { ...currentStory, activeChapterIndex: index };
        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'model',
            text: `Switched focus to Chapter ${index + 1}: ${updatedStory.toc[index].title}.`
        }]);
    }
  };

  const handleContentUpdate = (newContent: string) => {
    if (currentStory) {
        const updatedChapters = [...currentStory.toc];
        updatedChapters[currentStory.activeChapterIndex].content = newContent;
        const updatedStory = { ...currentStory, toc: updatedChapters, lastModified: Date.now() };
        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
    }
  };

  const handleChapterUpdate = (chapterIndex: number, updates: Partial<Chapter>) => {
    if (currentStory) {
        const updatedChapters = [...currentStory.toc];
        updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], ...updates };
        const updatedStory = { ...currentStory, toc: updatedChapters, lastModified: Date.now() };
        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-bg text-text-main transition-colors duration-300">
      <AppNavigation 
        currentState={appState} 
        onNavigate={handleNavigate}
        userProfile={userProfile}
      />
      <div className="flex-1 flex h-full overflow-hidden relative">
        {appState === AppState.LIBRARY && (
          <StoryLibrary 
            stories={stories}
            onSelectStory={handleSelectStory}
            onCreateNew={() => setAppState(AppState.ONBOARDING)}
            onDeleteStory={handleDeleteStory}
            onImportStory={handleImportStory}
            onBackupStory={handleBackupStory}
          />
        )}
        {appState === AppState.PROFILE && (
            <UserProfileView 
                profile={userProfile}
                stories={stories}
                onUpdateProfile={handleUpdateProfile}
            />
        )}
        {appState === AppState.SETTINGS && (
            <SettingsView 
                onSave={handleSettingsSave}
                onCancel={() => handleNavigate(AppState.LIBRARY)}
                userProfile={userProfile}
                onUpdateCredits={handleUpdateCredits}
            />
        )}
        {(appState === AppState.ONBOARDING || appState === AppState.ARCHITECTING) && (
          <div className="w-full h-full">
             <Onboarding 
                onConfirm={handleCreateStory} 
                isLoading={appState === AppState.ARCHITECTING} 
                onCheckCredits={hasCredits}
                onDeductCredits={deductCredits}
             />
          </div>
        )}
        {appState === AppState.WRITING && currentStory && (
            <>
                <div className="w-full md:w-2/5 h-full z-10 shadow-xl md:shadow-none border-r border-dark-border flex-shrink-0">
                <ChatInterface 
                    messages={messages} 
                    onSendMessage={handleSendMessage}
                    isTyping={isAiProcessing}
                    chapterTitle={currentStory.toc[currentStory.activeChapterIndex]?.title || 'Untitled'}
                />
                </div>
                <div className="hidden md:block md:w-3/5 h-full relative">
                    <StoryBlueprint 
                        story={currentStory} 
                        currentChapterIndex={currentStory.activeChapterIndex}
                        onChapterSelect={handleChapterSelect}
                        onContentUpdate={handleContentUpdate}
                        onChapterUpdate={handleChapterUpdate}
                        onExport={() => {}}
                        checkCredits={hasCredits}
                        deductCredits={deductCredits}
                    />
                    <ContextSidebar 
                        characters={currentStory.characters} 
                        locations={currentStory.locations}
                        tone={currentStory.tone} 
                        toc={currentStory.toc}
                        activeChapterIndex={currentStory.activeChapterIndex}
                        onJumpToChapter={handleChapterSelect}
                    />
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default App;

