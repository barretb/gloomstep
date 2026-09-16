import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game';
import { createEntity } from '../src/ecs/entity';
import { createMemoryStorage, getSaveSummary, RunStorage } from '../src/systems/persistence';
import { makeCtx } from './helpers';

function startGame(storage: RunStorage = createMemoryStorage()): Game {
  const { ctx } = makeCtx();
  const game = new Game(ctx, new Map(), storage);
  game.handleCharSelectInput('Enter');
  return game;
}

describe('Game.tick', () => {
  let game: Game;

  beforeEach(() => {
    game = startGame();
  });

  it('gives the chosen hero their class ability with no cooldown', () => {
    expect(game.state.player.ability).toEqual({ id: 'cleave', cooldownRemaining: 0 });
    expect(game.state.player.statusEffects).toEqual([]);
  });

  it('does not spend a turn when the ability refuses', () => {
    // The Human Warrior starts alone in the first room, so Cleave has no target.
    game.tick({ type: 'ability' });

    expect(game.state.turn).toBe(0);
    expect(game.state.player.ability!.cooldownRemaining).toBe(0);
  });

  it('counts the ability cooldown down at the end of each turn', () => {
    game.state.player.ability!.cooldownRemaining = 3;

    game.tick({ type: 'wait' });

    expect(game.state.player.ability!.cooldownRemaining).toBe(2);
  });

  it('does not spend a turn when pickup finds nothing', () => {
    game.tick({ type: 'pickup' });

    expect(game.state.turn).toBe(0);
  });

  it('does not spend a turn or close the inventory when using an empty slot', () => {
    game.tick({ type: 'toggleInventory' });

    game.tick({ type: 'useItem', index: 0 });

    expect(game.state.turn).toBe(0);
    expect(game.state.uiMode).toBe('inventory');
  });

  it('does not spend a turn or close the inventory when dropping an empty slot', () => {
    game.tick({ type: 'toggleInventory' });

    game.tick({ type: 'dropItem', index: 0 });

    expect(game.state.turn).toBe(0);
    expect(game.state.uiMode).toBe('inventory');
  });
});

describe('Game autosave', () => {
  it('saves the run after a turn', () => {
    const storage = createMemoryStorage();
    const game = startGame(storage);

    game.tick({ type: 'wait' });

    expect(getSaveSummary(storage)).toEqual({ name: 'Human Warrior', depth: 1, turn: 1 });
  });

  it('clears the save when the hero dies', () => {
    const storage = createMemoryStorage();
    const game = startGame(storage);
    game.tick({ type: 'wait' });
    game.state.player.stats!.hp = 0;

    game.tick({ type: 'wait' });

    expect(game.state.gameOver).toBe(true);
    expect(getSaveSummary(storage)).toBeNull();
  });
});

describe('Game resume', () => {
  function storageWithSave(): RunStorage {
    const storage = createMemoryStorage();
    const game = startGame(storage);
    game.tick({ type: 'wait' });
    game.tick({ type: 'wait' });
    return storage;
  }

  it('offers to continue when a save exists', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();

    const game = new Game(ctx, new Map(), storage);

    expect(game.state.uiMode).toBe('charselect');
    expect(game.resumeSummary).toEqual({ name: 'Human Warrior', depth: 1, turn: 2 });
  });

  it('restores the saved run when C is pressed', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('c');

    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(2);
    expect(game.state.player.appearance!.name).toBe('Human Warrior');
    expect(game.state.player).toBe(game.state.entities.find((e) => e.player));
    expect(game.state.messages.at(-1)).toContain('Welcome back');
  });

  it('asks for confirmation before a new game erases the save', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('Enter');

    expect(game.confirmAbandon).toBe(true);
    expect(game.state.uiMode).toBe('charselect');
    expect(getSaveSummary(storage)).not.toBeNull();
  });

  it('starts a new run and erases the save on the second Enter', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('Enter');
    game.handleCharSelectInput('Enter');

    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(0);
    expect(getSaveSummary(storage)).toBeNull();
  });

  it('cancels the confirmation when another key is pressed', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('Enter');
    game.handleCharSelectInput('ArrowRight');

    expect(game.confirmAbandon).toBe(false);
  });

  it('numbers new entities above every saved id after resuming', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);
    game.handleCharSelectInput('c');
    const maxSaved = Math.max(...game.state.entities.map((e) => e.id));

    const fresh = createEntity();

    expect(fresh.id).toBeGreaterThan(maxSaved);
  });
});
