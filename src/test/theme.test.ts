import { describe, it, expect } from 'vitest';
import { applyTheme } from '../services/themeService';

describe('Theme Engine', () => {
  it('applies theme variables to document root', () => {
    // Mock CSS variables since we are in JSDOM
    applyTheme('nordic-dark');
    const style = window.getComputedStyle(document.documentElement);
    
    // In JSDOM, we might need to check the style object directly if getComputedStyle is limited
    expect(document.documentElement.style.getPropertyValue('--color-bg')).toBe('#09090b');
    
    applyTheme('paper-light');
    expect(document.documentElement.style.getPropertyValue('--color-bg')).toBe('#faf9f6');
  });
});
