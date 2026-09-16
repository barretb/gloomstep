import { GameState } from '../types';

export const SAVE_KEY = 'gloomstep-dungeon-save';
export const SAVE_VERSION = 1;

/** The subset of the Web Storage API the game needs. */
export interface RunStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveSummary {
  name: string;
  depth: number;
  turn: number;
}

interface SaveRecord {
  version: number;
  savedAt: number;
  state: GameState;
}

/** In-memory storage for tests and for browsers where localStorage is unavailable. */
export function createMemoryStorage(): RunStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

let fallbackStorage: RunStorage | null = null;

/** localStorage when it exists and is writable, otherwise a shared in-memory store. */
export function defaultStorage(): RunStorage {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const probe = `${SAVE_KEY}-probe`;
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // fall through to the in-memory store
  }
  fallbackStorage ??= createMemoryStorage();
  return fallbackStorage;
}

/** Writes the run. Does nothing once the run is over. */
export function saveRun(state: GameState, storage: RunStorage = defaultStorage()): void {
  if (state.gameOver) return;
  const record: SaveRecord = { version: SAVE_VERSION, savedAt: Date.now(), state };
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(record));
  } catch {
    // storage full or unavailable; the run simply is not saved this turn
  }
}

/**
 * Reads the saved run, or null if there is none or it is unusable.
 * Relinks `player` to its entity and returns the state on the game screen.
 */
export function loadRun(storage: RunStorage = defaultStorage()): GameState | null {
  const state = readValidState(storage);
  if (!state) return null;
  state.player = state.entities.find((e) => e.player)!;
  state.uiMode = 'game';
  return state;
}

export function clearRun(storage: RunStorage = defaultStorage()): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function getSaveSummary(storage: RunStorage = defaultStorage()): SaveSummary | null {
  const state = readValidState(storage);
  if (!state) return null;
  const player = state.entities.find((e) => e.player)!;
  return {
    name: player.appearance?.name ?? 'Adventurer',
    depth: state.depth,
    turn: state.turn,
  };
}

function readValidState(storage: RunStorage): GameState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    clearRun(storage);
    return null;
  }
  if (!isValidRecord(record)) {
    clearRun(storage);
    return null;
  }
  return record.state;
}

function isValidRecord(value: unknown): value is SaveRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<SaveRecord>;
  if (record.version !== SAVE_VERSION) return false;
  const state = record.state as Partial<GameState> | undefined;
  if (!state || typeof state !== 'object') return false;
  if (!state.dungeon || !Array.isArray(state.entities)) return false;
  return state.entities.some((e) => e && e.player === true);
}
