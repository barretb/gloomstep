import { TILE_SIZE, COLORS } from '../constants';
import { Tile } from '../types';
import { SpriteMap } from './sprite-loader';

const TILE_SPRITE_KEYS: Record<number, string> = {
  [Tile.Wall]: 'wall',
  [Tile.Floor]: 'floor',
  [Tile.StairsDown]: 'stairs-down',
};

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  destX: number,
  destY: number,
  visible: boolean,
  explored: boolean,
  sprites: SpriteMap
): void {
  if (!explored) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
    return;
  }

  const alpha = visible ? 1.0 : 0.4;
  ctx.globalAlpha = alpha;

  const spriteKey = TILE_SPRITE_KEYS[tile];
  const img = spriteKey ? sprites.get(spriteKey) : undefined;

  if (img) {
    ctx.drawImage(img, destX, destY, TILE_SIZE, TILE_SIZE);
  } else {
    // Fallback to colored rectangles
    switch (tile) {
      case Tile.Wall:
        ctx.fillStyle = visible ? COLORS.wall : COLORS.wallExplored;
        ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
        break;
      case Tile.Floor:
      case Tile.StairsDown:
        ctx.fillStyle = visible ? COLORS.floor : COLORS.floorExplored;
        ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
        break;
    }
  }

  ctx.globalAlpha = 1.0;
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  char: string,
  color: string,
  destX: number,
  destY: number,
  sprites: SpriteMap
): void {
  const img = sprites.get(spriteKey);

  if (img) {
    ctx.drawImage(img, destX, destY, TILE_SIZE, TILE_SIZE);
  } else {
    // Fallback to text character
    ctx.fillStyle = color;
    ctx.font = `bold ${TILE_SIZE - 4}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, destX + TILE_SIZE / 2, destY + TILE_SIZE / 2 + 2);
  }
}
