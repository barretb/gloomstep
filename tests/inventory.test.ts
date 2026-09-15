import { afterEach, describe, it, expect, vi } from 'vitest';
import { dropItem, pickupItem, useItem } from '../src/systems/inventory';
import { createEntity } from '../src/ecs/entity';
import { Entity } from '../src/types';
import { makeMonster, makePlayer, makeState } from './helpers';

function makeLightningScroll(): Entity {
  return createEntity({
    appearance: { name: 'Scroll of Lightning', char: '?', color: '#ff0', sprite: 'scroll' },
    item: { kind: 'scroll', useEffect: { type: 'damage', amount: 100, range: 5 } },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useItem', () => {
  it('levels the player up when a scroll kill crosses the XP threshold', () => {
    const player = makePlayer(1, 1, { xpToNext: 4 });
    player.inventory!.items.push(makeLightningScroll());
    const monster = makeMonster(3, 1, {}, 4);
    const state = makeState(player, [monster]);

    useItem(state, 0);

    expect(player.stats!.level).toBe(2);
  });

  it('rolls a gold drop when a scroll kills a monster', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const player = makePlayer(1, 1);
    player.inventory!.items.push(makeLightningScroll());
    const monster = makeMonster(3, 1, {}, 6);
    const state = makeState(player, [monster]);

    useItem(state, 0);

    const gold = state.entities.find((e) => e.treasure);
    expect(gold?.position).toEqual({ x: 3, y: 1 });
  });

  it('returns false when the slot is empty', () => {
    const player = makePlayer(1, 1);
    const state = makeState(player);

    expect(useItem(state, 0)).toBe(false);
  });

  it('returns true when a scroll is consumed', () => {
    const player = makePlayer(1, 1);
    player.inventory!.items.push(makeLightningScroll());
    const state = makeState(player, [makeMonster(3, 1)]);

    expect(useItem(state, 0)).toBe(true);
  });
});

describe('pickupItem', () => {
  it('returns false when there is nothing to pick up', () => {
    const state = makeState(makePlayer(1, 1));

    expect(pickupItem(state)).toBe(false);
  });
});

describe('dropItem', () => {
  it('returns false when the slot is empty', () => {
    const state = makeState(makePlayer(1, 1));

    expect(dropItem(state, 0)).toBe(false);
  });
});
