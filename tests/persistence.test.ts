import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  clearRun,
  getSaveSummary,
  loadRun,
  saveRun,
  SAVE_KEY,
} from '../src/systems/persistence';
import { makeGear, makePlayer, makeState, makeMonster } from './helpers';

function savedState() {
  const player = makePlayer(3, 4, { hp: 12 });
  player.appearance!.name = 'Elf Sentinel';
  player.inventory!.items.push(makeGear('Short Sword', 'weapon', { attackBonus: 2 }));
  player.equipment!.head = makeGear('Iron Helmet', 'head', { defenseBonus: 2 });
  const state = makeState(player, [makeMonster(6, 6)]);
  state.depth = 4;
  state.turn = 212;
  state.score = 310;
  return state;
}

describe('saveRun and loadRun', () => {
  it('round-trips the state and relinks the player to its entity', () => {
    const storage = createMemoryStorage();
    const original = savedState();

    saveRun(original, storage);
    const loaded = loadRun(storage);

    expect(loaded).not.toBeNull();
    expect(loaded).toEqual({ ...original, uiMode: 'game' });
    expect(loaded!.player).toBe(loaded!.entities.find((e) => e.player));
    expect(loaded!.player.equipment!.head!.appearance!.name).toBe('Iron Helmet');
  });

  it('returns null when nothing is stored', () => {
    expect(loadRun(createMemoryStorage())).toBeNull();
  });

  it('returns null and removes a save that is not JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');

    expect(loadRun(storage)).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('returns null and removes a save from a different version', () => {
    const storage = createMemoryStorage();
    saveRun(savedState(), storage);
    const record = JSON.parse(storage.getItem(SAVE_KEY)!);
    record.version = 99;
    storage.setItem(SAVE_KEY, JSON.stringify(record));

    expect(loadRun(storage)).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('writes nothing once the run is over', () => {
    const storage = createMemoryStorage();
    const state = savedState();
    state.gameOver = true;

    saveRun(state, storage);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('forces the UI mode back to the game screen', () => {
    const storage = createMemoryStorage();
    const state = savedState();
    state.uiMode = 'inventory';

    saveRun(state, storage);

    expect(loadRun(storage)!.uiMode).toBe('game');
  });
});

describe('getSaveSummary', () => {
  it('reports the hero, depth, and turn of the saved run', () => {
    const storage = createMemoryStorage();
    saveRun(savedState(), storage);

    expect(getSaveSummary(storage)).toEqual({ name: 'Elf Sentinel', depth: 4, turn: 212 });
  });

  it('is null after clearRun', () => {
    const storage = createMemoryStorage();
    saveRun(savedState(), storage);

    clearRun(storage);

    expect(getSaveSummary(storage)).toBeNull();
  });
});
