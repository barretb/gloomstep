import { GameState } from '../types';
import { getLayout } from './layout';

export interface CameraOffset {
  x: number;
  y: number;
}

export function getCamera(state: GameState): CameraOffset {
  const { viewportW, viewportH } = getLayout();
  const px = state.player.position!.x;
  const py = state.player.position!.y;

  let camX = px - Math.floor(viewportW / 2);
  let camY = py - Math.floor(viewportH / 2);

  // Clamp to map bounds
  camX = Math.max(0, Math.min(camX, state.dungeon.width - viewportW));
  camY = Math.max(0, Math.min(camY, state.dungeon.height - viewportH));

  return { x: camX, y: camY };
}
