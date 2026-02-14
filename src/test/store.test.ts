import { describe, it, expect, vi } from 'vitest';
import { useStore } from '../services/store';

describe('Story Store', () => {
  it('prevents credit deduction if balance is 0', async () => {
    const store = useStore.getState();
    store.setUserProfile({
      name: 'Test',
      credits: 0,
      joinedDate: Date.now(),
      bio: '',
      avatarColor: '',
      subscriptionTier: 'free'
    });

    const result = await useStore.getState().deductCredits(null, 10, 'Test');
    expect(result).toBe(true); 
    expect(useStore.getState().userProfile?.credits).toBe(0);
  });

  it('accurately subtracts credits in guest mode', async () => {
    const store = useStore.getState();
    store.setUserProfile({
      name: 'Guest',
      credits: 50,
      joinedDate: Date.now(),
      bio: '',
      avatarColor: '',
      subscriptionTier: 'free'
    });

    await store.deductCredits(null, 25, 'Test Action');
    expect(useStore.getState().userProfile?.credits).toBe(25);
  });

  it('updates story content correctly', async () => {
    const store = useStore.getState();
    const testStory = {
      id: '123',
      title: 'Old Title',
      toc: [{ chapter: 1, title: 'C1', content: 'Old content', isCompleted: false }],
      characters: [],
      locations: [],
      lastModified: 0,
      format: 'Novel' as any,
      spark: '',
      tone: '',
      activeChapterIndex: 0
    };
    
    store.setStories([testStory]);
    await store.updateStoryContent(null, '123', 0, 'New content');
    
    expect(useStore.getState().stories[0].toc[0].content).toBe('New content');
  });
});
