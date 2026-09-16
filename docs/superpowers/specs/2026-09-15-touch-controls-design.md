# Touch Controls — Design

**Date:** 2026-09-15
**Status:** Approved in discussion; spec for implementation planning.

## Goal

Make every screen usable without a keyboard on touch devices: an on-screen d-pad and action buttons for the map view, and tappable regions on the canvas-drawn screens (hero select, inventory, game over). The canvas scales to the viewport width so the page fits a phone.

## Non-goals

- No compact layout for narrow screens. The canvas stays 800×728 and scales down via CSS; HUD text will be small on portrait phones. That is the agreed follow-up.
- No tap-to-move or swipe on the map.
- No hold-to-repeat on the d-pad.
- No rewrite of canvas screens into HTML.

## Architecture

Two input paths, both feeding the existing `Game` API:

1. **Control bar (DOM).** HTML buttons under the canvas, each carrying a `data-action` attribute. A small module parses the attribute into an existing `Action` and calls `game.tick`. Shown only on coarse-pointer devices via CSS; hidden on the hero select and game over screens.
2. **Canvas tap regions.** Each canvas screen returns a list of tappable rectangles with a `TapAction` as it draws. `Game` keeps the latest list; a click handler on the canvas converts the pointer position to canvas pixels and asks `Game.handleTap` to dispatch the region's action onto the existing key handlers and actions.

## `src/ui/hit-regions.ts` (new)

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

export interface HitRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  action: TapAction;
}

/** Topmost region (last in the list) containing the point, or null. */
export function findHitRegion(regions: readonly HitRegion[], x: number, y: number): HitRegion | null;

/** Client coordinates → canvas pixel coordinates, accounting for CSS scaling. */
export function canvasPointFromClient(
  rect: { left: number; top: number; width: number; height: number },
  canvasW: number,
  canvasH: number,
  clientX: number,
  clientY: number
): { x: number; y: number };
```

`findHitRegion` searches from the end so a region drawn later (e.g. a row inside a panel) wins over one drawn earlier (e.g. a full-screen "tap outside to close" region). A point on the rectangle's edge counts as inside (`x >= r.x && x < r.x + r.w`, same for y).

## `src/ui/touch-controls.ts` (new)

```ts
export function parseControlAction(value: string): Action | null;
export function controlBarVisible(mode: UIMode): boolean;
export function setupTouchControls(
  bar: HTMLElement,
  dispatch: (action: Action) => void
): void;
```

- `parseControlAction` accepts: `move:dx,dy` (dx, dy in −1..1) → `{ type: 'move', dx, dy }`; `wait`, `pickup`, `toggleInventory`, `ability`, `descend` → the matching action; anything else → null.
- `controlBarVisible` is true for `'game'` and `'inventory'`, false for `'charselect'` and `'gameover'`.
- `setupTouchControls` attaches one `click` listener to the bar; it reads `data-action` from the closest `button`, parses it, and calls `dispatch` when non-null. It calls `preventDefault` to stop focus and double-tap zoom side effects.

## Canvas screens (`src/render/hud.ts`, `src/render/renderer.ts`)

All three overlay drawers return `HitRegion[]`; `render` returns whatever the active overlay returned (empty array in plain game mode). Coordinates below use the existing layout constants in `hud.ts`.

### Hero select (`drawCharSelect`)

- Each card: `{ x: startX + col*cellW, y: startY + row*cellH, w: cellW, h: cellH, action: selectHero(i) }`.
- A drawn **START** button: rectangle `(startX + gridW - 130, detailY + 66, 110, 26)`, gold border, gold text `START`, region → `startHero`. The keyboard hint text stays where it is.
- If `resume` is present, the banner row `(startX, detailY + 110, gridW, 28)` is a region → `continueRun`, in both the cyan and red states.

### Inventory (`drawInventoryScreen`)

- First region pushed (lowest priority): the whole canvas `(0, 0, CANVAS_W, CANVAS_H + HUD_HEIGHT)` → `closeInventory`, so a tap outside the panel closes it.
- A drawn close mark `✕` at the panel's top-right: region `(panelX + panelW - 36, panelY + 8, 28, 28)` → `closeInventory`.
- For each item row `i` at baseline `rowY` (14px font, middle baseline): region `(panelX + 20, rowY - 9, panelW - 120, 18)` → `useItem(i)`, and a dim drawn label `[drop]` right-aligned at `panelX + panelW - 20` with region `(panelX + panelW - 90, rowY - 9, 70, 18)` → `dropItem(i)`.
- The help line changes to `[1-9, 0] or tap: Use  |  [Shift+num] or [drop]: Drop  |  [Esc/i] or ✕: Close`.

### Game over (`drawGameOver`)

- Share options: for option `i`, region `(startX + i*optionW, shareY + 8, optionW, 28)` → `share(target)` with targets `'m'`, `'b'`, `'c'`.
- Play again line: region `(CANVAS_W/2 - 150, shareY + 56, 300, 28)` → `playAgain`. Text changes to `[Enter] or tap here to play again`.

## `src/game.ts`

- New field `hitRegions: HitRegion[] = []`. `draw()` and `drawCharSelectScreen()` assign the returned regions to it.
- New method `handleTap(x: number, y: number): void`: finds the region; if none, returns. Dispatch:
  - `selectHero` → `charSelectIndex = index`, `confirmAbandon = false`, redraw.
  - `startHero` → `handleCharSelectInput('Enter')` (so the erase confirmation applies).
  - `continueRun` → `handleCharSelectInput('c')`.
  - `useItem` / `dropItem` → `tick({ type, index })`.
  - `closeInventory` → `tick({ type: 'toggleInventory' })` only if `uiMode === 'inventory'`.
  - `share` → `handleGameOverInput(target)`.
  - `playAgain` → `handleGameOverInput('Enter')`.

## `src/main.ts` and `index.html`

- `index.html` gains, after the canvas:

```html
<div id="touch-controls" hidden>
  <div class="dpad">
    <button data-action="move:0,-1" aria-label="Move up">▲</button>
    <button data-action="move:-1,0" aria-label="Move left">◀</button>
    <button data-action="wait" aria-label="Wait">●</button>
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

- CSS: `canvas { max-width: 100%; height: auto; }`; `#touch-controls { display: none; }` and `@media (pointer: coarse) { #touch-controls:not([hidden]) { display: flex; } .controls { display: none; } }`; the d-pad is a 3×3 grid with buttons at least 56px, actions a row of 4; all buttons `touch-action: manipulation; user-select: none;` with a pressed state. `body` uses `align-items: flex-start` and `padding: 8px` below 840px wide so the page scrolls instead of clipping.
- `main.ts`: after creating the game, call `setupTouchControls(bar, (a) => { game.tick(a); syncBar(); })`; add a `click` listener on the canvas that converts the point with `canvasPointFromClient(canvas.getBoundingClientRect(), canvas.width, canvas.height, e.clientX, e.clientY)` and calls `game.handleTap(x, y)` then `syncBar()`; call `syncBar()` after every keydown too. `syncBar()` sets `bar.hidden = !controlBarVisible(game.state.uiMode)`.

## Documentation

README: a **Touch controls** section under How to Play describing the d-pad and action buttons, tapping hero cards and START, tapping inventory rows and `[drop]`, and tapping share options; a features bullet `**Touch controls** — Play on a phone or tablet with an on-screen d-pad and tappable menus`; a note that portrait phones render small pending the compact layout.

## Testing

`tests/hit-regions.test.ts`
1. `canvasPointFromClient` maps a client point on a canvas displayed at half size to double coordinates, and subtracts the rect offset.
2. `findHitRegion` returns null when nothing contains the point.
3. `findHitRegion` returns the last matching region when two overlap.

`tests/touch-controls.test.ts`
4. `parseControlAction` maps each of the six attribute forms to the right action and returns null for garbage and for out-of-range move deltas.
5. `controlBarVisible` is true for game and inventory, false otherwise.

`tests/hud-regions.test.ts` (uses `makeCtx`)
6. `drawCharSelect` returns 15 `selectHero` regions with indices 0–14 and one `startHero` region; with a resume summary it also returns one `continueRun` region.
7. `drawInventoryScreen` with two items returns, in order, one `closeInventory` full-canvas region, one `closeInventory` close-mark region, and a `useItem`/`dropItem` pair per item with matching indices.
8. `drawGameOver` returns three `share` regions with targets m, b, c and one `playAgain` region.
9. `render` returns an empty list in game mode and a non-empty list in inventory mode.

`tests/game.test.ts` additions
10. Tapping a hero card changes `charSelectIndex` to that card.
11. With a save present, tapping START sets `confirmAbandon`; tapping again starts a new game.
12. Tapping an inventory row equips the item exactly as the number key does; tapping its `[drop]` drops it.
13. Tapping the full-canvas close region closes the inventory without spending a turn.
14. Tapping play again on game over returns to character select.

All 97 existing tests stay green.

## Files

**New:** `src/ui/hit-regions.ts`, `src/ui/touch-controls.ts`, `tests/hit-regions.test.ts`, `tests/touch-controls.test.ts`, `tests/hud-regions.test.ts`.
**Changed:** `src/render/hud.ts`, `src/render/renderer.ts`, `src/game.ts`, `src/main.ts`, `index.html`, `tests/game.test.ts`, `tests/renderer.test.ts` (render now returns regions; existing assertion unchanged), `README.md`.
