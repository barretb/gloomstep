import { TILE_SIZE } from '../constants';
import { UIMode } from '../types';

/** Pixel and tile geometry for one screen size class. */
export interface Layout {
  compact: boolean;
  /** Visible map size in tiles. */
  viewportW: number;
  viewportH: number;
  /** Map area in pixels (viewport × TILE_SIZE). */
  mapW: number;
  mapH: number;
  /** Height of the HUD strip under the map. */
  hudH: number;
  /** Canvas height used by hero select, inventory, and game over. */
  menuH: number;
  /** Message log lines shown in the HUD. */
  maxMessages: number;
}

/** Below this many CSS pixels of available width the compact layout is used. */
export const COMPACT_BREAKPOINT = 600;

export const DESKTOP_LAYOUT: Layout = {
  compact: false,
  viewportW: 25,
  viewportH: 19,
  mapW: 25 * TILE_SIZE,
  mapH: 19 * TILE_SIZE,
  hudH: 120,
  menuH: 19 * TILE_SIZE + 120,
  maxMessages: 5,
};

export const COMPACT_LAYOUT: Layout = {
  compact: true,
  viewportW: 15,
  viewportH: 13,
  mapW: 15 * TILE_SIZE,
  mapH: 13 * TILE_SIZE,
  hudH: 132,
  menuH: 660,
  maxMessages: 4,
};

export function computeLayout(availableWidth: number): Layout {
  return availableWidth < COMPACT_BREAKPOINT ? COMPACT_LAYOUT : DESKTOP_LAYOUT;
}

let active: Layout = DESKTOP_LAYOUT;

export function getLayout(): Layout {
  return active;
}

export function setLayout(layout: Layout): void {
  active = layout;
}

/** Canvas pixel height a screen needs under a layout. */
export function canvasHeightFor(mode: UIMode, layout: Layout): number {
  if (!layout.compact) return layout.mapH + layout.hudH;
  return mode === 'game' ? layout.mapH + layout.hudH : layout.menuH;
}
