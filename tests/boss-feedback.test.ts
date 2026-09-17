import { describe, it, expect } from 'vitest';
import { drawHud } from '../src/render/hud';
import { checkBossSighting, findVisibleBoss } from '../src/systems/boss';
import { findItemTemplate } from '../src/data/items';
import { populateDungeon } from '../src/dungeon/populate';
import { generateDungeon } from '../src/dungeon/generator';
import { makeRng } from '../src/systems/rng';
import { BOSS } from '../src/data/monsters';
import { BOSS_DEPTH } from '../src/constants';
import { createEntity } from '../src/ecs/entity';
import { Game } from '../src/game';
import { createMemoryStorage, saveRun } from '../src/systems/persistence';
import { makeCtx, makePlayer, makeState } from './helpers';

function makeBoss(x: number, y: number, hp = BOSS.stats.maxHp) {
  return createEntity({
    position: { x, y },
    stats: { ...BOSS.stats, hp },
    appearance: { ...BOSS.appearance },
    ai: { ...BOSS.ai },
    blocksMovement: true,
    xpValue: BOSS.xpValue,
    boss: true,
  });
}

function texts(calls: { name: string; args: unknown[] }[]): string[] {
  return calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
}

describe('boss health bar', () => {
  it('shows the Overlord\'s health while it is in view', () => {
    const state = makeState(makePlayer(1, 1), [makeBoss(4, 4, 96)]);
    const { ctx, calls } = makeCtx();

    drawHud(ctx, state);

    expect(texts(calls)).toContain('Overlord 96/120');
  });

  it('is absent when the boss is out of sight or not on the floor', () => {
    const hidden = makeState(makePlayer(1, 1), [makeBoss(4, 4)]);
    hidden.dungeon.visible[4][4] = false;
    const none = makeState(makePlayer(1, 1));

    for (const state of [hidden, none]) {
      const { ctx, calls } = makeCtx();
      drawHud(ctx, state);
      expect(texts(calls).some((t) => t.startsWith('Overlord '))).toBe(false);
    }
  });
});

describe('boss sighting', () => {
  it('finds a visible boss and announces it once per run', () => {
    const state = makeState(makePlayer(1, 1), [makeBoss(4, 4)]);

    expect(findVisibleBoss(state)).not.toBeNull();
    expect(checkBossSighting(state)).toBe(true);
    expect(state.bossSeen).toBe(true);
    expect(state.messages.at(-1)).toContain('Overlord');

    const before = state.messages.length;
    expect(checkBossSighting(state)).toBe(false);
    expect(state.messages.length).toBe(before);
  });

  it('does not announce a boss that is out of sight', () => {
    const state = makeState(makePlayer(1, 1), [makeBoss(4, 4)]);
    state.dungeon.visible[4][4] = false;

    expect(checkBossSighting(state)).toBe(false);
    expect(state.bossSeen).toBe(false);
  });

  it('is checked by the game at the end of a turn', () => {
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), createMemoryStorage(), { seedSource: () => 1 });
    game.handleCharSelectInput('Enter');
    const pos = game.state.player.position!;
    game.state.entities.push(makeBoss(pos.x + 2, pos.y));

    game.tick({ type: 'wait' });

    expect(game.state.bossSeen).toBe(true);
    expect(game.state.messages.some((m) => m.includes('Overlord turns'))).toBe(true);
  });
});

describe('boss sighting on resume', () => {
  it('announces a boss already in view as soon as the run is resumed', () => {
    const storage = createMemoryStorage();
    const state = makeState(makePlayer(1, 1), [makeBoss(3, 1)]);
    state.turn = 5;
    saveRun(state, storage);
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage, { seedSource: () => 1 });

    game.handleCharSelectInput('c');

    expect(game.state.bossSeen).toBe(true);
    expect(game.state.messages.at(-1)).toContain('Overlord turns');
  });
});

describe('last supply on the final floor', () => {
  it('always places an Elixir of Vitality in the arrival room on depth 10', () => {
    expect(findItemTemplate('Elixir of Vitality')).not.toBeNull();

    for (let run = 0; run < 20; run++) {
      const { dungeon, rooms } = generateDungeon(BOSS_DEPTH, makeRng(run + 1));
      const start = rooms[0];
      const player = makePlayer(Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2));
      const state = makeState(player);
      state.dungeon = dungeon;
      state.depth = BOSS_DEPTH;
      state.rngState = run + 1;

      populateDungeon(state, rooms);

      const elixirs = state.entities.filter(
        (e) =>
          e.item &&
          e.appearance?.name === 'Elixir of Vitality' &&
          e.position &&
          e.position.x >= start.x && e.position.x < start.x + start.w &&
          e.position.y >= start.y && e.position.y < start.y + start.h
      );
      expect(elixirs.length, `run ${run}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not add the supply on earlier floors', () => {
    const { dungeon, rooms } = generateDungeon(5, makeRng(3));
    const start = rooms[0];
    const state = makeState(makePlayer(Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2)));
    state.dungeon = dungeon;
    state.depth = 5;

    populateDungeon(state, rooms);

    const inStart = state.entities.filter(
      (e) => e.item && e.position && e.position.x >= start.x && e.position.x < start.x + start.w && e.position.y >= start.y && e.position.y < start.y + start.h
    );
    expect(inStart).toHaveLength(0);
  });
});
