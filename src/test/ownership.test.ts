import { describe, it, expect, vi } from 'vitest';
import { supabaseService } from '../services/supabaseService';
import { Story } from '../types';

describe('Ownership Enforcement', () => {
  it('_mapStory correctly preserves ownership metadata', () => {
    const rawStory = {
      id: 'tale-1',
      owner_id: 'user-a',
      title: 'Legend of the Code',
      profiles: { name: 'Author A' }
    };
    
    const mapped = (supabaseService as any)._mapStory(rawStory);
    expect(mapped.ownerId).toBe('user-a');
    expect(mapped.ownerName).toBe('Author A');
  });

  it('getStoryById handles missing stories gracefully', async () => {
    const story = await supabaseService.getStoryById('non-existent');
    expect(story).toBeNull();
  });
});
