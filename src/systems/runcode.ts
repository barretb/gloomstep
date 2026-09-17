import { CHARACTERS } from '../data/characters';

/** A shareable identifier for a run: its seed and the hero index, both in base 36. */
export interface RunCode {
  seed: number;
  heroIndex: number;
}

const CODE_RE = /^([0-9a-z]{1,7})-([0-9a-z]{1,2})$/;

export function formatRunCode(seed: number, heroIndex: number): string {
  return `${(seed >>> 0).toString(36)}-${heroIndex.toString(36)}`;
}

/** Parses a code typed or pasted by a player. Case and surrounding whitespace are ignored. */
export function parseRunCode(input: string): RunCode | null {
  const match = CODE_RE.exec(input.trim().toLowerCase());
  if (!match) return null;
  const seed = parseInt(match[1], 36);
  const heroIndex = parseInt(match[2], 36);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null;
  if (!Number.isInteger(heroIndex) || heroIndex < 0 || heroIndex >= CHARACTERS.length) return null;
  return { seed, heroIndex };
}
