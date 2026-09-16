import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game';
import { makeCtx } from './helpers';

function startGame(): Game {
  const { ctx } = makeCtx();
  const game = new Game(ctx, new Map());
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
