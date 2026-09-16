import { describe, it, expect } from 'vitest';
import { canvasPointFromClient, findHitRegion, HitRegion } from '../src/ui/hit-regions';

describe('canvasPointFromClient', () => {
  it('scales client coordinates up when the canvas is displayed smaller than its pixel size', () => {
    const rect = { left: 10, top: 20, width: 400, height: 364 };

    expect(canvasPointFromClient(rect, 800, 728, 110, 120)).toEqual({ x: 200, y: 200 });
  });

  it('maps a point at the rect origin to the canvas origin', () => {
    const rect = { left: 33, top: 44, width: 800, height: 728 };

    expect(canvasPointFromClient(rect, 800, 728, 33, 44)).toEqual({ x: 0, y: 0 });
  });
});

describe('findHitRegion', () => {
  const a: HitRegion = { x: 0, y: 0, w: 100, h: 100, action: { type: 'closeInventory' } };
  const b: HitRegion = { x: 40, y: 40, w: 20, h: 20, action: { type: 'useItem', index: 3 } };

  it('returns null when no region contains the point', () => {
    expect(findHitRegion([a, b], 150, 150)).toBeNull();
  });

  it('returns the last region drawn when regions overlap', () => {
    expect(findHitRegion([a, b], 45, 45)).toBe(b);
  });

  it('falls through to an earlier region outside the later one', () => {
    expect(findHitRegion([a, b], 5, 5)).toBe(a);
  });

  it('treats the far edge as outside', () => {
    expect(findHitRegion([b], 60, 50)).toBeNull();
    expect(findHitRegion([b], 59, 50)).toBe(b);
  });
});
