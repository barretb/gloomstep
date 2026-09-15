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
