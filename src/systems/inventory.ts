import { Entity, GameState } from '../types';

export function pickupItem(state: GameState): void {
  const pos = state.player.position!;
  const inv = state.player.inventory;
  if (!inv) return;

  const itemIndex = state.entities.findIndex(
    (e) => e.item && e.position && e.position.x === pos.x && e.position.y === pos.y
  );

  if (itemIndex < 0) {
    state.messages.push('Nothing to pick up here.');
    return;
  }

  if (inv.items.length >= inv.capacity) {
    state.messages.push('Inventory is full!');
    return;
  }

  const item = state.entities[itemIndex];
  state.entities.splice(itemIndex, 1);
  delete item.position; // remove from map
  inv.items.push(item);
  state.messages.push(`Picked up ${item.appearance?.name ?? 'an item'}.`);
}

export function useItem(state: GameState, index: number): void {
  const inv = state.player.inventory;
  if (!inv || index < 0 || index >= inv.items.length) return;

  const item = inv.items[index];
  const itemComp = item.item;
  if (!itemComp) return;

  switch (itemComp.kind) {
    case 'potion':
    case 'scroll':
      if (itemComp.useEffect) {
        applyEffect(state, item);
        inv.items.splice(index, 1);
      }
      break;
    case 'weapon':
      equipWeapon(state, item, index);
      break;
    case 'armor':
      equipArmor(state, item, index);
      break;
  }
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
          state.messages.push(`${nearest.appearance?.name ?? 'Enemy'} is defeated!`);
          if (nearest.xpValue && state.player.stats) {
            state.player.stats.xp += nearest.xpValue;
            state.score += nearest.xpValue;
          }
          const idx = state.entities.indexOf(nearest);
          if (idx >= 0) state.entities.splice(idx, 1);
        }
      } else {
        state.messages.push(`${name} fizzles... no target in range.`);
      }
      break;
    }
  }
}

function equipWeapon(state: GameState, item: Entity, invIndex: number): void {
  const equip = state.player.equipment!;
  const inv = state.player.inventory!;

  // Swap current weapon back to inventory
  if (equip.weapon) {
    inv.items.push(equip.weapon);
  }

  inv.items.splice(invIndex, 1);
  equip.weapon = item;
  state.messages.push(`Equipped ${item.appearance?.name ?? 'weapon'}.`);
}

function equipArmor(state: GameState, item: Entity, invIndex: number): void {
  const equip = state.player.equipment!;
  const inv = state.player.inventory!;

  if (equip.armor) {
    inv.items.push(equip.armor);
  }

  inv.items.splice(invIndex, 1);
  equip.armor = item;
  state.messages.push(`Equipped ${item.appearance?.name ?? 'armor'}.`);
}
