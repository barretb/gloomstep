import { describe, it, expect } from 'vitest';
import { hashString, makeRng, rngFor, stepRng } from '../src/systems/rng';
import { makePlayer, makeState } from './helpers';

describe('makeRng', () => {
  it('reproduces the same sequence from the same seed', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());

    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('diverges for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);

    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
  });
});

describe('stepRng', () => {
  it('is a pure function of its input state', () => {
    expect(stepRng(99)).toEqual(stepRng(99));
    expect(stepRng(99).state).not.toBe(99);
  });
});

describe('hashString', () => {
  it('is stable and differs between dates', () => {
    expect(hashString('gloomstep-daily-2026-09-16')).toBe(hashString('gloomstep-daily-2026-09-16'));
    expect(hashString('gloomstep-daily-2026-09-16')).not.toBe(hashString('gloomstep-daily-2026-09-17'));
    expect(Number.isInteger(hashString('x'))).toBe(true);
  });
});

describe('rngFor', () => {
  it('advances the state it is bound to', () => {
    const state = makeState(makePlayer(1, 1));
    state.rngState = 7;
    const rng = rngFor(state);

    const first = rng();
    expect(state.rngState).not.toBe(7);
    const second = rng();

    expect(first).not.toBe(second);
    expect(makeRng(7)()).toBe(first);
  });
});
