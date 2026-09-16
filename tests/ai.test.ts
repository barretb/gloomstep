import { describe, it, expect } from 'vitest';
import { runAI } from '../src/systems/ai';
import { makeMonster, makePlayer, makeState } from './helpers';

describe('runAI', () => {
  it('lets an adjacent chase monster attack a visible player', () => {
    const player = makePlayer(1, 1, { defense: 0 });
    const monster = makeMonster(2, 1, { attack: 3 });
    const state = makeState(player, [monster]);

    runAI(state);

    expect(player.stats!.hp).toBe(17);
  });

  it('leaves an adjacent chase monster idle while the player is hidden', () => {
    const player = makePlayer(1, 1, { defense: 0 });
    player.statusEffects = [{ kind: 'stealth', turnsRemaining: 5 }];
    const monster = makeMonster(2, 1, { attack: 3 });
    const state = makeState(player, [monster]);

    runAI(state);

    expect(player.stats!.hp).toBe(20);
    expect(monster.position).toEqual({ x: 2, y: 1 });
  });
});
