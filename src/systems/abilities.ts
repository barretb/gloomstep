import { Entity, GameState, StatusEffect } from '../types';
import { ABILITIES, AbilityDefinition } from '../data/abilities';
import { killEntity, resolveCombat } from './combat';
import { findNearestVisibleMonster } from './targeting';

/**
 * Fires the player's class ability. Returns true if it took effect (the
 * turn is consumed). Returns false, with a message, if the ability is on
 * cooldown or has no valid target; no turn is consumed in that case.
 */
export function useAbility(state: GameState): boolean {
  const ability = state.player.ability;
  if (!ability) return false;

  const def = ABILITIES[ability.id];
  if (ability.cooldownRemaining > 0) {
    state.messages.push(`${def.name} is not ready (${ability.cooldownRemaining} turns).`);
    return false;
  }

  if (!applyAbility(state, def)) return false;

  ability.cooldownRemaining = def.cooldown;
  return true;
}

/** Call once per end of turn: counts down the cooldown and expires status effects. */
export function tickAbilities(state: GameState): void {
  const player = state.player;

  if (player.ability && player.ability.cooldownRemaining > 0) {
    player.ability.cooldownRemaining--;
  }

  if (!player.statusEffects) return;
  const remaining: StatusEffect[] = [];
  for (const effect of player.statusEffects) {
    effect.turnsRemaining--;
    if (effect.turnsRemaining > 0) {
      remaining.push(effect);
    } else {
      state.messages.push(fadeMessage(effect));
    }
  }
  player.statusEffects = remaining;
}

/** True while the entity has an active stealth effect. */
export function isHidden(entity: Entity): boolean {
  return (entity.statusEffects ?? []).some((e) => e.kind === 'stealth');
}

function fadeMessage(effect: StatusEffect): string {
  if (effect.kind === 'stealth') return 'You are visible again.';
  return effect.stat === 'attack' ? 'Your rage fades.' : 'Your guard relaxes.';
}

function applyAbility(state: GameState, def: AbilityDefinition): boolean {
  const effect = def.effect;
  switch (effect.type) {
    case 'cleave':
      return applyCleave(state, def.name);
    case 'bolt': {
      const level = state.player.stats?.level ?? 1;
      return applyBolt(state, def.name, effect.base + effect.perLevel * level, effect.range);
    }
    case 'buff':
      return applyBuff(state, def.name, effect.stat, effect.amount, effect.turns);
    case 'stealth':
      return applyStealth(state, def.name, effect.turns);
    case 'reveal':
      return applyReveal(state, def.name, effect.radius);
    case 'heal':
      return applyHeal(state, def.name, effect.fraction);
  }
}

function applyCleave(state: GameState, name: string): boolean {
  const pos = state.player.position!;
  const targets = state.entities.filter(
    (e) =>
      e.ai && e.stats && e.stats.hp > 0 && e.position &&
      Math.abs(e.position.x - pos.x) <= 1 &&
      Math.abs(e.position.y - pos.y) <= 1
  );
  if (targets.length === 0) {
    state.messages.push('No enemies adjacent.');
    return false;
  }

  state.messages.push(`You unleash ${name}!`);
  // Iterate a copy: resolveCombat removes slain monsters from state.entities.
  for (const target of targets) {
    resolveCombat(state, state.player, target);
  }
  return true;
}

function applyBolt(state: GameState, name: string, damage: number, range: number): boolean {
  const target = findNearestVisibleMonster(state, range);
  if (!target || !target.stats) {
    state.messages.push('No target in range.');
    return false;
  }

  target.stats.hp -= damage;
  state.messages.push(`${name} strikes ${target.appearance?.name ?? 'enemy'} for ${damage} damage!`);
  if (target.stats.hp <= 0) {
    killEntity(state, target, state.player);
  }
  return true;
}

function applyBuff(
  state: GameState,
  name: string,
  stat: 'attack' | 'defense',
  amount: number,
  turns: number
): boolean {
  const effects = (state.player.statusEffects ??= []);
  const buff: StatusEffect = { kind: 'buff', stat, amount, turnsRemaining: turns };
  const existing = effects.findIndex((e) => e.kind === 'buff' && e.stat === stat);
  if (existing >= 0) {
    effects[existing] = buff;
  } else {
    effects.push(buff);
  }
  const label = stat === 'attack' ? 'ATK' : 'DEF';
  state.messages.push(`You use ${name}! ${label} +${amount} for ${turns} turns.`);
  return true;
}

function applyStealth(state: GameState, name: string, turns: number): boolean {
  const effects = (state.player.statusEffects ??= []);
  const stealth: StatusEffect = { kind: 'stealth', turnsRemaining: turns };
  const existing = effects.findIndex((e) => e.kind === 'stealth');
  if (existing >= 0) {
    effects[existing] = stealth;
  } else {
    effects.push(stealth);
  }
  state.messages.push(`You use ${name}. The monsters lose sight of you.`);
  return true;
}

function applyReveal(state: GameState, name: string, radius: number): boolean {
  const pos = state.player.position!;
  const { explored, width, height } = state.dungeon;
  const minY = Math.max(0, pos.y - radius);
  const maxY = Math.min(height - 1, pos.y + radius);
  const minX = Math.max(0, pos.x - radius);
  const maxX = Math.min(width - 1, pos.x + radius);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      explored[y][x] = true;
    }
  }
  state.messages.push(`You use ${name}. The layout comes into focus.`);
  return true;
}

function applyHeal(state: GameState, name: string, fraction: number): boolean {
  const stats = state.player.stats!;
  const amount = Math.max(1, Math.floor(stats.maxHp * fraction));
  const healed = Math.min(amount, stats.maxHp - stats.hp);
  if (healed <= 0) {
    state.messages.push('You are already at full health.');
    return false;
  }
  stats.hp += healed;
  state.messages.push(`You use ${name}. Healed ${healed} HP.`);
  return true;
}
