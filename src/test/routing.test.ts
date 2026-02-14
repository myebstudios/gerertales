import { describe, it, expect } from 'vitest';
import { isGeminiModel, isXAIModel, isDalleModel } from '../services/aiUtils';

describe('AI Model Routing', () => {
  it('correctly identifies Gemini models', () => {
    expect(isGeminiModel('gemini-1.5-pro')).toBe(true);
    expect(isGeminiModel('imagen-3')).toBe(true);
    expect(isGeminiModel('grok-beta')).toBe(false);
  });

  it('correctly identifies xAI models', () => {
    expect(isXAIModel('grok-2-1212')).toBe(true);
    expect(isXAIModel('grok-beta')).toBe(true);
    expect(isXAIModel('gpt-4o')).toBe(false);
  });

  it('correctly identifies DALL-E models', () => {
    expect(isDalleModel('dall-e-3')).toBe(true);
    expect(isDalleModel('grok-imagine')).toBe(false);
  });
});
