import { describe, it, expect } from 'vitest';
import { createEmptyEquipment, EQUIP_SLOTS, getAttackPower, getDefensePower } from '../src/systems/equipment';
import { createEntity } from '../src/ecs/entity';
import { makeGear, makePlayer } from './helpers';

describe('createEmptyEquipment', () => {
  it('has every slot empty', () => {
    const equipment = createEmptyEquipment();

    for (const { slot } of EQUIP_SLOTS) {
      expect(equipment[slot]).toBeNull();
    }
    expect(Object.keys(equipment)).toHaveLength(6);
  });
});

describe('getAttackPower', () => {
  it('adds the weapon bonus to base attack', () => {
    const player = makePlayer(1, 1, { attack: 5 });
    player.equipment!.weapon = makeGear('Sword', 'weapon', { attackBonus: 3 });

    expect(getAttackPower(player)).toBe(8);
  });

  it('returns base attack for an entity with no equipment', () => {
    const monster = createEntity({ stats: { hp: 1, maxHp: 1, attack: 4, defense: 0, level: 1, xp: 0, xpToNext: 0 } });

    expect(getAttackPower(monster)).toBe(4);
  });
});

describe('getDefensePower', () => {
  it('sums defense bonuses across every filled armor slot', () => {
    const player = makePlayer(1, 1, { defense: 1 });
    player.equipment!.body = makeGear('Chain Mail', 'body', { defenseBonus: 3 });
    player.equipment!.offhand = makeGear('Iron Shield', 'offhand', { defenseBonus: 3 });
    player.equipment!.head = makeGear('Iron Helmet', 'head', { defenseBonus: 2 });
    player.equipment!.hands = makeGear('Gauntlets', 'hands', { defenseBonus: 2 });
    player.equipment!.legs = makeGear('Greaves', 'legs', { defenseBonus: 2 });

    expect(getDefensePower(player)).toBe(13);
  });
});
