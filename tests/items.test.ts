import { describe, it, expect } from 'vitest';
import { getLootPool, getRandomItem } from '../src/data/items';
import { depthWeight } from '../src/data/weighting';

function weightOf(depth: number, name: string): number | undefined {
  return getLootPool(depth).find((e) => e.template.appearance.name === name)?.weight;
}

describe('depthWeight', () => {
  it.each([
    [1, 1, 3],
    [2, 1, 3],
    [3, 1, 2],
    [4, 1, 2],
    [5, 1, 1],
    [9, 1, 1],
  ])('at depth %i an item from depth %i has weight %i', (depth, minDepth, expected) => {
    expect(depthWeight(depth, minDepth)).toBe(expected);
  });
});

describe('getLootPool', () => {
  it('only offers depth-1 items on the first floor', () => {
    const pool = getLootPool(1);

    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((e) => e.template.minDepth <= 1)).toBe(true);
  });

  it('favours newly unlocked gear on deep floors', () => {
    expect(weightOf(9, 'Legendary Blade')).toBe(3);
  });

  it('phases out gear six or more floors below the current depth', () => {
    expect(weightOf(9, 'Rusty Sword')).toBeUndefined();
    expect(weightOf(6, 'Rusty Sword')).toBe(1);
  });

  it('keeps consumables available at minimum weight on deep floors', () => {
    expect(weightOf(9, 'Health Potion')).toBe(1);
  });
});

describe('getRandomItem', () => {
  it('picks the first pool entry when the roll is zero', () => {
    const pool = getLootPool(3);

    expect(getRandomItem(3, () => 0)).toBe(pool[0].template);
  });

  it('picks the last pool entry when the roll is just under one', () => {
    const pool = getLootPool(3);

    expect(getRandomItem(3, () => 0.999999)).toBe(pool[pool.length - 1].template);
  });
});
