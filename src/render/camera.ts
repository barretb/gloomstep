import { VIEWPORT_W, VIEWPORT_H } from '../constants';
import { GameState } from '../types';

export interface CameraOffset {
  x: number;
  y: number;
}

export function getCamera(state: GameState): CameraOffset {
  const px = state.player.position!.x;
  const py = state.player.position!.y;

  let camX = px - Math.floor(VIEWPORT_W / 2);
  let camY = py - Math.floor(VIEWPORT_H / 2);

  // Clamp to map bounds
  camX = Math.max(0, Math.min(camX, state.dungeon.width - VIEWPORT_W));
  camY = Math.max(0, Math.min(camY, state.dungeon.height - VIEWPORT_H));

  return { x: camX, y: camY };
}
