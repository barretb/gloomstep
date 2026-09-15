import { describe, it, expect } from 'vitest';
import { render } from '../src/render/renderer';
import { makeCtx, makePlayer, makeState, makeTreasure } from './helpers';

describe('render', () => {
  it('draws treasure lying on a visible tile', () => {
    const player = makePlayer(1, 1);
    const state = makeState(player, [makeTreasure(3, 3)]);
    const { ctx, calls } = makeCtx();

    render(ctx, state, new Map());

    const drawnChars = calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]);
    expect(drawnChars).toContain('$');
  });
});
