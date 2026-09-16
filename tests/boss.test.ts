import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../src/dungeon/generator';
import { BOSS, getEscortTemplate, getMonsterTemplate, MONSTERS } from '../src/data/monsters';
import { BOSS_DEPTH } from '../src/constants';
import { Tile } from '../src/types';
import { populateDungeon } from '../src/dungeon/populate';
import { makeCtx, makeMonster, makePlayer, makeState } from './helpers';
import { killEntity, VICTORY_BONUS } from '../src/systems/combat';
import { createEntity } from '../src/ecs/entity';
import { Game } from '../src/game';
import { createMemoryStorage, getSaveSummary, loadRun, saveRun, SAVE_KEY } from '../src/systems/persistence';

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

function makeBoss(x: number, y: number) {
  return createEntity({
    position: { x, y },
    stats: { ...BOSS.stats },
    appearance: { ...BOSS.appearance },
    ai: { ...BOSS.ai },
    blocksMovement: true,
    xpValue: BOSS.xpValue,
    boss: true,
  });
}

describe('slaying the boss', () => {
  it('flags the win, adds the bonus, and announces it', () => {
    const player = makePlayer(1, 1);
    const boss = makeBoss(2, 1);
    const state = makeState(player, [boss]);
    const scoreBefore = state.score;

    killEntity(state, boss, player);

    expect(state.won).toBe(true);
    expect(state.score).toBe(scoreBefore + BOSS.xpValue + VICTORY_BONUS);
    expect(state.messages.at(-1)).toContain('Overlord falls');
  });

  it('does not win on an ordinary kill', () => {
    const player = makePlayer(1, 1);
    const rat = makeMonster(2, 1);
    const state = makeState(player, [rat]);

    killEntity(state, rat, player);

    expect(state.won).toBe(false);
  });
});

describe('Game on the final floor', () => {
  function gameOnBossFloor() {
    const storage = createMemoryStorage();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);
    game.handleCharSelectInput('Enter');
    game.tick({ type: 'wait' });
    game.state.depth = BOSS_DEPTH;
    return { game, storage };
  }

  it('ends the run in victory on the turn the boss dies, before monsters act', () => {
    const { game, storage } = gameOnBossFloor();
    const pos = game.state.player.position!;
    const boss = makeBoss(pos.x + 1, pos.y);
    boss.stats!.hp = 1;
    boss.stats!.defense = 0;
    game.state.entities.push(boss);
    const monster = makeMonster(pos.x - 1, pos.y, { attack: 50 });
    game.state.entities.push(monster);
    const hpBefore = game.state.player.stats!.hp;

    game.tick({ type: 'move', dx: 1, dy: 0 });

    expect(game.state.won).toBe(true);
    expect(game.state.gameOver).toBe(true);
    expect(game.state.uiMode).toBe('gameover');
    expect(game.state.player.stats!.hp).toBe(hpBefore);
    expect(getSaveSummary(storage)).toBeNull();
    expect(game.state.highScores[0]).toBe(game.state.score);
  });

  it('refuses to descend from the final floor', () => {
    const { game } = gameOnBossFloor();
    const pos = game.state.player.position!;
    game.state.dungeon.tiles[pos.y][pos.x] = Tile.StairsDown;

    game.tick({ type: 'descend' });

    expect(game.state.depth).toBe(BOSS_DEPTH);
    expect(game.state.messages.at(-1)).toContain('sealed');
  });
});

describe('save compatibility', () => {
  it('loads an older save without a won flag as not won', () => {
    const storage = createMemoryStorage();
    saveRun(makeState(makePlayer(1, 1)), storage);
    const record = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete record.state.won;
    storage.setItem(SAVE_KEY, JSON.stringify(record));

    expect(loadRun(storage)!.won).toBe(false);
  });
});
