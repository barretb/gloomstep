# Compact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Readable play on portrait phones: a 15×13 map on a 480-wide canvas with a reflowed HUD below 600 CSS px, taller menu canvases in compact mode, and layout switching on resize.

**Architecture:** `src/render/layout.ts` owns a `Layout` (viewport tiles, map/HUD/menu pixel sizes, log lines) behind a getter/setter. Camera, renderer, and HUD read it instead of constants. `Game` resizes the canvas to what the current screen needs and exposes `redraw()`; `main.ts` picks the layout from the container width and re-picks on resize.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-compact-layout-design.md`

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` clean (`noUnusedLocals`, `noUnusedParameters`).
- Tests in `tests/`, `npx vitest run`; all 130 existing tests stay green under the default desktop layout.
- Two-space indent, single quotes, semicolons. No new dependencies.
- Layout numbers exactly as in the spec: compact breakpoint 600; compact 15×13, 480×416 map, 132 HUD, 660 menu height, 4 log lines; desktop unchanged (25×19, 800×608, 120, 728, 5).
- Commit per task with trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/render/layout.ts` (create) | `Layout`, presets, `computeLayout`, `getLayout`/`setLayout`, `canvasHeightFor` |
| `src/render/camera.ts`, `src/render/renderer.ts` (modify) | Read viewport/canvas size from the layout |
| `src/render/hud.ts` (modify) | Desktop and compact geometry for HUD, hero select, inventory, game over |
| `src/game.ts` (modify) | `ensureCanvasSize`, `redraw` |
| `src/main.ts` (modify) | Choose layout from container width; resize listener |
| `src/constants.ts` (modify) | Drop viewport/canvas constants |
| `tests/helpers.ts` (modify) | `makeCtx` exposes a `canvas` object |
| `tests/layout.test.ts`, `tests/camera.test.ts` (create); `tests/hud-regions.test.ts`, `tests/game.test.ts` (modify) | Tests |
| `README.md`, spec (modify) | Docs |

---

### Task 1: Layout module

**Files:**
- Create: `src/render/layout.ts`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Produces: `Layout`, `COMPACT_BREAKPOINT`, `DESKTOP_LAYOUT`, `COMPACT_LAYOUT`, `computeLayout(width)`, `getLayout()`, `setLayout(layout)`, `canvasHeightFor(mode, layout)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/layout.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/layout.test.ts`
Expected: FAIL with `Cannot find module '../src/render/layout'`

- [ ] **Step 3: Create the module**

Create `src/render/layout.ts`:

```ts
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
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 135 tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/render/layout.ts tests/layout.test.ts
git commit -m "Add layout model with desktop and compact presets" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Camera and renderer read the layout

**Files:**
- Modify: `src/render/camera.ts`, `src/render/renderer.ts`
- Test: `tests/camera.test.ts`

**Interfaces:**
- Consumes: `getLayout`, `setLayout`, `COMPACT_LAYOUT`, `DESKTOP_LAYOUT` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `tests/camera.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/camera.test.ts`
Expected: the three compact cases FAIL (e.g. `expected { x: 18, y: 11 } to deeply equal { x: 23, y: 14 }`); the desktop case passes.

- [ ] **Step 3: Rewrite `src/render/camera.ts`**

```ts
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
```

- [ ] **Step 4: Update `src/render/renderer.ts`**

Replace the constants import with:

```ts
import { TILE_SIZE, COLORS } from '../constants';
import { getLayout } from './layout';
```

Inside `render`, add `const L = getLayout();` as the first line and make these replacements:

- `ctx.fillRect(0, 0, CANVAS_W, VIEWPORT_H * TILE_SIZE + getHudHeight());` → `ctx.fillRect(0, 0, L.mapW, L.mapH + L.hudH);`
- `for (let vy = 0; vy < VIEWPORT_H; vy++)` → `for (let vy = 0; vy < L.viewportH; vy++)`
- `for (let vx = 0; vx < VIEWPORT_W; vx++)` → `for (let vx = 0; vx < L.viewportW; vx++)`
- `if (sx < 0 || sx >= VIEWPORT_W * TILE_SIZE || sy < 0 || sy >= VIEWPORT_H * TILE_SIZE) continue;` → `if (sx < 0 || sx >= L.mapW || sy < 0 || sy >= L.mapH) continue;`

Remove `getHudHeight` from the `./hud` import if it is now unused.

- [ ] **Step 5: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 139 tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/render/camera.ts src/render/renderer.ts tests/camera.test.ts
git commit -m "Camera and renderer read the active layout" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: HUD screens under both layouts

**Files:**
- Modify: `src/render/hud.ts`, `docs/superpowers/specs/2026-09-16-compact-layout-design.md`
- Test: `tests/hud-regions.test.ts`

**Interfaces:**
- Consumes: `getLayout`, `canvasHeightFor`, `setLayout`, presets (Task 1).
- Produces: unchanged signatures; `getHudHeight()` now returns `getLayout().hudH`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/hud-regions.test.ts`:

```ts
import { afterEach, beforeEach } from 'vitest';
import { COMPACT_LAYOUT, DESKTOP_LAYOUT, setLayout } from '../src/render/layout';

describe('compact layout regions', () => {
  beforeEach(() => setLayout(COMPACT_LAYOUT));
  afterEach(() => setLayout(DESKTOP_LAYOUT));

  const within = (r: { x: number; y: number; w: number; h: number }, w: number, h: number) =>
    r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;

  it('keeps all fifteen hero cards inside the compact canvas', () => {
    const { ctx } = makeCtx();

    const regions = drawCharSelect(ctx, 0, sprites, { name: 'Human Mage', depth: 3, turn: 90 });

    expect(regions.filter((r) => r.action.type === 'selectHero')).toHaveLength(15);
    expect(regions.every((r) => within(r, 480, 660))).toBe(true);
  });

  it('keeps ten inventory rows inside the compact canvas', () => {
    const player = makePlayer(1, 1);
    for (let i = 0; i < 10; i++) {
      player.inventory!.items.push(makeGear(`Sword ${i}`, 'weapon', { attackBonus: 1 }));
    }
    const state = makeState(player);
    const { ctx } = makeCtx();

    const regions = drawInventoryScreen(ctx, state);

    expect(regions.filter((r) => r.action.type === 'useItem')).toHaveLength(10);
    expect(regions.every((r) => within(r, 480, 660))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/hud-regions.test.ts`
Expected: both new tests FAIL (`expected false to be true`) because the drawers still use the 800-wide constants.

- [ ] **Step 3: Rewrite the header and `drawHud` in `src/render/hud.ts`**

Replace lines 1–106 (imports through the end of `drawHud`) with:

```ts
import { COLORS, TILE_SIZE } from '../constants';
import { GameState } from '../types';
import { CHARACTERS } from '../data/characters';
import { SpriteMap } from './sprite-loader';
import { EQUIP_SLOTS, getAttackBonus, getDefenseBonus } from '../systems/equipment';
import { ABILITIES } from '../data/abilities';
import { SaveSummary } from '../systems/persistence';
import { HitRegion } from '../ui/hit-regions';
import { canvasHeightFor, getLayout } from './layout';

const PADDING = 10;

export function getHudHeight(): number {
  return getLayout().hudH;
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const L = getLayout();
  const hudY = L.mapH;

  // HUD background
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, hudY, L.mapW, L.hudH);
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, hudY, L.mapW, L.hudH);

  const stats = state.player.stats!;
  const atkBonus = getAttackBonus(state.player);
  const defBonus = getDefenseBonus(state.player);

  // HP bar
  const barX = PADDING;
  const barY = hudY + PADDING;
  const barW = L.compact ? 150 : 200;
  const barH = 16;
  const hpRatio = stats.hp / stats.maxHp;

  ctx.fillStyle = COLORS.hpBarBg;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = COLORS.hpBar;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = COLORS.textBright;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HP: ${stats.hp}/${stats.maxHp}`, barX + 4, barY + barH / 2);

  // XP bar
  const xpBarY = barY + barH + 4;
  const xpRatio = stats.xpToNext > 0 ? stats.xp / stats.xpToNext : 0;

  ctx.fillStyle = '#112211';
  ctx.fillRect(barX, xpBarY, barW, barH);
  ctx.fillStyle = COLORS.xpBar;
  ctx.fillRect(barX, xpBarY, barW * xpRatio, barH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(barX, xpBarY, barW, barH);

  ctx.fillStyle = COLORS.textBright;
  ctx.fillText(`XP: ${stats.xp}/${stats.xpToNext}`, barX + 4, xpBarY + barH / 2);

  // Stats text: two rows of three columns to the right of the bars
  const statsX = barX + barW + 20;
  const col = L.compact ? 95 : 100;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Depth: ${state.depth}`, statsX, barY + 8);
  ctx.fillText(`Level: ${stats.level}`, statsX, barY + 24);
  ctx.fillText(`ATK: ${stats.attack}${atkBonus ? '+' + atkBonus : ''}`, statsX + col, barY + 8);
  ctx.fillText(`DEF: ${stats.defense}${defBonus ? '+' + defBonus : ''}`, statsX + col, barY + 24);
  ctx.fillText(`Score: ${state.score}`, statsX + 2 * col, barY + 8);
  ctx.fillText(`Turn: ${state.turn}`, statsX + 2 * col, barY + 24);

  // Gold and ability: a fourth column on desktop, a third row under the bars on compact
  const goldPos = L.compact ? { x: barX, y: barY + 40 } : { x: statsX + 300, y: barY + 8 };
  const abilityPos = L.compact ? { x: barX + 120, y: barY + 40 } : { x: statsX + 300, y: barY + 24 };
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`Gold: ${state.treasureCollected}`, goldPos.x, goldPos.y);

  const ability = state.player.ability;
  if (ability) {
    const def = ABILITIES[ability.id];
    const ready = ability.cooldownRemaining === 0;
    const effects = (state.player.statusEffects ?? []).map((e) =>
      e.kind === 'stealth'
        ? `HIDDEN ${e.turnsRemaining}`
        : `${e.stat === 'attack' ? 'RAGE' : 'GUARD'} ${e.turnsRemaining}`
    );
    const status = ready ? 'READY' : `${ability.cooldownRemaining} turns`;
    ctx.fillStyle = ready ? COLORS.textBright : COLORS.textDim;
    ctx.fillText(`[Q] ${def.name}: ${status}`, abilityPos.x, abilityPos.y);
    if (effects.length > 0) {
      ctx.fillStyle = '#ff88ff';
      const prefixW = ctx.measureText(`[Q] ${def.name}: ${status}  `).width;
      ctx.fillText(effects.join('  '), abilityPos.x + prefixW, abilityPos.y);
    }
  }

  // Message log
  const msgX = PADDING;
  const msgY = L.compact ? barY + 56 : xpBarY + barH + 8;
  const lineH = L.compact ? 12 : 14;
  const recentMessages = state.messages.slice(-L.maxMessages);
  ctx.font = '11px monospace';
  recentMessages.forEach((msg, i) => {
    const alpha = 0.5 + 0.5 * ((i + 1) / recentMessages.length);
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
    ctx.fillText(msg, msgX, msgY + i * lineH);
  });
}
```

- [ ] **Step 4: Update `drawInventoryScreen`**

Replace the block from `// Lowest priority` through `ctx.strokeRect(panelX, panelY, panelW, panelH);` with:

```ts
  const L = getLayout();
  const H = canvasHeightFor('inventory', L);
  // On desktop the inventory sits over the map and leaves the HUD visible; compact uses the whole menu canvas.
  const areaH = L.compact ? H : L.mapH;

  // Lowest priority: tapping anywhere outside the panel closes the inventory
  regions.push({ x: 0, y: 0, w: L.mapW, h: H, action: { type: 'closeInventory' } });

  // Overlay
  ctx.fillStyle = COLORS.inventoryBg;
  ctx.fillRect(0, 0, L.mapW, areaH);

  // Border
  const panelX = L.compact ? 20 : 60;
  const panelY = L.compact ? 20 : 40;
  const panelW = L.mapW - 2 * panelX;
  const panelH = areaH - 2 * panelY;
  ctx.strokeStyle = COLORS.inventoryBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
```

Replace `ctx.fillText('INVENTORY', CANVAS_W / 2, panelY + 30);` with `ctx.fillText('INVENTORY', L.mapW / 2, panelY + 30);`.

Replace the equipment column setup:

```ts
  // Equipment section: two columns on desktop, one on compact
  let y = panelY + 60;
  ctx.fillStyle = COLORS.stairs;
  ctx.fillText('Equipment:', panelX + 20, y);
  y += 22;
  const slotCols = L.compact ? 1 : 2;
  const slotRows = Math.ceil(EQUIP_SLOTS.length / slotCols);
  const slotColW = Math.floor((panelW - 60) / slotCols);
```

(the `forEach` body that follows is unchanged; `col = Math.floor(i / slotRows)` is already correct for one column).

Replace the help-text `fillText(..., CANVAS_W / 2, y)` with `L.mapW / 2`.

- [ ] **Step 5: Update `drawCharSelect`**

Replace from `const regions: HitRegion[] = [];` through the end of the `CHARACTERS.forEach` block's opening geometry (the lines defining `totalH`, background, title, `cols`, `cellW`, `cellH`, `gridW`, `startX`, `startY`) with:

```ts
  const regions: HitRegion[] = [];
  const L = getLayout();
  const totalH = canvasHeightFor('charselect', L);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, L.mapW, totalH);

  // Title
  ctx.fillStyle = '#ffcc00';
  ctx.font = L.compact ? 'bold 22px monospace' : 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CHOOSE YOUR HERO', L.mapW / 2, L.compact ? 32 : 40);

  // Grid layout: 5 columns of 140×120 on desktop, 4 columns of 116×96 on compact
  const cols = L.compact ? 4 : 5;
  const cellW = L.compact ? 116 : 140;
  const cellH = L.compact ? 96 : 120;
  const gridW = cols * cellW;
  const startX = Math.floor((L.mapW - gridW) / 2);
  const startY = L.compact ? 55 : 65;
```

Inside the `forEach`, replace the sprite sizing lines:

```ts
    // Character sprite (2x on desktop, 1.5x on compact)
    const spriteSize = L.compact ? Math.floor(TILE_SIZE * 1.5) : TILE_SIZE * 2;
    const spriteX = x + Math.floor((cellW - spriteSize) / 2);
    const spriteY = y + (L.compact ? 6 : 8);
```

Replace everything from `// Selected character details panel` to the end of the function with:

```ts
  // Selected character details panel
  const selected = CHARACTERS[selectedIndex];
  const detailY = startY + Math.ceil(CHARACTERS.length / cols) * cellH + 10;
  const cx = L.mapW / 2;

  ctx.fillStyle = 'rgba(40, 40, 60, 0.7)';
  ctx.fillRect(startX, detailY, gridW, 100);
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, detailY, gridW, 100);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(selected.name, cx, detailY + 20);

  ctx.fillStyle = COLORS.text;
  ctx.font = '13px monospace';
  const statsText = `HP: ${selected.stats.hp}  ATK: ${selected.stats.attack}  DEF: ${selected.stats.defense}`;
  ctx.fillText(statsText, cx, detailY + 40);

  const ability = ABILITIES[selected.ability];
  ctx.fillStyle = '#ff88ff';
  ctx.font = L.compact ? '11px monospace' : '12px monospace';
  ctx.fillText(`[Q] ${ability.name}: ${ability.description} (${ability.cooldown} turn cooldown)`, cx, detailY + 60);

  // Keyboard hint (desktop only; it does not fit beside START on compact)
  if (!L.compact) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px monospace';
    ctx.fillText('[Arrow Keys] Select   [Enter] Start', cx, detailY + 84);
  }

  // START button (tap target)
  const startBtn = { x: startX + gridW - (L.compact ? 118 : 130), y: detailY + (L.compact ? 68 : 66), w: 110, h: 26 };
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
    ctx.font = L.compact ? 'bold 12px monospace' : 'bold 14px monospace';
    ctx.textAlign = 'center';
    if (confirmAbandon) {
      ctx.fillStyle = '#ff5555';
      ctx.fillText(
        L.compact
          ? 'Erase saved run? START again to confirm, [C] to continue.'
          : 'Starting a new game will erase your saved run. [Enter] again to confirm, [C] to continue it.',
        cx,
        detailY + 124
      );
    } else {
      ctx.fillStyle = COLORS.stairs;
      ctx.fillText(
        `[C] Continue saved run: ${resume.name} — Depth ${resume.depth}, Turn ${resume.turn}`,
        cx,
        detailY + 124
      );
    }
    regions.push({ x: startX, y: detailY + 110, w: gridW, h: 28, action: { type: 'continueRun' } });
  }

  return regions;
}
```

- [ ] **Step 6: Update `drawGameOver`**

After `const regions: HitRegion[] = [];` add:

```ts
  const L = getLayout();
  const H = canvasHeightFor('gameover', L);
  const cx = L.mapW / 2;
  const cy = H / 2;
```

Then, in the rest of the function, replace every `CANVAS_W / 2` with `cx`, every `CANVAS_H / 2` with `cy`, `ctx.fillRect(0, 0, CANVAS_W, CANVAS_H + getHudHeight());` with `ctx.fillRect(0, 0, L.mapW, H);`, and `const startX = (CANVAS_W - totalW) / 2;` with `const startX = (L.mapW - totalW) / 2;`.

- [ ] **Step 7: Record the HUD row-3 detail in the spec**

In `docs/superpowers/specs/2026-09-16-compact-layout-design.md`, in the Map view section, replace `Row 3 (\`barY + 40\`): \`Gold\` at +0 and the ability status (\`[Q] Name: READY\`) at +95, with active effects appended.` with `Row 3 (\`barY + 40\`, which sits below both bars so the whole width is free): \`Gold\` at x 10 and the ability status (\`[Q] Name: READY\`) at x 130, with active effects appended.`

- [ ] **Step 8: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 141 tests pass. `tsc` reports no errors; if it flags `CANVAS_W`/`CANVAS_H`/`MAX_MESSAGES` as unused imports anywhere, remove those imports (the constants themselves are deleted in Task 4).

- [ ] **Step 9: Commit**

```bash
git add src/render/hud.ts tests/hud-regions.test.ts docs/superpowers/specs/2026-09-16-compact-layout-design.md
git commit -m "HUD, hero select, inventory, and game over lay out for compact screens" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Canvas sizing, page wiring, constants cleanup, docs

**Files:**
- Modify: `src/game.ts`, `src/main.ts`, `src/constants.ts`, `tests/helpers.ts`, `README.md`
- Test: `tests/game.test.ts`

**Interfaces:**
- Consumes: `computeLayout`, `setLayout`, `getLayout`, `canvasHeightFor`, presets (Task 1).
- Produces: `Game.redraw(): void`; `Game` sizes `ctx.canvas` itself.

- [ ] **Step 1: Give the test context a canvas**

In `tests/helpers.ts`, in `makeCtx`, replace `const target: Record<string, unknown> = {};` with:

```ts
  const target: Record<string, unknown> = { canvas: { width: 0, height: 0 } };
```

- [ ] **Step 2: Write the failing tests**

Append to `tests/game.test.ts`:

```ts
import { COMPACT_LAYOUT, DESKTOP_LAYOUT, setLayout } from '../src/render/layout';

describe('Game canvas sizing', () => {
  afterEach(() => setLayout(DESKTOP_LAYOUT));

  function canvasOf(game: Game): { width: number; height: number } {
    return (game.ctx as unknown as { canvas: { width: number; height: number } }).canvas;
  }

  it('uses 800 by 728 for every screen on desktop', () => {
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), createMemoryStorage());
    expect(canvasOf(game)).toEqual({ width: 800, height: 728 });

    game.handleCharSelectInput('Enter');
    expect(canvasOf(game)).toEqual({ width: 800, height: 728 });
  });

  it('uses the menu height on the hero screen and map plus HUD in play on compact', () => {
    setLayout(COMPACT_LAYOUT);
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), createMemoryStorage());
    expect(canvasOf(game)).toEqual({ width: 480, height: 660 });

    game.handleCharSelectInput('Enter');
    expect(canvasOf(game)).toEqual({ width: 480, height: 548 });

    game.tick({ type: 'toggleInventory' });
    expect(canvasOf(game)).toEqual({ width: 480, height: 660 });
  });

  it('keeps the run intact when the layout changes and the screen is redrawn', () => {
    const game = startGame();
    game.tick({ type: 'wait' });
    const before = { turn: game.state.turn, depth: game.state.depth, pos: { ...game.state.player.position! } };

    setLayout(COMPACT_LAYOUT);
    game.redraw();

    expect(canvasOf(game)).toEqual({ width: 480, height: 548 });
    expect(game.state.turn).toBe(before.turn);
    expect(game.state.depth).toBe(before.depth);
    expect(game.state.player.position).toEqual(before.pos);
  });
});
```

Also add `afterEach` to the vitest import at the top of `tests/game.test.ts`:

```ts
import { afterEach, describe, it, expect, beforeEach } from 'vitest';
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/game.test.ts`
Expected: the three new tests FAIL (canvas stays `{ width: 0, height: 0 }`; `game.redraw is not a function`).

- [ ] **Step 4: Implement canvas sizing in `src/game.ts`**

Add the import:

```ts
import { canvasHeightFor, getLayout } from './render/layout';
```

Add after `handleTap`:

```ts
  /** Redraws whatever screen is active; used after the layout changes. */
  redraw(): void {
    if (this.state.uiMode === 'charselect') {
      this.drawCharSelectScreen();
    } else {
      this.draw();
    }
  }

  /** Sizes the canvas for the active screen. Resizing clears the context state, so re-apply what we rely on. */
  private ensureCanvasSize(): void {
    const layout = getLayout();
    const w = layout.mapW;
    const h = canvasHeightFor(this.state.uiMode, layout);
    const canvas = this.ctx.canvas;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this.ctx.imageSmoothingEnabled = false;
    }
  }
```

Change `drawCharSelectScreen` and `draw` to call it first:

```ts
  private drawCharSelectScreen(): void {
    this.ensureCanvasSize();
    this.hitRegions = drawCharSelect(this.ctx, this.charSelectIndex, this.sprites, this.resumeSummary, this.confirmAbandon);
  }

  draw(): void {
    this.ensureCanvasSize();
    this.hitRegions = render(this.ctx, this.state, this.sprites, this.shareStatus);
  }
```

- [ ] **Step 5: Wire the page in `src/main.ts`**

Replace the constants and HUD imports and the canvas sizing at the top with:

```ts
import { Game } from './game';
import { setupInput } from './systems/input';
import { loadSprites } from './render/sprite-loader';
import { computeLayout, getLayout, setLayout } from './render/layout';
import { canvasPointFromClient } from './ui/hit-regions';
import { controlBarVisible, setupTouchControls } from './ui/touch-controls';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLElement;

const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

// Pick the layout for this screen before anything draws
setLayout(computeLayout(container.clientWidth));
```

Inside the `loadSprites().then(...)` callback, after `syncBar();` at the end, add:

```ts
  // Switch layouts when the window crosses the compact breakpoint (rotation, resize)
  window.addEventListener('resize', () => {
    const next = computeLayout(container.clientWidth);
    if (next.compact !== getLayout().compact) {
      setLayout(next);
      game.redraw();
    }
  });
```

- [ ] **Step 6: Remove the dead constants**

In `src/constants.ts`, delete `VIEWPORT_W`, `VIEWPORT_H`, `CANVAS_W`, `CANVAS_H`, and `MAX_MESSAGES`, leaving:

```ts
export const TILE_SIZE = 32;

export const MAP_W = 60;
export const MAP_H = 40;

export const FOV_RADIUS = 8;

export const COLORS = {
  ...unchanged...
} as const;
```

Run `npx tsc --noEmit`; fix any remaining import of the removed names by switching that reader to `getLayout()`.

- [ ] **Step 7: Update the README**

Features bullet: replace `- **Touch controls** — Play on a phone or tablet with an on-screen d-pad and tappable menus` with `- **Touch controls & phone layout** — Play on a phone or tablet with an on-screen d-pad and tappable menus; narrow screens get a 15×13 map and single-column menus`.

In the Touch Controls section, replace `The canvas scales to fit the screen width. On a portrait phone the map is playable but the HUD text is small; a compact layout for narrow screens is planned.` with `Below 600 pixels of width the game switches to a compact layout: the map shows 15×13 tiles with a reflowed HUD, and the hero, inventory, and game over screens use a taller single-column canvas. Rotating or resizing switches layouts without losing your run.`

- [ ] **Step 8: Run tests, type check, build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 144 tests pass, clean.

- [ ] **Step 9: Verify in the browser**

Start the dev server (`.claude/launch.json` config `dev`). Desktop: hero screen and play look as before (800 wide); game over text sits centred on the full canvas. Then `resize_window` to the mobile preset and reload: hero screen shows a 4×4 grid with START and no keyboard hint at 480×660; START shows the map at 480×548 with the three-row HUD; Bag shows the single-column inventory at 480×660 with `[drop]` and ✕ inside the canvas. Resize back to desktop without reloading: the layout switches and the run continues. No console errors.

- [ ] **Step 10: Commit**

```bash
git add src/game.ts src/main.ts src/constants.ts tests/helpers.ts tests/game.test.ts README.md
git commit -m "Size the canvas per screen and switch layouts on resize" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Layout module and `canvasHeightFor` → Task 1. Camera/renderer → Task 2. HUD reflow, compact hero grid, compact inventory panel, game over centring → Task 3. Canvas sizing, `redraw`, resize listener, constants removal, README → Task 4. Spec tests 1–3 → Task 1; 4 → Task 2; 5–6 → Task 3; 7–9 → Task 4.

**Placeholders.** The `COLORS` block in Task 4 Step 6 is elided with `...unchanged...` because it is not modified; every other code step is complete.

**Type consistency.** `getLayout`, `setLayout`, `computeLayout`, `canvasHeightFor`, `COMPACT_LAYOUT`, `DESKTOP_LAYOUT` named identically in Tasks 1–4. `Game.redraw()` defined in Task 4 and used by `main.ts` in Task 4. `makeCtx` canvas stub shape `{ width, height }` matches `ensureCanvasSize`'s reads and writes.
