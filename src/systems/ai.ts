import { Entity, GameState } from '../types';
import { moveEntity } from './movement';

export function runAI(state: GameState): void {
  const playerPos = state.player.position!;

  for (const entity of [...state.entities]) {
    if (!entity.ai || !entity.position || !entity.stats || entity.stats.hp <= 0) continue;

    const dx = playerPos.x - entity.position.x;
    const dy = playerPos.y - entity.position.y;
    const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance

    // Check if player is within alert range and visible
    const canSeePlayer = dist <= entity.ai.alertRange &&
      state.dungeon.visible[entity.position.y]?.[entity.position.x];

    if (canSeePlayer) {
      // Chase: move toward player
      chasePlayer(state, entity, dx, dy);
    } else if (entity.ai.type === 'wander') {
      // Wander randomly (50% chance to move)
      if (Math.random() < 0.5) {
        wander(state, entity);
      }
    }
    // chase-type monsters that can't see player just wait
  }
}

function chasePlayer(state: GameState, entity: Entity, dx: number, dy: number): void {
  // Move along the axis with greater distance
  let moveX = 0;
  let moveY = 0;

  if (Math.abs(dx) > Math.abs(dy)) {
    moveX = dx > 0 ? 1 : -1;
  } else if (dy !== 0) {
    moveY = dy > 0 ? 1 : -1;
  } else {
    moveX = dx > 0 ? 1 : -1;
  }

  // Try primary direction, then secondary
  if (!moveEntity(state, entity.id, moveX, moveY)) {
    // Try the other axis
    if (moveX !== 0 && dy !== 0) {
      moveEntity(state, entity.id, 0, dy > 0 ? 1 : -1);
    } else if (moveY !== 0 && dx !== 0) {
      moveEntity(state, entity.id, dx > 0 ? 1 : -1, 0);
    }
  }
}

function wander(state: GameState, entity: Entity): void {
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  const dir = dirs[Math.floor(Math.random() * dirs.length)];
  moveEntity(state, entity.id, dir.dx, dir.dy);
}
