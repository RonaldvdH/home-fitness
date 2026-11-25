import { DEFAULT_EXERCISES } from '../data/exercises.js';

export const STORAGE_KEYS = {
  EXERCISES: 'db5kg_studio_exercises_v2',
  SETTINGS: 'db5kg_studio_settings_v2',
  HISTORY: 'db5kg_studio_history_v2',
};

export const DEFAULT_SETTINGS = {
  workSec: 40,
  restSec: 20,
  rounds: 3,
  includeWarmup: true,
  includeCooldown: true,
};

export const APP_STATE = {
  exercises: [],
  settings: { ...DEFAULT_SETTINGS },
  history: [],
  timeline: [],
  currentIndex: 0,
  remainingSec: 0,
  isRunning: false,
  intervalId: null,
};

/**
 * Hydrate APP_STATE from browser localStorage with safe fallbacks.
 */
export function loadLocalState() {
  try {
    const savedEx = localStorage.getItem(STORAGE_KEYS.EXERCISES);
    APP_STATE.exercises = savedEx ? JSON.parse(savedEx) : structuredClone(DEFAULT_EXERCISES);

    const savedSet = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSet) {
      APP_STATE.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSet) };
    }

    const savedHist = localStorage.getItem(STORAGE_KEYS.HISTORY);
    APP_STATE.history = savedHist ? JSON.parse(savedHist) : [];
  } catch {
    APP_STATE.exercises = structuredClone(DEFAULT_EXERCISES);
  }
}

/**
 * Persist exercises, settings, and history to localStorage.
 */
export function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(APP_STATE.exercises));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(APP_STATE.settings));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(APP_STATE.history));
  } catch (err) {
    console.error('LocalStorage write failed:', err);
  }
}
