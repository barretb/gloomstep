import { CHARACTERS } from '../data/characters';
import { defaultStorage, RunStorage } from './persistence';
import { hashString, makeRng } from './rng';

export const DAILY_KEY = 'gloomstep-dungeon-daily';

export interface DailyResult {
  date: string;
  score: number;
  won: boolean;
  depth: number;
  turn: number;
}

/** The daily's calendar day, in UTC, as YYYY-MM-DD. */
export function dailyDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dailySeed(date: string): number {
  return hashString(`gloomstep-daily-${date}`);
}

/**
 * Everyone gets the same hero on a given day. Drawn from a private generator
 * over the daily seed so the dungeon's own sequence is untouched.
 */
export function dailyHeroIndex(date: string): number {
  return Math.floor(makeRng(dailySeed(date))() * CHARACTERS.length);
}

export function loadDailyResults(storage: RunStorage = defaultStorage()): Record<string, DailyResult> {
  try {
    const raw = storage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, DailyResult>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function getDailyResult(date: string, storage: RunStorage = defaultStorage()): DailyResult | null {
  return loadDailyResults(storage)[date] ?? null;
}

/** Records a finished daily. If one exists for the date, the higher score stays. */
export function recordDailyResult(result: DailyResult, storage: RunStorage = defaultStorage()): void {
  const all = loadDailyResults(storage);
  const existing = all[result.date];
  if (!existing || result.score > existing.score) {
    all[result.date] = result;
  }
  try {
    storage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
