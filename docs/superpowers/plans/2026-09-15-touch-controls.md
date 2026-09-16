# Touch Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every screen usable by touch: an HTML d-pad and action bar for the map view, tappable regions on the canvas-drawn screens, and a canvas that scales to the viewport.

**Architecture:** Two pure helper modules under `src/ui/` (tap regions and control-bar parsing) feed the existing `Game` API. Canvas screen drawers return `HitRegion[]`; `Game.handleTap` maps a region's `TapAction` onto existing key handlers and actions. `index.html` gains the control bar and responsive CSS; `main.ts` wires clicks.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-touch-controls-design.md`

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` clean (`noUnusedLocals`, `noUnusedParameters`).
- Tests in `tests/`, `npx vitest run`; all 97 existing tests stay green.
- Two-space indent, single quotes, semicolons. No new dependencies.
- Canvas stays 800×728; no layout compaction (explicit non-goal).
- Commit per task with trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/ui/hit-regions.ts` (create) | `TapAction`, `HitRegion`, `findHitRegion`, `canvasPointFromClient` |
| `src/ui/touch-controls.ts` (create) | `parseControlAction`, `controlBarVisible`, `setupTouchControls` |
| `src/render/hud.ts` (modify) | Drawers return regions; START button, `[drop]` labels, close mark |
| `src/render/renderer.ts` (modify) | `render` returns the overlay's regions |
| `src/game.ts` (modify) | `hitRegions`, `handleTap` |
| `src/main.ts`, `index.html` (modify) | Control bar markup/CSS, click wiring, responsive canvas |
| `README.md` (modify) | Touch controls docs |
| `tests/hit-regions.test.ts`, `tests/touch-controls.test.ts`, `tests/hud-regions.test.ts` (create); `tests/game.test.ts` (modify) | Tests |

---

### Task 1: Pure UI helpers

**Files:**
- Create: `src/ui/hit-regions.ts`, `src/ui/touch-controls.ts`
- Test: `tests/hit-regions.test.ts`, `tests/touch-controls.test.ts`

**Interfaces:**
- Produces: `TapAction`, `HitRegion`, `findHitRegion(regions, x, y)`, `canvasPointFromClient(rect, canvasW, canvasH, clientX, clientY)`, `parseControlAction(value)`, `controlBarVisible(mode)`, `setupTouchControls(bar, dispatch)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/hit-regions.test.ts`:

```ts
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
```

Create `tests/touch-controls.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/hit-regions.test.ts tests/touch-controls.test.ts`
Expected: both files FAIL with `Cannot find module`.

- [ ] **Step 3: Create `src/ui/hit-regions.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/ui/touch-controls.ts`**

```ts
import { Action, UIMode } from '../types';

/** Parses a button's data-action attribute into a game action. */
export function parseControlAction(value: string): Action | null {
  if (value.startsWith('move:')) {
    const parts = value.slice('move:'.length).split(',');
    if (parts.length !== 2) return null;
    const dx = Number(parts[0]);
    const dy = Number(parts[1]);
    if (!isStep(dx) || !isStep(dy)) return null;
    return { type: 'move', dx, dy };
  }
  switch (value) {
    case 'wait':
    case 'pickup':
    case 'toggleInventory':
    case 'ability':
    case 'descend':
      return { type: value };
    default:
      return null;
  }
}

function isStep(n: number): boolean {
  return Number.isInteger(n) && n >= -1 && n <= 1;
}

/** The on-screen controls only make sense while a run is in progress. */
export function controlBarVisible(mode: UIMode): boolean {
  return mode === 'game' || mode === 'inventory';
}

/** Routes taps on the control bar's buttons to the game. */
export function setupTouchControls(bar: HTMLElement, dispatch: (action: Action) => void): void {
  bar.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('button');
    if (!button) return;
    e.preventDefault();
    const action = parseControlAction(button.dataset.action ?? '');
    if (action) dispatch(action);
  });
}
```

- [ ] **Step 5: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 116 tests pass (97 + 6 + 13), no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/hit-regions.ts src/ui/touch-controls.ts tests/hit-regions.test.ts tests/touch-controls.test.ts
git commit -m "Add tap region and control bar helpers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Canvas screens report tap regions

**Files:**
- Modify: `src/render/hud.ts`, `src/render/renderer.ts`
- Test: `tests/hud-regions.test.ts`

**Interfaces:**
- Consumes: `HitRegion` (Task 1).
- Produces: `drawCharSelect(...): HitRegion[]`, `drawInventoryScreen(...): HitRegion[]`, `drawGameOver(...): HitRegion[]`, `render(...): HitRegion[]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/hud-regions.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/hud-regions.test.ts`
Expected: FAIL; e.g. `Cannot read properties of undefined (reading 'filter')` because the drawers return void.

- [ ] **Step 3: `drawCharSelect` returns regions and draws START**

In `src/render/hud.ts`, add the import:

```ts
import { HitRegion } from '../ui/hit-regions';
```

Change the signature's return type to `): HitRegion[] {` and add `const regions: HitRegion[] = [];` as the first line of the body.

Inside `CHARACTERS.forEach((char, i) => {`, immediately after `const isSelected = i === selectedIndex;`, add:

```ts
    regions.push({ x, y, w: cellW, h: cellH, action: { type: 'selectHero', index: i } });
```

Replace the block from `// Controls` through the end of the function with:

```ts
  // Controls
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  ctx.fillText('[Arrow Keys] Select   [Enter] Start', CANVAS_W / 2, detailY + 84);

  // START button (tap target)
  const startBtn = { x: startX + gridW - 130, y: detailY + 66, w: 110, h: 26 };
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1;
  ctx.strokeRect(startBtn.x, startBtn.y, startBtn.w, startBtn.h);
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('START', startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2);
  regions.push({ ...startBtn, action: { type: 'startHero' } });

  // Continue banner for a saved run
  if (resume) {
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    if (confirmAbandon) {
      ctx.fillStyle = '#ff5555';
      ctx.fillText(
        'Starting a new game will erase your saved run. [Enter] again to confirm, [C] to continue it.',
        CANVAS_W / 2,
        detailY + 124
      );
    } else {
      ctx.fillStyle = COLORS.stairs;
      ctx.fillText(
        `[C] Continue saved run: ${resume.name} — Depth ${resume.depth}, Turn ${resume.turn}`,
        CANVAS_W / 2,
        detailY + 124
      );
    }
    regions.push({ x: startX, y: detailY + 110, w: gridW, h: 28, action: { type: 'continueRun' } });
  }

  return regions;
}
```

- [ ] **Step 4: `drawInventoryScreen` returns regions, draws `[drop]` and ✕**

Change the signature to `export function drawInventoryScreen(ctx: CanvasRenderingContext2D, state: GameState): HitRegion[] {`. Replace the first three lines of the body with:

```ts
  const regions: HitRegion[] = [];
  const inv = state.player.inventory;
  if (!inv) return regions;

  // Lowest priority: tapping anywhere outside the panel closes the inventory
  regions.push({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H + HUD_HEIGHT, action: { type: 'closeInventory' } });
```

After the panel border `ctx.strokeRect(panelX, panelY, panelW, panelH);`, add:

```ts
  // Close mark (tap target)
  const closeBox = { x: panelX + panelW - 36, y: panelY + 8, w: 28, h: 28 };
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeBox.x + closeBox.w / 2, closeBox.y + closeBox.h / 2);
  regions.push({ ...closeBox, action: { type: 'closeInventory' } });
```

Replace the item loop body so each row registers regions and draws the drop label:

```ts
    inv.items.forEach((item, i) => {
      const app = item.appearance!;
      ctx.textAlign = 'left';
      ctx.fillStyle = app.color;
      ctx.fillText(`${i + 1}. `, panelX + 30, y);
      ctx.fillStyle = COLORS.text;
      const suffix = item.item?.kind === 'weapon'
        ? ` (+${item.item.attackBonus} ATK)`
        : item.item?.kind === 'armor'
        ? ` (+${item.item.defenseBonus} DEF)`
        : item.item?.useEffect?.type === 'heal'
        ? ` (heals ${item.item.useEffect.amount})`
        : item.item?.useEffect?.type === 'damage'
        ? ` (${item.item.useEffect.amount} dmg)`
        : '';
      ctx.fillText(`${app.name}${suffix}`, panelX + 60, y);
      regions.push({ x: panelX + 20, y: y - 9, w: panelW - 120, h: 18, action: { type: 'useItem', index: i } });

      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('[drop]', panelX + panelW - 20, y);
      regions.push({ x: panelX + panelW - 90, y: y - 9, w: 70, h: 18, action: { type: 'dropItem', index: i } });
      y += 18;
    });
```

Replace the help text line with:

```ts
  ctx.fillText('[1-9, 0] or tap: Use  |  [Shift+num] or [drop]: Drop  |  [Esc/i] or ✕: Close', CANVAS_W / 2, y);

  return regions;
```

(`HUD_HEIGHT` is the existing module constant; `textAlign` is reset to `'left'` inside the loop because the close mark set it to `'center'`.)

- [ ] **Step 5: `drawGameOver` returns regions**

Change the return type to `): HitRegion[] {` and add `const regions: HitRegion[] = [];` after the parameter list. In the `options.forEach` body, after the `fillText`, add:

```ts
    regions.push({ x: startX + i * optionW, y: shareY + 8, w: optionW, h: 28, action: { type: 'share', target: opt.key.toLowerCase() as 'm' | 'b' | 'c' } });
```

Replace the play-again lines with:

```ts
  // Play again
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px monospace';
  ctx.fillText('[Enter] or tap here to play again', CANVAS_W / 2, shareY + 70);
  regions.push({ x: CANVAS_W / 2 - 150, y: shareY + 56, w: 300, h: 28, action: { type: 'playAgain' } });

  return regions;
}
```

- [ ] **Step 6: `render` returns the overlay's regions**

In `src/render/renderer.ts`, add `import { HitRegion } from '../ui/hit-regions';`, change the signature's return type to `): HitRegion[] {`, and replace the overlay block at the end with:

```ts
  // Draw overlays; whichever is active reports its tap regions
  if (state.uiMode === 'inventory') {
    return drawInventoryScreen(ctx, state);
  }
  if (state.uiMode === 'gameover') {
    return drawGameOver(ctx, state, shareStatus);
  }
  return [];
}
```

- [ ] **Step 7: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 121 tests pass (116 + 5), no type errors. (`Game.draw` ignores the return value for now; that is fine.)

- [ ] **Step 8: Commit**

```bash
git add src/render/hud.ts src/render/renderer.ts tests/hud-regions.test.ts
git commit -m "Canvas screens report tap regions and draw touch affordances" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Game dispatches taps

**Files:**
- Modify: `src/game.ts`
- Test: `tests/game.test.ts`

**Interfaces:**
- Consumes: `HitRegion`, `findHitRegion` (Task 1); drawers returning regions (Task 2).
- Produces: `Game.hitRegions: HitRegion[]`, `Game.handleTap(x, y): void`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/game.test.ts`:

```ts
describe('Game.handleTap', () => {
  function centre(game: Game, predicate: (r: (typeof game.hitRegions)[number]) => boolean): [number, number] {
    const region = game.hitRegions.find(predicate)!;
    return [region.x + region.w / 2, region.y + region.h / 2];
  }

  it('selects the tapped hero card', () => {
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), createMemoryStorage());

    game.handleTap(...centre(game, (r) => r.action.type === 'selectHero' && r.action.index === 7));

    expect(game.charSelectIndex).toBe(7);
    expect(game.state.uiMode).toBe('charselect');
  });

  it('runs the erase confirmation when START is tapped with a save present', () => {
    const storage = createMemoryStorage();
    const first = startGame(storage);
    first.tick({ type: 'wait' });
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleTap(...centre(game, (r) => r.action.type === 'startHero'));
    expect(game.confirmAbandon).toBe(true);
    expect(game.state.uiMode).toBe('charselect');

    game.handleTap(...centre(game, (r) => r.action.type === 'startHero'));
    expect(game.state.uiMode).toBe('game');
    expect(getSaveSummary(storage)).toBeNull();
  });

  it('uses and drops inventory items by tapping their row and drop label', () => {
    const game = startGame();
    const sword = createEntity({
      appearance: { name: 'Short Sword', char: '/', color: '#ccc', sprite: 'sword-short' },
      item: { kind: 'weapon', slot: 'weapon', attackBonus: 2 },
    });
    const potion = createEntity({
      appearance: { name: 'Health Potion', char: '!', color: '#c33', sprite: 'potion-red' },
      item: { kind: 'potion', useEffect: { type: 'heal', amount: 8 } },
    });
    game.state.player.inventory!.items.push(sword, potion);
    game.tick({ type: 'toggleInventory' });

    game.handleTap(...centre(game, (r) => r.action.type === 'useItem' && r.action.index === 0));
    expect(game.state.player.equipment!.weapon).toBe(sword);
    expect(game.state.uiMode).toBe('game');

    game.tick({ type: 'toggleInventory' });
    game.handleTap(...centre(game, (r) => r.action.type === 'dropItem' && r.action.index === 0));
    expect(game.state.player.inventory!.items).toHaveLength(0);
    expect(game.state.entities).toContain(potion);
  });

  it('closes the inventory without spending a turn when tapping outside the panel', () => {
    const game = startGame();
    game.tick({ type: 'toggleInventory' });
    const turn = game.state.turn;

    game.handleTap(2, 2);

    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(turn);
  });

  it('returns to the hero screen when play again is tapped on game over', () => {
    const game = startGame();
    game.state.player.stats!.hp = 0;
    game.tick({ type: 'wait' });
    expect(game.state.uiMode).toBe('gameover');

    game.handleTap(...centre(game, (r) => r.action.type === 'playAgain'));

    expect(game.state.uiMode).toBe('charselect');
  });

  it('ignores taps that hit nothing', () => {
    const game = startGame();
    const turn = game.state.turn;

    game.handleTap(1, 1);

    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(turn);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game.test.ts`
Expected: the new tests FAIL with `game.hitRegions is undefined` / `game.handleTap is not a function`.

- [ ] **Step 3: Implement**

In `src/game.ts`, add the import:

```ts
import { findHitRegion, HitRegion, TapAction } from './ui/hit-regions';
```

Add a field after `confirmAbandon = false;`:

```ts
  /** Tappable regions of whatever is currently drawn. */
  hitRegions: HitRegion[] = [];
```

Replace `drawCharSelectScreen` and `draw`:

```ts
  private drawCharSelectScreen(): void {
    this.hitRegions = drawCharSelect(this.ctx, this.charSelectIndex, this.sprites, this.resumeSummary, this.confirmAbandon);
  }

  draw(): void {
    this.hitRegions = render(this.ctx, this.state, this.sprites, this.shareStatus);
  }
```

Add after `resumeRun`:

```ts
  /** Dispatches a tap at canvas pixel (x, y) to whatever was drawn there. */
  handleTap(x: number, y: number): void {
    const region = findHitRegion(this.hitRegions, x, y);
    if (!region) return;
    this.applyTap(region.action);
  }

  private applyTap(action: TapAction): void {
    switch (action.type) {
      case 'selectHero':
        this.charSelectIndex = action.index;
        this.confirmAbandon = false;
        this.drawCharSelectScreen();
        return;
      case 'startHero':
        this.handleCharSelectInput('Enter');
        return;
      case 'continueRun':
        this.handleCharSelectInput('c');
        return;
      case 'useItem':
        this.tick({ type: 'useItem', index: action.index });
        return;
      case 'dropItem':
        this.tick({ type: 'dropItem', index: action.index });
        return;
      case 'closeInventory':
        if (this.state.uiMode === 'inventory') {
          this.tick({ type: 'toggleInventory' });
        }
        return;
      case 'share':
        this.handleGameOverInput(action.target);
        return;
      case 'playAgain':
        this.handleGameOverInput('Enter');
        return;
    }
  }
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 127 tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/game.ts tests/game.test.ts
git commit -m "Dispatch canvas taps to hero select, inventory, and game over" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Control bar, page wiring, responsive CSS, docs

**Files:**
- Modify: `index.html`, `src/main.ts`, `README.md`

No unit tests (DOM); verified in the browser with mobile emulation. The full suite must still pass.

- [ ] **Step 1: Add the control bar and CSS to `index.html`**

Inside `<style>`, replace the `canvas { ... }` rule with:

```css
      canvas {
        border: 2px solid #4a4a6a;
        image-rendering: pixelated;
        max-width: 100%;
        height: auto;
      }
```

Append inside `<style>` before `</style>`:

```css
      #touch-controls {
        display: none;
        width: 100%;
        max-width: 800px;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 8px 4px;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }
      #touch-controls button {
        min-width: 56px;
        min-height: 56px;
        font: bold 18px monospace;
        color: #ffcc00;
        background: #1a1a2e;
        border: 2px solid #4a4a6a;
        border-radius: 8px;
        touch-action: manipulation;
      }
      #touch-controls button:active {
        background: #4a4a6a;
      }
      #touch-controls .dpad {
        display: grid;
        grid-template-columns: repeat(3, 56px);
        grid-template-rows: repeat(3, 56px);
        gap: 4px;
      }
      #touch-controls .dpad button:nth-child(1) { grid-column: 2; grid-row: 1; }
      #touch-controls .dpad button:nth-child(2) { grid-column: 1; grid-row: 2; }
      #touch-controls .dpad button:nth-child(3) { grid-column: 2; grid-row: 2; }
      #touch-controls .dpad button:nth-child(4) { grid-column: 3; grid-row: 2; }
      #touch-controls .dpad button:nth-child(5) { grid-column: 2; grid-row: 3; }
      #touch-controls .actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      #touch-controls .actions button {
        min-width: 84px;
        font-size: 14px;
      }
      @media (pointer: coarse) {
        #touch-controls:not([hidden]) { display: flex; }
        .controls { display: none; }
      }
      @media (max-width: 840px) {
        body { align-items: flex-start; padding: 8px; }
      }
```

After `<canvas id="game"></canvas>`, insert:

```html
      <div id="touch-controls" hidden>
        <div class="dpad">
          <button data-action="move:0,-1" aria-label="Move up">▲</button>
          <button data-action="move:-1,0" aria-label="Move left">◀</button>
          <button data-action="wait" aria-label="Wait a turn">●</button>
          <button data-action="move:1,0" aria-label="Move right">▶</button>
          <button data-action="move:0,1" aria-label="Move down">▼</button>
        </div>
        <div class="actions">
          <button data-action="pickup">Grab</button>
          <button data-action="toggleInventory">Bag</button>
          <button data-action="ability">Skill</button>
          <button data-action="descend">Descend</button>
        </div>
      </div>
```

- [ ] **Step 2: Wire clicks in `src/main.ts`**

Add imports:

```ts
import { canvasPointFromClient } from './ui/hit-regions';
import { controlBarVisible, setupTouchControls } from './ui/touch-controls';
```

Replace the body of the `loadSprites().then((sprites) => { ... })` callback with:

```ts
  const game = new Game(ctx, sprites);
  const bar = document.getElementById('touch-controls') as HTMLElement;

  const syncBar = () => {
    bar.hidden = !controlBarVisible(game.state.uiMode);
  };

  setupInput(
    (action) => {
      game.tick(action);
      syncBar();
    },
    () => game.state.uiMode
  );

  setupTouchControls(bar, (action) => {
    game.tick(action);
    syncBar();
  });

  canvas.addEventListener('click', (e) => {
    const { x, y } = canvasPointFromClient(canvas.getBoundingClientRect(), canvas.width, canvas.height, e.clientX, e.clientY);
    game.handleTap(x, y);
    syncBar();
  });

  // Handle charselect, gameover, and other special keys
  window.addEventListener('keydown', (e) => {
    if (game.state.uiMode === 'charselect') {
      e.preventDefault();
      game.handleCharSelectInput(e.key);
      syncBar();
      return;
    }
    if (game.state.uiMode === 'gameover') {
      e.preventDefault();
      game.handleGameOverInput(e.key);
      syncBar();
    }
  });

  syncBar();
```

- [ ] **Step 3: Update the README**

Features list, after the Save & resume bullet:

```markdown
- **Touch controls** — Play on a phone or tablet with an on-screen d-pad and tappable menus
```

After the Class Abilities section and before `### Tips`, add:

```markdown
### Touch Controls

On touch devices an on-screen d-pad (with wait in the centre) and Grab, Bag, Skill, and Descend buttons appear under the map. Every other screen is tappable too: tap a hero card and then **START** on the hero screen (or the Continue banner to resume), tap an inventory row to use it or its `[drop]` label to drop it, tap ✕ or outside the panel to close the inventory, and tap the share options or "play again" on the game over screen.

The canvas scales to fit the screen width. On a portrait phone the map is playable but the HUD text is small; a compact layout for narrow screens is planned.
```

- [ ] **Step 4: Run tests, type check, build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 127 tests pass, clean build.

- [ ] **Step 5: Verify in the browser**

Start the dev server (`.claude/launch.json` config `dev`). Desktop first: no control bar visible; click a hero card (selection moves), click START (game starts), press I then click an item row / ✕ (inventory responds), no console errors. Then `resize_window` to the mobile preset (pointer becomes coarse) and reload: the control bar shows during play, tapping ▲ moves the hero and advances Turn, tapping Bag opens the inventory, tapping outside closes it; on the hero screen the bar is hidden. Reset to desktop when done.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.ts README.md
git commit -m "Add touch control bar, canvas tap wiring, and responsive canvas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** `hit-regions.ts` and `touch-controls.ts` → Task 1. Region reporting for all three screens plus START, `[drop]`, ✕, help/play-again text → Task 2. `render` return → Task 2. `hitRegions`/`handleTap` → Task 3. Control bar markup, CSS, `main.ts` wiring, README → Task 4. Spec tests 1–5 → Task 1; 6–9 → Task 2; 10–14 → Task 3 (plus a no-hit guard).

**Placeholders.** None.

**Type consistency.** `HitRegion`, `TapAction`, `findHitRegion`, `canvasPointFromClient` from Task 1 used verbatim in Tasks 2–4. `parseControlAction`, `controlBarVisible`, `setupTouchControls` from Task 1 used in Task 4. Drawer return types in Task 2 match the `render` return in Task 2 and the `hitRegions` assignment in Task 3. `HUD_HEIGHT` is the existing constant in `hud.ts`.
