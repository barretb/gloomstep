import { Entity, GameState } from '../types';

/** The floor boss if it is alive and inside the player's field of view. */
export function findVisibleBoss(state: GameState): Entity | null {
  for (const e of state.entities) {
    if (!e.boss || !e.position || !e.stats || e.stats.hp <= 0) continue;
    if (state.dungeon.visible[e.position.y]?.[e.position.x]) return e;
  }
  return null;
}

/**
 * Announces the Overlord the first time it comes into view. Returns true
 * when the message was pushed this call.
 */
export function checkBossSighting(state: GameState): boolean {
  if (state.bossSeen) return false;
  const boss = findVisibleBoss(state);
  if (!boss) return false;
  state.bossSeen = true;
  const name = boss.appearance?.name ?? 'The boss';
  state.messages.push(`The ${name} turns toward you. There is no way down; only through.`);
  return true;
}
