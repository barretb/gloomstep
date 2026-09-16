import { describe, it, expect } from 'vitest';
import {
  dailyDate,
  dailyHeroIndex,
  dailySeed,
  getDailyResult,
  recordDailyResult,
} from '../src/systems/daily';
import { hashString } from '../src/systems/rng';
import { CHARACTERS } from '../src/data/characters';
import { createMemoryStorage } from '../src/systems/persistence';

describe('dailyDate', () => {
  it('uses the UTC calendar day', () => {
    expect(dailyDate(new Date('2026-09-16T23:59:59Z'))).toBe('2026-09-16');
    expect(dailyDate(new Date('2026-09-17T00:00:00Z'))).toBe('2026-09-17');
  });
});

describe('dailySeed and dailyHeroIndex', () => {
  it('derives the seed from the date', () => {
    expect(dailySeed('2026-09-16')).toBe(hashString('gloomstep-daily-2026-09-16'));
    expect(dailySeed('2026-09-16')).not.toBe(dailySeed('2026-09-17'));
  });

  it('picks a valid hero deterministically', () => {
    const index = dailyHeroIndex('2026-09-16');

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(CHARACTERS.length);
    expect(dailyHeroIndex('2026-09-16')).toBe(index);
  });
});

describe('daily results', () => {
  it('round-trips a recorded result', () => {
    const storage = createMemoryStorage();
    const result = { date: '2026-09-16', score: 420, won: false, depth: 4, turn: 300 };

    recordDailyResult(result, storage);

    expect(getDailyResult('2026-09-16', storage)).toEqual(result);
    expect(getDailyResult('2026-09-17', storage)).toBeNull();
  });

  it('keeps the higher score when a result already exists', () => {
    const storage = createMemoryStorage();
    recordDailyResult({ date: '2026-09-16', score: 500, won: true, depth: 10, turn: 900 }, storage);

    recordDailyResult({ date: '2026-09-16', score: 100, won: false, depth: 2, turn: 50 }, storage);

    expect(getDailyResult('2026-09-16', storage)!.score).toBe(500);
  });
});
