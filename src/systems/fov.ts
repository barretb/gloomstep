import { FOV_RADIUS } from '../constants';
import { GameState } from '../types';
import { isOpaque } from '../dungeon/tiles';

export function computeFOV(state: GameState): void {
  const { dungeon } = state;
  const pos = state.player.position!;

  // Reset visibility
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      dungeon.visible[y][x] = false;
    }
  }

  // Player's tile is always visible
  dungeon.visible[pos.y][pos.x] = true;
  dungeon.explored[pos.y][pos.x] = true;

  // Cast light in all 8 octants
  for (let octant = 0; octant < 8; octant++) {
    castLight(state, pos.x, pos.y, FOV_RADIUS, 1, 1.0, 0.0, octant);
  }
}

// Transform coordinates based on octant
function transformOctant(ox: number, oy: number, octant: number): [number, number] {
  switch (octant) {
    case 0: return [ox, -oy];
    case 1: return [oy, -ox];
    case 2: return [oy, ox];
    case 3: return [ox, oy];
    case 4: return [-ox, oy];
    case 5: return [-oy, ox];
    case 6: return [-oy, -ox];
    case 7: return [-ox, -oy];
    default: return [ox, oy];
  }
}

function castLight(
  state: GameState,
  cx: number,
  cy: number,
  radius: number,
  row: number,
  startSlope: number,
  endSlope: number,
  octant: number
): void {
  if (startSlope < endSlope) return;

  const { dungeon } = state;
  let nextStartSlope = startSlope;

  for (let i = row; i <= radius; i++) {
    let blocked = false;

    for (let dx = -i, dy = -i; dx <= 0; dx++) {
      const leftSlope = (dx - 0.5) / (dy + 0.5);
      const rightSlope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < rightSlope) continue;
      if (endSlope > leftSlope) break;

      const [tx, ty] = transformOctant(dx, dy, octant);
      const mapX = cx + tx;
      const mapY = cy + ty;

      // Distance check (circular FOV)
      const dist2 = dx * dx + dy * dy;
      if (dist2 > radius * radius) continue;

      if (mapX >= 0 && mapX < dungeon.width && mapY >= 0 && mapY < dungeon.height) {
        dungeon.visible[mapY][mapX] = true;
        dungeon.explored[mapY][mapX] = true;
      }

      if (blocked) {
        if (mapX < 0 || mapX >= dungeon.width || mapY < 0 || mapY >= dungeon.height ||
            isOpaque(dungeon.tiles[mapY][mapX])) {
          nextStartSlope = rightSlope;
          continue;
        } else {
          blocked = false;
          startSlope = nextStartSlope;
        }
      } else if (
        mapX >= 0 && mapX < dungeon.width &&
        mapY >= 0 && mapY < dungeon.height &&
        isOpaque(dungeon.tiles[mapY][mapX]) &&
        i < radius
      ) {
        blocked = true;
        castLight(state, cx, cy, radius, i + 1, startSlope, leftSlope, octant);
        nextStartSlope = rightSlope;
      }
    }

    if (blocked) break;
  }
}
