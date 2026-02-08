
import { Theme } from "../types";

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  textMain: string;
  textMuted: string;
  cobalt: string;
}

const THEMES: Record<Theme, ThemeColors> = {
  'nordic-dark': {
    bg: '#09090b',         // Zinc-950
    surface: '#18181b',    // Zinc-900
    border: '#27272a',     // Zinc-800
    textMain: '#e4e4e7',   // Zinc-200
    textMuted: '#a1a1aa',  // Zinc-400
    cobalt: '#60A5FA',     // Blue-400
  },
  'midnight': {
    bg: '#020617',         // Slate-950
    surface: '#0f172a',    // Slate-900
    border: '#1e293b',     // Slate-800
    textMain: '#f1f5f9',   // Slate-100
    textMuted: '#94a3b8',  // Slate-400
    cobalt: '#38bdf8',     // Sky-400
  },
  'paper-light': {
    bg: '#faf9f6',         // Off-white / paper
    surface: '#ffffff',    // White
    border: '#e4e4e7',     // Zinc-200
    textMain: '#27272a',   // Zinc-800
    textMuted: '#71717a',  // Zinc-500
    cobalt: '#2563eb',     // Blue-600
  },
};

export const applyTheme = (theme: Theme) => {
  const colors = THEMES[theme] || THEMES['nordic-dark'];
  const root = document.documentElement;

  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-text-main', colors.textMain);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-cobalt', colors.cobalt);
};

