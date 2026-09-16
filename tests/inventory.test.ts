import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/systems/rng';
import { dropItem, pickupItem, useItem } from '../src/systems/inventory';
import { createEntity } from '../src/ecs/entity';
import { Entity } from '../src/types';
import { makeGear, makeMonster, makePlayer, makeState } from './helpers';

function makeLightningScroll(): Entity {
  return createEntity({
    appearance: { name: 'Scroll of Lightning', char: '?', color: '#ff0', sprite: 'scroll' },
    item: { kind: 'scroll', useEffect: { type: 'damage', amount: 100, range: 5 } },
  });
}

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
    const player = makePlayer(1, 1);
    player.inventory!.items.push(makeLightningScroll());
    const monster = makeMonster(3, 1, {}, 6);
    const state = makeState(player, [monster]);
    // Choose a generator state whose first draw lands under the 40% drop chance
    let seed = 1;
    while (makeRng(seed)() >= 0.4) seed++;
    state.rngState = seed;

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

describe('useItem equipping', () => {
  it('keeps body armor equipped when a shield is equipped', () => {
    const player = makePlayer(1, 1);
    const armor = makeGear('Leather Armor', 'body', { defenseBonus: 1 });
    const shield = makeGear('Wooden Shield', 'offhand', { defenseBonus: 1 });
    player.inventory!.items.push(armor, shield);
    const state = makeState(player);

    useItem(state, 0);
    useItem(state, 0);

    expect(player.equipment!.body).toBe(armor);
    expect(player.equipment!.offhand).toBe(shield);
    expect(player.inventory!.items).toHaveLength(0);
  });

  it('returns the previous helmet to the pack when a second helmet is equipped', () => {
    const player = makePlayer(1, 1);
    const leather = makeGear('Leather Helmet', 'head', { defenseBonus: 1 });
    const iron = makeGear('Iron Helmet', 'head', { defenseBonus: 2 });
    player.inventory!.items.push(leather, iron);
    const state = makeState(player);

    useItem(state, 0);
    useItem(state, 0);

    expect(player.equipment!.head).toBe(iron);
    expect(player.inventory!.items).toEqual([leather]);
  });

  it('refuses to equip gear that has no slot', () => {
    const player = makePlayer(1, 1);
    const broken = makeGear('Odd Trinket', 'body', { defenseBonus: 1 });
    delete broken.item!.slot;
    player.inventory!.items.push(broken);
    const state = makeState(player);

    expect(useItem(state, 0)).toBe(false);
    expect(player.inventory!.items).toEqual([broken]);
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
