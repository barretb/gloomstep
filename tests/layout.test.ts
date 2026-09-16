import { describe, it, expect } from 'vitest';
import {
  canvasHeightFor,
  COMPACT_LAYOUT,
  computeLayout,
  DESKTOP_LAYOUT,
} from '../src/render/layout';

describe('computeLayout', () => {
  it('is compact below the breakpoint and desktop at or above it', () => {
    expect(computeLayout(599).compact).toBe(true);
    expect(computeLayout(600).compact).toBe(false);
    expect(computeLayout(1280).compact).toBe(false);
  });

  it('sizes the compact map at 15 by 13 tiles of 32 pixels', () => {
    expect(COMPACT_LAYOUT).toMatchObject({ viewportW: 15, viewportH: 13, mapW: 480, mapH: 416 });
  });

  it('keeps the desktop map at 25 by 19 tiles', () => {
    expect(DESKTOP_LAYOUT).toMatchObject({ viewportW: 25, viewportH: 19, mapW: 800, mapH: 608, hudH: 120 });
  });
});

describe('canvasHeightFor', () => {
  it('is 728 for every screen on desktop', () => {
    for (const mode of ['game', 'inventory', 'charselect', 'gameover'] as const) {
      expect(canvasHeightFor(mode, DESKTOP_LAYOUT)).toBe(728);
    }
  });

  it('is map plus HUD in play and the menu height elsewhere on compact', () => {
    expect(canvasHeightFor('game', COMPACT_LAYOUT)).toBe(548);
    expect(canvasHeightFor('inventory', COMPACT_LAYOUT)).toBe(660);
    expect(canvasHeightFor('charselect', COMPACT_LAYOUT)).toBe(660);
    expect(canvasHeightFor('gameover', COMPACT_LAYOUT)).toBe(660);
  });
});
