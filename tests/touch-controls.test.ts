import { describe, it, expect } from 'vitest';
import { controlBarVisible, parseControlAction } from '../src/ui/touch-controls';

describe('parseControlAction', () => {
  it.each([
    ['move:0,-1', { type: 'move', dx: 0, dy: -1 }],
    ['move:-1,0', { type: 'move', dx: -1, dy: 0 }],
    ['move:1,0', { type: 'move', dx: 1, dy: 0 }],
    ['move:0,1', { type: 'move', dx: 0, dy: 1 }],
    ['wait', { type: 'wait' }],
    ['pickup', { type: 'pickup' }],
    ['toggleInventory', { type: 'toggleInventory' }],
    ['ability', { type: 'ability' }],
    ['descend', { type: 'descend' }],
  ])('maps %s to the matching action', (value, expected) => {
    expect(parseControlAction(value)).toEqual(expected);
  });

  it.each(['', 'jump', 'move:2,0', 'move:0', 'move:a,b'])('returns null for %s', (value) => {
    expect(parseControlAction(value)).toBeNull();
  });
});

describe('controlBarVisible', () => {
  it('shows the bar during play and in the inventory', () => {
    expect(controlBarVisible('game')).toBe(true);
    expect(controlBarVisible('inventory')).toBe(true);
  });

  it('hides the bar on the hero and game over screens', () => {
    expect(controlBarVisible('charselect')).toBe(false);
    expect(controlBarVisible('gameover')).toBe(false);
  });
});
