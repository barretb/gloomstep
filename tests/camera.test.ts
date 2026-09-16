import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { getCamera } from '../src/render/camera';
import { COMPACT_LAYOUT, DESKTOP_LAYOUT, setLayout } from '../src/render/layout';
import { makeDungeon, makePlayer, makeState } from './helpers';

function stateWithPlayerAt(x: number, y: number) {
  const state = makeState(makePlayer(x, y));
  state.dungeon = makeDungeon(60, 40);
  return state;
}

describe('getCamera under the compact layout', () => {
  beforeEach(() => setLayout(COMPACT_LAYOUT));
  afterEach(() => setLayout(DESKTOP_LAYOUT));

  it('centres a 15 by 13 viewport on the player', () => {
    expect(getCamera(stateWithPlayerAt(30, 20))).toEqual({ x: 23, y: 14 });
  });

  it('clamps to the top-left corner', () => {
    expect(getCamera(stateWithPlayerAt(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it('clamps to the bottom-right corner', () => {
    expect(getCamera(stateWithPlayerAt(59, 39))).toEqual({ x: 45, y: 27 });
  });
});

describe('getCamera under the desktop layout', () => {
  it('centres a 25 by 19 viewport on the player', () => {
    expect(getCamera(stateWithPlayerAt(30, 20))).toEqual({ x: 18, y: 11 });
  });
});
