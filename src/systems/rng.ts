import { GameState } from '../types';

/** Stable 32-bit FNV-1a hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One mulberry32 step. Pure: the same state always yields the same result. */
export function stepRng(state: number): { state: number; value: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: next, value };
}

/** A draw function bound to a game state; every call advances `state.rngState`. */
export function rngFor(state: GameState): () => number {
  return () => {
    const step = stepRng(state.rngState);
    state.rngState = step.state;
    return step.value;
  };
}

/** A draw function over private state, for code that has no GameState. */
export function makeRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    const step = stepRng(state);
    state = step.state;
    return step.value;
  };
}

/** A fresh 32-bit seed. The only place game logic touches Math.random. */
export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
