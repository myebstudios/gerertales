import { describe, it, expect } from 'vitest';
import { supabaseService } from '../services/supabaseService';

describe('Story Logic', () => {
  it('correctly calculates reading time', () => {
    // This is tested in UI components usually, but we can verify the math logic
    const calculateReadingTime = (content: string) => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        return Math.ceil(words / 200);
    };

    expect(calculateReadingTime('One two three')).toBe(1);
    expect(calculateReadingTime(' '.repeat(1000))).toBe(0);
    expect(calculateReadingTime('word '.repeat(450))).toBe(3);
  });

  it('maps raw story data with correct defaults', () => {
    const raw = {
        id: '1',
        title: 'Title',
        toc: [{ chapter: 1, title: 'C1' }]
    };
    // @ts-ignore - testing resilience to partial data
    const mapped = supabaseService._mapStory(raw);
    expect(mapped.isPublic).toBeUndefined(); // Should follow DB field
    expect(mapped.activeChapterIndex).toBeUndefined(); // Should follow DB field if provided
  });
});
