import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../src/dungeon/generator';
import { makeRng } from '../src/systems/rng';
import { Game } from '../src/game';
import { CHARACTERS } from '../src/data/characters';
import { createMemoryStorage, loadRun, saveRun } from '../src/systems/persistence';
import { Action } from '../src/types';
import { makeCtx } from './helpers';

const SCRIPT: Action[] = [
  { type: 'move', dx: 1, dy: 0 },
  { type: 'move', dx: 1, dy: 0 },
  { type: 'wait' },
  { type: 'move', dx: 0, dy: 1 },
  { type: 'pickup' },
  { type: 'move', dx: -1, dy: 0 },
  { type: 'wait' },
  { type: 'move', dx: 0, dy: -1 },
  { type: 'ability' },
  { type: 'wait' },
];

function seededGame(seed: number): Game {
  const { ctx } = makeCtx();
  const game = new Game(ctx, new Map(), createMemoryStorage(), { seedSource: () => seed });
  game.startRun(CHARACTERS[0], seed, 'normal');
  return game;
}

describe('generateDungeon', () => {
  it('is identical for the same seed and different for another', () => {
    const a = generateDungeon(3, makeRng(42));
    const b = generateDungeon(3, makeRng(42));
    const c = generateDungeon(3, makeRng(43));

    expect(a.dungeon.tiles).toEqual(b.dungeon.tiles);
    expect(a.rooms).toEqual(b.rooms);
    expect(a.dungeon.tiles).not.toEqual(c.dungeon.tiles);
  });
});

describe('whole runs', () => {
  it('match exactly when started from the same seed and given the same actions', () => {
    const a = seededGame(777);
    const b = seededGame(777);

    for (const action of SCRIPT) {
      a.tick(action);
      b.tick(action);
    }

    expect(a.state.dungeon.tiles).toEqual(b.state.dungeon.tiles);
    expect(a.state.entities).toEqual(b.state.entities);
    expect(a.state.player.stats).toEqual(b.state.player.stats);
    expect(a.state.rngState).toBe(b.state.rngState);
    expect(a.state.messages).toEqual(b.state.messages);
  });

  it('continue identically after a save and reload', () => {
    const live = seededGame(31337);
    const storage = createMemoryStorage();
    for (const action of SCRIPT.slice(0, 5)) live.tick(action);
    saveRun(live.state, storage);
    const { ctx } = makeCtx();
    const resumed = new Game(ctx, new Map(), storage, { seedSource: () => 0 });
    resumed.handleCharSelectInput('c');
    expect(loadRun(storage)).not.toBeNull();

    for (const action of SCRIPT.slice(5)) {
      live.tick(action);
      resumed.tick(action);
    }

    expect(resumed.state.entities).toEqual(live.state.entities);
    expect(resumed.state.rngState).toBe(live.state.rngState);
  });
});

describe('old saves', () => {
  it('load as a normal run with a fresh seed', () => {
    const storage = createMemoryStorage();
    const game = seededGame(9);
    saveRun(game.state, storage);
    const record = JSON.parse(storage.getItem('gloomstep-dungeon-save')!);
    delete record.state.seed;
    delete record.state.rngState;
    delete record.state.mode;
    storage.setItem('gloomstep-dungeon-save', JSON.stringify(record));

    const loaded = loadRun(storage)!;

    expect(loaded.mode).toBe('normal');
    expect(typeof loaded.seed).toBe('number');
    expect(loaded.rngState).toBe(loaded.seed);
  });
});
