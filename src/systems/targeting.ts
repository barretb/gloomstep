import { Entity, GameState } from '../types';

/**
 * The nearest living monster the player can currently see within
 * `range` tiles (Manhattan distance), or null if there is none.
 */
export function findNearestVisibleMonster(state: GameState, range: number): Entity | null {
  const pos = state.player.position!;
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const e of state.entities) {
    if (!e.ai || !e.position || !e.stats || e.stats.hp <= 0) continue;
    if (!state.dungeon.visible[e.position.y]?.[e.position.x]) continue;

    const dist = Math.abs(e.position.x - pos.x) + Math.abs(e.position.y - pos.y);
    if (dist <= range && dist < nearestDist) {
      nearest = e;
      nearestDist = dist;
    }
  }

  return nearest;
}
