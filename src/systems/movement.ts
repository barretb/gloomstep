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
    // Bump attack
    resolveCombat(state, entity, blocker);
    return true; // turn consumed
  }

  // Move
  entity.position.x = newX;
  entity.position.y = newY;
  return true;
}
