import { Entity, GameState } from '../types';
import { killEntity } from './combat';

/** Returns true if an item was picked up (i.e. the action consumed a turn). */
export function pickupItem(state: GameState): boolean {
  const pos = state.player.position!;
  const inv = state.player.inventory;
  if (!inv) return false;

  const itemIndex = state.entities.findIndex(
    (e) => e.item && e.position && e.position.x === pos.x && e.position.y === pos.y
  );

  if (itemIndex < 0) {
    state.messages.push('Nothing to pick up here.');
    return false;
  }

  if (inv.items.length >= inv.capacity) {
    state.messages.push('Inventory is full!');
    return false;
  }

  const item = state.entities[itemIndex];
  state.entities.splice(itemIndex, 1);
  delete item.position; // remove from map
  inv.items.push(item);
  state.messages.push(`Picked up ${item.appearance?.name ?? 'an item'}.`);
  return true;
}

/** Returns true if an item was used or equipped (i.e. the action consumed a turn). */
export function useItem(state: GameState, index: number): boolean {
  const inv = state.player.inventory;
  if (!inv || index < 0 || index >= inv.items.length) return false;

  const item = inv.items[index];
  const itemComp = item.item;
  if (!itemComp) return false;

  switch (itemComp.kind) {
    case 'potion':
    case 'scroll':
      if (!itemComp.useEffect) return false;
      applyEffect(state, item);
      inv.items.splice(index, 1);
      return true;
    case 'weapon':
    case 'armor':
      return equipItem(state, item, index);
  }
}

/**
 * Moves an item from the pack into its equipment slot, swapping whatever
 * currently occupies that slot back into the pack. Returns false if the
 * item has no slot.
 */
function equipItem(state: GameState, item: Entity, invIndex: number): boolean {
  const slot = item.item?.slot;
  if (!slot) return false;

  const equip = state.player.equipment!;
  const inv = state.player.inventory!;

  inv.items.splice(invIndex, 1);
  const previous = equip[slot];
  if (previous) {
    inv.items.push(previous);
  }
  equip[slot] = item;
  state.messages.push(`Equipped ${item.appearance?.name ?? 'item'}.`);
  return true;
}

function applyEffect(state: GameState, item: Entity): void {
  const effect = item.item?.useEffect;
  if (!effect) return;

  const stats = state.player.stats!;
  const name = item.appearance?.name ?? 'item';

  switch (effect.type) {
    case 'heal': {
      const healed = Math.min(effect.amount, stats.maxHp - stats.hp);
      stats.hp += healed;
      state.messages.push(`Used ${name}. Healed ${healed} HP.`);
      break;
    }
    case 'damage': {
      // Damage nearest visible enemy in range
      const pos = state.player.position!;
      let nearest: Entity | null = null;
      let nearestDist = Infinity;

      for (const e of state.entities) {
        if (!e.ai || !e.position || !e.stats || e.stats.hp <= 0) continue;
        if (!state.dungeon.visible[e.position.y]?.[e.position.x]) continue;

        const dist = Math.abs(e.position.x - pos.x) + Math.abs(e.position.y - pos.y);
        if (dist <= effect.range && dist < nearestDist) {
          nearest = e;
          nearestDist = dist;
        }
      }

      if (nearest && nearest.stats) {
        nearest.stats.hp -= effect.amount;
        state.messages.push(
          `${name} strikes ${nearest.appearance?.name ?? 'enemy'} for ${effect.amount} damage!`
        );
        if (nearest.stats.hp <= 0) {
          killEntity(state, nearest, state.player);
        }
      } else {
        state.messages.push(`${name} fizzles... no target in range.`);
      }
      break;
    }
  }
}

/** Returns true if an item was dropped (i.e. the action consumed a turn). */
export function dropItem(state: GameState, index: number): boolean {
  const inv = state.player.inventory;
  if (!inv || index < 0 || index >= inv.items.length) return false;

  const item = inv.items[index];
  const pos = state.player.position!;

  inv.items.splice(index, 1);
  item.position = { x: pos.x, y: pos.y };
  state.entities.push(item);
  state.messages.push(`Dropped ${item.appearance?.name ?? 'item'}.`);
  return true;
}
