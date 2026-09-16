import { describe, it, expect } from 'vitest';
import { drawCharSelect, drawGameOver, drawInventoryScreen } from '../src/render/hud';
import { render } from '../src/render/renderer';
import { makeCtx, makeGear, makePlayer, makeState } from './helpers';

const sprites = new Map();

describe('drawCharSelect regions', () => {
  it('returns a region per hero card and a start region', () => {
    const { ctx } = makeCtx();

    const regions = drawCharSelect(ctx, 0, sprites);

    const cards = regions.filter((r) => r.action.type === 'selectHero');
    expect(cards.map((r) => (r.action as { index: number }).index)).toEqual([...Array(15).keys()]);
    expect(regions.filter((r) => r.action.type === 'startHero')).toHaveLength(1);
    expect(regions.filter((r) => r.action.type === 'continueRun')).toHaveLength(0);
  });

  it('adds a continue region when a save exists', () => {
    const { ctx } = makeCtx();

    const regions = drawCharSelect(ctx, 0, sprites, { name: 'Human Mage', depth: 3, turn: 90 });

    expect(regions.filter((r) => r.action.type === 'continueRun')).toHaveLength(1);
  });
});

describe('drawInventoryScreen regions', () => {
  it('returns close regions and a use/drop pair per item', () => {
    const player = makePlayer(1, 1);
    player.inventory!.items.push(
      makeGear('Short Sword', 'weapon', { attackBonus: 2 }),
      makeGear('Wooden Shield', 'offhand', { defenseBonus: 1 })
    );
    const state = makeState(player);
    const { ctx } = makeCtx();

    const regions = drawInventoryScreen(ctx, state);

    expect(regions[0].action).toEqual({ type: 'closeInventory' });
    expect(regions[0]).toMatchObject({ x: 0, y: 0 });
    expect(regions.filter((r) => r.action.type === 'closeInventory')).toHaveLength(2);
    expect(regions.filter((r) => r.action.type === 'useItem').map((r) => (r.action as { index: number }).index)).toEqual([0, 1]);
    expect(regions.filter((r) => r.action.type === 'dropItem').map((r) => (r.action as { index: number }).index)).toEqual([0, 1]);
  });
});

describe('drawGameOver regions', () => {
  it('returns share and play-again regions', () => {
    const state = makeState(makePlayer(1, 1));
    const { ctx } = makeCtx();

    const regions = drawGameOver(ctx, state);

    expect(regions.filter((r) => r.action.type === 'share').map((r) => (r.action as { target: string }).target)).toEqual(['m', 'b', 'c']);
    expect(regions.filter((r) => r.action.type === 'playAgain')).toHaveLength(1);
  });
});

describe('render regions', () => {
  it('returns no regions during normal play and the overlay regions in the inventory', () => {
    const state = makeState(makePlayer(1, 1));
    const { ctx } = makeCtx();

    expect(render(ctx, state, sprites)).toEqual([]);

    state.uiMode = 'inventory';
    expect(render(ctx, state, sprites).length).toBeGreaterThan(0);
  });
});
