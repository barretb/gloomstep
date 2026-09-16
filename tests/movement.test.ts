import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { moveEntity } from '../src/systems/movement';
import { makeMonster, makePlayer, makeState } from './helpers';

beforeEach(() => {
  // Pin the damage roll to 100% so expected values are exact.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('moveEntity', () => {
  it('does not let a monster attack another monster it bumps into', () => {
    const player = makePlayer(8, 8);
    const attacker = makeMonster(1, 1);
    const victim = makeMonster(2, 1);
    const state = makeState(player, [attacker, victim]);

    const moved = moveEntity(state, attacker.id, 1, 0);

    expect(moved).toBe(false);
    expect(victim.stats!.hp).toBe(5);
    expect(attacker.position).toEqual({ x: 1, y: 1 });
  });

  it('lets a monster attack the player it bumps into', () => {
    const player = makePlayer(2, 1, { defense: 0 });
    const monster = makeMonster(1, 1, { attack: 3 });
    const state = makeState(player, [monster]);

    const moved = moveEntity(state, monster.id, 1, 0);

    expect(moved).toBe(true);
    expect(player.stats!.hp).toBe(17);
  });

  it('lets the player attack a monster they bump into', () => {
    const player = makePlayer(1, 1, { attack: 3 });
    const monster = makeMonster(2, 1);
    const state = makeState(player, [monster]);

    moveEntity(state, player.id, 1, 0);

    expect(monster.stats!.hp).toBe(2);
  });
});
