import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../src/dungeon/generator';
import { BOSS, getEscortTemplate, getMonsterTemplate, MONSTERS } from '../src/data/monsters';
import { BOSS_DEPTH } from '../src/constants';
import { Tile } from '../src/types';

function hasStairs(depth: number): boolean {
  const { dungeon } = generateDungeon(depth);
  return dungeon.tiles.some((row) => row.includes(Tile.StairsDown));
}

describe('final floor generation', () => {
  it('places stairs on every floor above the boss depth', () => {
    for (let i = 0; i < 5; i++) {
      expect(hasStairs(BOSS_DEPTH - 1)).toBe(true);
    }
  });

  it('places no stairs on the boss depth', () => {
    for (let i = 0; i < 5; i++) {
      expect(hasStairs(BOSS_DEPTH)).toBe(false);
    }
  });
});

describe('boss data', () => {
  it('keeps the Overlord out of the random monster pool', () => {
    expect(MONSTERS.some((m) => m.appearance.name === 'Overlord')).toBe(false);
    for (let i = 0; i < 2000; i++) {
      expect(getMonsterTemplate(BOSS_DEPTH).appearance.name).not.toBe('Overlord');
    }
  });

  it('defines the Overlord as the boss', () => {
    expect(BOSS.appearance.name).toBe('Overlord');
    expect(BOSS.stats.maxHp).toBe(120);
    expect(BOSS.xpValue).toBe(250);
  });

  it('draws escorts only from deep monsters', () => {
    for (let i = 0; i < 200; i++) {
      expect(getEscortTemplate().minDepth).toBeGreaterThanOrEqual(8);
    }
  });
});
