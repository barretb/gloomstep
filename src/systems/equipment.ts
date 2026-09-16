import { Entity, EquipmentComponent, EquipSlot } from '../types';

export interface EquipSlotInfo {
  slot: EquipSlot;
  label: string;
}

/** All equipment slots in display order. */
export const EQUIP_SLOTS: readonly EquipSlotInfo[] = [
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'body', label: 'Body' },
  { slot: 'offhand', label: 'Off-hand' },
  { slot: 'head', label: 'Head' },
  { slot: 'hands', label: 'Hands' },
  { slot: 'legs', label: 'Legs' },
];

export function createEmptyEquipment(): EquipmentComponent {
  return {
    weapon: null,
    body: null,
    offhand: null,
    head: null,
    hands: null,
    legs: null,
  };
}

/** Sum of attack bonuses across every filled slot. */
export function getAttackBonus(entity: Entity): number {
  return sumBonus(entity, (item) => item.item?.attackBonus ?? 0);
}

/** Sum of defense bonuses across every filled slot. */
export function getDefenseBonus(entity: Entity): number {
  return sumBonus(entity, (item) => item.item?.defenseBonus ?? 0);
}

/** Base attack plus all equipment bonuses. */
export function getAttackPower(entity: Entity): number {
  return (entity.stats?.attack ?? 0) + getAttackBonus(entity);
}

/** Base defense plus all equipment bonuses. */
export function getDefensePower(entity: Entity): number {
  return (entity.stats?.defense ?? 0) + getDefenseBonus(entity);
}

function sumBonus(entity: Entity, pick: (item: Entity) => number): number {
  const equipment = entity.equipment;
  if (!equipment) return 0;
  let total = 0;
  for (const { slot } of EQUIP_SLOTS) {
    const item = equipment[slot];
    if (item) total += pick(item);
  }
  return total;
}
