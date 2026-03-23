import { Entity, GameState } from '../types';
import { createEntity } from '../ecs/entity';

function getAttackPower(entity: Entity): number {
  let atk = entity.stats?.attack ?? 0;
  if (entity.equipment?.weapon?.item?.attackBonus) {
    atk += entity.equipment.weapon.item.attackBonus;
  }
  return atk;
}

function getDefensePower(entity: Entity): number {
  let def = entity.stats?.defense ?? 0;
  if (entity.equipment?.armor?.item?.defenseBonus) {
    def += entity.equipment.armor.item.defenseBonus;
  }
  return def;
}

export function resolveCombat(state: GameState, attacker: Entity, defender: Entity): void {
  if (!attacker.stats || !defender.stats) return;

  const atk = getAttackPower(attacker);
  const def = getDefensePower(defender);
  const damage = Math.max(1, atk - def);

  defender.stats.hp -= damage;

  const attackerName = attacker.player ? 'You' : attacker.appearance?.name ?? 'Something';
  const defenderName = defender.player ? 'you' : defender.appearance?.name ?? 'something';
  const verb = attacker.player ? 'hit' : 'hits';

  state.messages.push(`${attackerName} ${verb} ${defenderName} for ${damage} damage.`);

  if (defender.stats.hp <= 0) {
    killEntity(state, defender, attacker);
  }
}

function killEntity(state: GameState, victim: Entity, killer: Entity): void {
  const name = victim.appearance?.name ?? 'Something';

  if (victim.player) {
    state.messages.push('You have died!');
    state.gameOver = true;
    state.uiMode = 'gameover';
    return;
  }

  state.messages.push(`${name} is defeated!`);

  // Award XP
  if (killer.player && killer.stats && victim.xpValue) {
    killer.stats.xp += victim.xpValue;
    state.score += victim.xpValue;
    checkLevelUp(state, killer);
  }

  // Chance to drop treasure
  if (victim.position && victim.xpValue && Math.random() < 0.4) {
    const value = Math.max(1, Math.ceil(victim.xpValue / 3) + Math.floor(Math.random() * victim.xpValue / 3));
    const drop = createEntity({
      position: { x: victim.position.x, y: victim.position.y },
      appearance: { name: 'Gold', char: '$', color: '#ffd700', sprite: 'treasure' },
      treasure: { value },
    });
    state.entities.push(drop);
  }

  // Remove from entities
  const idx = state.entities.indexOf(victim);
  if (idx >= 0) {
    state.entities.splice(idx, 1);
  }
}

function checkLevelUp(state: GameState, entity: Entity): void {
  if (!entity.stats) return;
  while (entity.stats.xp >= entity.stats.xpToNext) {
    entity.stats.xp -= entity.stats.xpToNext;
    entity.stats.level += 1;
    entity.stats.maxHp += 5;
    entity.stats.hp = Math.min(entity.stats.hp + 5, entity.stats.maxHp);
    entity.stats.attack += 1;
    entity.stats.defense += 1;
    entity.stats.xpToNext = Math.floor(entity.stats.xpToNext * 1.5);
    state.messages.push(`You reached level ${entity.stats.level}!`);
  }
}
