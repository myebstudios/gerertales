import { describe, it, expect, vi } from 'vitest';
import { calculateCost, cleanJson } from '../services/aiUtils';

describe('aiUtils', () => {
  it('calculates cost correctly based on token rates', () => {
    // RATE_INPUT_TOKEN: 0.001, RATE_OUTPUT_TOKEN: 0.004
    const cost = calculateCost(100, 50); 
    // (100 * 0.001) + (50 * 0.004) = 0.1 + 0.2 = 0.3
    expect(cost).toBe(0.3);
  });

  it('cleans JSON blocks from AI strings', () => {
    const raw = '```json\n{"title": "Test"}\n```';
    expect(cleanJson(raw)).toBe('{"title": "Test"}');
    
    const plain = '{"test": true}';
    expect(cleanJson(plain)).toBe('{"test": true}');
  });
});
