import { describe, it, expect } from 'vitest';
import { killEntity } from '../src/systems/combat';
import { makeMonster, makePlayer, makeState } from './helpers';

describe('level up', () => {
  it('raises defense on even levels only', () => {
    const player = makePlayer(1, 1, { attack: 5, defense: 1, xpToNext: 4 });
    const first = makeMonster(2, 1, {}, 4);
    const second = makeMonster(3, 1, {}, 6);
    const third = makeMonster(4, 1, {}, 9);
    const state = makeState(player, [first, second, third]);

    killEntity(state, first, player);
    expect(player.stats!.level).toBe(2);
    expect(player.stats!.defense).toBe(2);

    killEntity(state, second, player);
    expect(player.stats!.level).toBe(3);
    expect(player.stats!.defense).toBe(2);

    killEntity(state, third, player);
    expect(player.stats!.level).toBe(4);
    expect(player.stats!.defense).toBe(3);
    expect(player.stats!.attack).toBe(8);
  });
});
