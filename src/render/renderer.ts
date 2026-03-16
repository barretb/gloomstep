import { TILE_SIZE, VIEWPORT_W, VIEWPORT_H, COLORS, CANVAS_W } from '../constants';
import { GameState } from '../types';
import { getCamera } from './camera';
import { drawTile, drawEntity } from './sprites';
import { drawHud, drawInventoryScreen, drawGameOver, getHudHeight } from './hud';
import { SpriteMap } from './sprite-loader';

export function render(ctx: CanvasRenderingContext2D, state: GameState, sprites: SpriteMap, shareStatus: string = ''): void {
  const cam = getCamera(state);

  // Clear entire canvas (game area + HUD)
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_W, VIEWPORT_H * TILE_SIZE + getHudHeight());

  // Draw tiles
  for (let vy = 0; vy < VIEWPORT_H; vy++) {
    for (let vx = 0; vx < VIEWPORT_W; vx++) {
      const mx = cam.x + vx;
      const my = cam.y + vy;

      if (mx < 0 || mx >= state.dungeon.width || my < 0 || my >= state.dungeon.height) continue;

      const destX = vx * TILE_SIZE;
      const destY = vy * TILE_SIZE;
      const tile = state.dungeon.tiles[my][mx];
      const visible = state.dungeon.visible[my][mx];
      const explored = state.dungeon.explored[my][mx];

      drawTile(ctx, tile, destX, destY, visible, explored, sprites);
    }
  }

  // Draw entities on visible tiles (items first, then blockers)
  const items = state.entities.filter(
    (e) => e.position && e.item && !e.blocksMovement
  );
  const blockers = state.entities.filter(
    (e) => e.position && e.blocksMovement && !e.player
  );

  for (const entity of [...items, ...blockers]) {
    const pos = entity.position!;
    if (!state.dungeon.visible[pos.y]?.[pos.x]) continue;

    const sx = (pos.x - cam.x) * TILE_SIZE;
    const sy = (pos.y - cam.y) * TILE_SIZE;

    if (sx < 0 || sx >= VIEWPORT_W * TILE_SIZE || sy < 0 || sy >= VIEWPORT_H * TILE_SIZE) continue;

    const app = entity.appearance!;
    drawEntity(ctx, app.sprite, app.char, app.color, sx, sy, sprites);
  }

  // Draw player
  const pp = state.player.position!;
  const px = (pp.x - cam.x) * TILE_SIZE;
  const py = (pp.y - cam.y) * TILE_SIZE;
  const playerApp = state.player.appearance!;
  drawEntity(ctx, playerApp.sprite, playerApp.char, playerApp.color, px, py, sprites);

  // Draw HUD
  drawHud(ctx, state);

  // Draw overlays
  if (state.uiMode === 'inventory') {
    drawInventoryScreen(ctx, state);
  } else if (state.uiMode === 'gameover') {
    drawGameOver(ctx, state, shareStatus);
  }
}
