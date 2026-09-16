# Compact Layout — Design

**Date:** 2026-09-16
**Status:** Approved in discussion; spec for implementation planning.

## Goal

Make the game readable on portrait phones. Below 600 CSS pixels of available width the map shows 15×13 tiles on a 480-pixel-wide canvas with a reflowed HUD, and the three menu screens (hero select, inventory, game over) draw on a taller 660-pixel canvas so they fit in one readable column. Desktop is unchanged. Rotating or resizing switches layouts without losing the run.

## Non-goals

- No change to field-of-view radius, dungeon size, or any gameplay number. FOV radius 8 exceeds the compact half-width of 7 by one tile; accepted.
- No scrolling or paging inside menus.
- No landscape-specific layout; compact is keyed on width only.
- No change to the touch control bar beyond what the narrower canvas implies.

## Layout model

### `src/render/layout.ts` (new)

```ts
export interface Layout {
  compact: boolean;
  viewportW: number;   // tiles
  viewportH: number;   // tiles
  mapW: number;        // px = viewportW * TILE_SIZE
  mapH: number;        // px = viewportH * TILE_SIZE
  hudH: number;        // px
  menuH: number;       // px: canvas height for hero select, inventory, game over
  maxMessages: number; // log lines in the HUD
}

export const COMPACT_BREAKPOINT = 600;   // CSS px of available width

export const DESKTOP_LAYOUT: Layout = {
  compact: false, viewportW: 25, viewportH: 19, mapW: 800, mapH: 608, hudH: 120, menuH: 728, maxMessages: 5,
};
export const COMPACT_LAYOUT: Layout = {
  compact: true, viewportW: 15, viewportH: 13, mapW: 480, mapH: 416, hudH: 132, menuH: 660, maxMessages: 4,
};

export function computeLayout(availableWidth: number): Layout;  // COMPACT below the breakpoint, else DESKTOP
export function getLayout(): Layout;                              // active layout, DESKTOP_LAYOUT by default
export function setLayout(layout: Layout): void;
/** Canvas pixel height a UI mode needs under the given layout. */
export function canvasHeightFor(mode: UIMode, layout: Layout): number;
```

`canvasHeightFor`: `'game'` and `'inventory'` on desktop → `mapH + hudH` (728). On compact, `'game'` → `mapH + hudH` (548); `'inventory'`, `'charselect'`, `'gameover'` → `menuH`. On desktop `'charselect'` and `'gameover'` → `mapH + hudH` (728, unchanged from today).

`src/constants.ts` keeps `TILE_SIZE`, `MAP_W`, `MAP_H`, `FOV_RADIUS`, `COLORS`. `VIEWPORT_W`, `VIEWPORT_H`, `CANVAS_W`, `CANVAS_H`, `MAX_MESSAGES` are removed; every reader switches to `getLayout()`.

## Canvas sizing

`Game` gains `private ensureCanvasSize(): void` which computes `w = getLayout().mapW`, `h = canvasHeightFor(this.state.uiMode, getLayout())`, and if `ctx.canvas.width !== w || ctx.canvas.height !== h` sets both and re-applies `ctx.imageSmoothingEnabled = false` (a resize resets context state). `draw()` and `drawCharSelectScreen()` call it first. `main.ts` no longer sets the canvas size itself.

`Game` gains public `redraw(): void` which calls `drawCharSelectScreen()` in `'charselect'` mode and `draw()` otherwise. `main.ts` listens to `resize`, computes `computeLayout(container.clientWidth)`, and when `compact` differs from the active layout calls `setLayout` then `game.redraw()`.

## Map view (`renderer.ts`, `camera.ts`, `drawHud`)

- `getCamera` and `render` read `viewportW`/`viewportH`/`mapW`/`mapH` from `getLayout()`.
- `drawHud` reads `hudH`, draws at `y = mapH`, and lays out:
  - **Desktop**: exactly as today.
  - **Compact**: bars 150 wide at x 10. Stats block at `statsX = 170`: row 1 (`barY + 8`): `Depth`, `ATK` at +0, +95; `Score` at +190. Row 2 (`barY + 24`): `Level`, `DEF`, `Turn` at the same columns. Row 3 (`barY + 40`, which sits below both bars so the whole width is free): `Gold` at x 10 and the ability status (`[Q] Name: READY`) at x 130, with active effects appended. Message log starts at `barY + 56`, `maxMessages` lines at 12px spacing.
- `render` returns regions exactly as today.

## Hero select (`drawCharSelect`)

Reads `L = getLayout()`; canvas is `L.mapW × canvasHeightFor('charselect', L)`.

- **Desktop**: unchanged (5 columns, 140×120 cells, sprite 64, detail panel 100, START, banner).
- **Compact**: `cols = 4`, `cellW = 116`, `cellH = 96`, `gridW = 464`, `startX = 8`, `startY = 55`, sprite 48 px at `y + 6`, race/class labels at 10px below the sprite. `detailY = startY + 4 * cellH + 10 = 449`. Detail panel 100 tall: name at +20, stats at +40, ability at +60 (11px font), START at `(startX + gridW - 118, detailY + 68, 110, 26)`. The keyboard hint line is omitted in compact. Banner at `detailY + 124` (region `detailY + 110`, height 28). Total 660 ✓.

Region shapes are unchanged; only the numbers differ.

## Inventory (`drawInventoryScreen`)

Reads `L = getLayout()`; `H = canvasHeightFor('inventory', L)`.

- Overlay and the lowest-priority close region cover `L.mapW × H`.
- **Desktop**: panel `(60, 40, mapW − 120, mapH − 80)` and two-column equipment, unchanged.
- **Compact**: panel `(20, 20, mapW − 40, H − 40)` = 440×620; equipment in **one** column of six rows at 18px; everything else (stats, items, `[drop]`, ✕, help line) keeps today's spacing. Ten items end around y = 552 inside the 640 bottom ✓. Region formulas use `panelX`/`panelW`, so they follow.

## Game over (`drawGameOver`)

Replace `CANVAS_H / 2` with `H / 2` where `H = canvasHeightFor('gameover', L)`, and the overlay with `L.mapW × H`. On desktop `H = 728`, so the vertical positions shift by 60 px from today (they were based on `CANVAS_H = 608` before); every element still fits and the share/play-again regions move with their text.

## `main.ts` and `index.html`

- `main.ts`: `setLayout(computeLayout(container.clientWidth))` before constructing `Game`; remove the explicit `canvas.width/height` assignment; add the resize listener described above.
- `index.html`: no structural change. `#game-container` keeps `max-width: 804px`.

## Documentation

README: features bullet updated to say the layout adapts to phones; the Touch Controls section's "compact layout is planned" sentence replaced with a description of the phone layout (15×13 map, taller menus).

## Testing

`tests/layout.test.ts`
1. `computeLayout(599)` is compact; `computeLayout(600)` and `computeLayout(1280)` are desktop.
2. Compact layout: `mapW 480`, `mapH 416`, `viewportW 15`, `viewportH 13`.
3. `canvasHeightFor`: desktop returns 728 for every mode; compact returns 548 for `game` and 660 for `inventory`, `charselect`, `gameover`.

`tests/camera.test.ts` (new)
4. Under compact, a player at (30, 20) in a 60×40 dungeon yields camera (23, 14); a player at (0, 0) yields (0, 0); a player at (59, 39) yields (45, 27).

`tests/hud-regions.test.ts` additions (switch layout in `beforeEach`/`afterEach`)
5. Compact hero select still returns 15 card regions and every region lies within `0..480 × 0..660`.
6. Compact inventory with ten items returns ten use regions all within `0..480 × 0..660`.

`tests/game.test.ts` additions (the `makeCtx` stub gains a `canvas` object with `width`/`height`)
7. Desktop: after construction the canvas is 800×728; after starting a run it is still 800×728.
8. Compact: after construction the canvas is 480×660; after starting a run it is 480×548; after opening the inventory it is 480×660.
9. Switching layout and calling `redraw()` mid-run leaves `state.turn`, `state.depth`, and the player position unchanged.

All 130 existing tests stay green (they run under the default desktop layout).

## Files

**New:** `src/render/layout.ts`, `tests/layout.test.ts`, `tests/camera.test.ts`.
**Changed:** `src/constants.ts`, `src/render/camera.ts`, `src/render/renderer.ts`, `src/render/hud.ts`, `src/game.ts`, `src/main.ts`, `tests/helpers.ts`, `tests/hud-regions.test.ts`, `tests/game.test.ts`, `README.md`.
