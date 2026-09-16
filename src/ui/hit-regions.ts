export type TapAction =
  | { type: 'selectHero'; index: number }
  | { type: 'startHero' }
  | { type: 'continueRun' }
  | { type: 'useItem'; index: number }
  | { type: 'dropItem'; index: number }
  | { type: 'closeInventory' }
  | { type: 'share'; target: 'm' | 'b' | 'c' }
  | { type: 'playAgain' };

/** A tappable rectangle in canvas pixels and what tapping it does. */
export interface HitRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  action: TapAction;
}

/**
 * The topmost region containing the point, or null. Regions drawn later
 * sit on top, so the list is searched from the end.
 */
export function findHitRegion(regions: readonly HitRegion[], x: number, y: number): HitRegion | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
      return r;
    }
  }
  return null;
}

/**
 * Converts a client (page) coordinate into canvas pixel coordinates,
 * accounting for the canvas being displayed at a different size than
 * its pixel dimensions.
 */
export function canvasPointFromClient(
  rect: { left: number; top: number; width: number; height: number },
  canvasW: number,
  canvasH: number,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const scaleX = rect.width > 0 ? canvasW / rect.width : 1;
  const scaleY = rect.height > 0 ? canvasH / rect.height : 1;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
