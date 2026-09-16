import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../src/dungeon/generator';
import { BOSS, getEscortTemplate, getMonsterTemplate, MONSTERS } from '../src/data/monsters';
import { BOSS_DEPTH } from '../src/constants';
import { Tile } from '../src/types';
import { populateDungeon } from '../src/dungeon/populate';
import { makePlayer, makeState } from './helpers';

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

describe('final floor population', () => {
  it('spawns exactly one Overlord and at least two deep escorts', () => {
    const { dungeon, rooms } = generateDungeon(BOSS_DEPTH);
    const start = rooms[0];
    const player = makePlayer(Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2));
    const state = makeState(player);
    state.dungeon = dungeon;
    state.depth = BOSS_DEPTH;

    populateDungeon(state, rooms);

    const bosses = state.entities.filter((e) => e.boss);
    expect(bosses).toHaveLength(1);
    expect(bosses[0].appearance!.name).toBe('Overlord');
    expect(bosses[0].stats!.maxHp).toBe(120);

    const deepNames = new Set(MONSTERS.filter((m) => m.minDepth >= 8).map((m) => m.appearance.name));
    const escorts = state.entities.filter((e) => e.ai && !e.boss && deepNames.has(e.appearance!.name));
    expect(escorts.length).toBeGreaterThanOrEqual(2);
  });

  it('spawns no boss above the final floor', () => {
    const { dungeon, rooms } = generateDungeon(9);
    const start = rooms[0];
    const state = makeState(makePlayer(Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2)));
    state.dungeon = dungeon;
    state.depth = 9;

    populateDungeon(state, rooms);

    expect(state.entities.some((e) => e.boss)).toBe(false);
  });
});
