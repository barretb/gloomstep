import { GameState } from '../types';
import { isWalkable } from '../dungeon/tiles';
import { resolveCombat } from './combat';

export function moveEntity(
  state: GameState,
  entityId: number,
  dx: number,
  dy: number
): boolean {
  const entity = state.entities.find((e) => e.id === entityId);
  if (!entity || !entity.position) return false;

  const newX = entity.position.x + dx;
  const newY = entity.position.y + dy;

  // Bounds check
  if (newX < 0 || newX >= state.dungeon.width || newY < 0 || newY >= state.dungeon.height) {
    return false;
  }

  // Wall check
  if (!isWalkable(state.dungeon.tiles[newY][newX])) {
    return false;
  }

  // Check for blocking entity at destination
  const blocker = state.entities.find(
    (e) => e.blocksMovement && e.position && e.position.x === newX && e.position.y === newY
  );

  if (blocker) {
    // Bump attack, but only between the player and a monster.
    // Monsters never fight each other; they are simply blocked.
    if (!entity.player && !blocker.player) {
      return false;
    }
    resolveCombat(state, entity, blocker);
    return true; // turn consumed
  }

  // Move
  entity.position.x = newX;
  entity.position.y = newY;

  // Auto-collect treasure on the new tile
  if (entity.player) {
    const treasureIdx = state.entities.findIndex(
      (e) => e.treasure && e.position && e.position.x === newX && e.position.y === newY
    );
    if (treasureIdx >= 0) {
      const t = state.entities[treasureIdx];
      const value = t.treasure!.value;
      state.treasureCollected += value;
      state.score += value;
      state.entities.splice(treasureIdx, 1);
      state.messages.push(`You found ${value} gold!`);
    }
  }

  return true;
}
