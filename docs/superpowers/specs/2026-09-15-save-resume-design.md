# Save and Resume — Design

**Date:** 2026-09-15
**Status:** Approved in discussion; spec for implementation planning.

## Goal

A run survives closing or refreshing the page. The game autosaves after every turn to a single slot in browser storage, and the character select screen offers to continue the saved run. Death or starting a new run clears the slot. Reloading can never undo a move, so permadeath is preserved.

## Non-goals

- No manual save key and no multiple slots.
- No cloud or cross-device sync.
- No replay or seeded regeneration; the full state is stored.
- No migration of old save formats: a save from a different version is discarded.
- No debouncing of writes; revisit only if a slow device shows input lag.

## Storage

### Record shape

```ts
interface SaveRecord {
  version: number;     // SAVE_VERSION, currently 1
  savedAt: number;     // Date.now(), informational
  state: GameState;    // the live state, serialised as-is
}
```

Stored under the key `gloomstep-dungeon-save` as `JSON.stringify(record)`.

`GameState` is already plain data. `state.player` is the same object as one entry of `state.entities`; after `JSON.parse` they are separate copies, so load relinks `player` to the entity with `player === true`. Inventory items and equipped items are held only in the player's inventory and equipment, never in `state.entities`, so no other reference needs relinking. `highScores` is included in the record but ignored on load; the live high score list is re-read from its own key.

### Storage abstraction

```ts
export interface RunStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

`defaultStorage()` returns `globalThis.localStorage` when it exists and is usable (a probe `setItem`/`removeItem` inside try/catch), otherwise an in-memory `Map`-backed implementation. Every storage call in the persistence module is wrapped in try/catch and failures are swallowed, matching `scoring.ts`.

### `src/systems/persistence.ts` (new)

```ts
export const SAVE_KEY = 'gloomstep-dungeon-save';
export const SAVE_VERSION = 1;

export interface SaveSummary { name: string; depth: number; turn: number; }

export function saveRun(state: GameState, storage?: RunStorage): void;
export function loadRun(storage?: RunStorage): GameState | null;
export function clearRun(storage?: RunStorage): void;
export function getSaveSummary(storage?: RunStorage): SaveSummary | null;
```

- `saveRun` writes the record. Nothing is written when `state.gameOver` is true.
- `loadRun` returns null when the key is missing, the JSON does not parse, `version !== SAVE_VERSION`, or the parsed state lacks a `dungeon`, an `entities` array, or a player entity. In the corrupt and wrong-version cases it also removes the key. On success it relinks `player`, forces `uiMode` to `'game'`, and returns the state.
- `getSaveSummary` performs the same validation as `loadRun` without relinking and returns the player's appearance name, `depth`, and `turn`.
- `clearRun` removes the key.

## Entity ids

`src/ecs/entity.ts` gains `setNextEntityId(id: number): void`. After a successful load the game computes the maximum `id` across `state.entities`, `player.inventory.items`, and every non-null equipment slot, then calls `setNextEntityId(max + 1)` so entities created after resuming never reuse a saved id.

## Game hooks (`src/game.ts`)

- The constructor accepts an optional third argument `storage: RunStorage = defaultStorage()` and keeps it on the instance.
- `endTurn`: after the death check and message trim, if `!state.gameOver` call `saveRun(state, storage)`; if the player died this turn call `clearRun(storage)`.
- `tryDescend`: after `computeFOV`, call `saveRun(state, storage)` (it does not pass through `endTurn`).
- `startGameWithCharacter`: call `clearRun(storage)` before building the new state.
- New `resumeRun(): boolean`: `loadRun`; if null return false. Otherwise set `this.state`, reset the entity id counter as above, push `Welcome back, <name>. Depth <depth>, turn <turn>.`, `computeFOV`, `draw`, return true.
- `showCharSelect`: read `getSaveSummary` into `this.resumeSummary` and reset `this.confirmAbandon = false`.
- `handleCharSelectInput`:
  - `'c'` / `'C'`: if `resumeSummary` exists, `resumeRun()` and return.
  - `'Enter'`: if `resumeSummary` exists and `!confirmAbandon`, set `confirmAbandon = true`, redraw, return. Otherwise start the game (which clears the save).
  - Any other key resets `confirmAbandon = false` before its normal handling.
- Every character select redraw passes `resumeSummary` and `confirmAbandon` to `drawCharSelect`.

## UI (`src/render/hud.ts`)

`drawCharSelect` gains two optional parameters: `resume: SaveSummary | null = null` and `confirmAbandon = false`. When `resume` is present a banner is drawn centred at `detailY + 124` (below the detail panel, which ends at `detailY + 100`):

- Normal: cyan (`COLORS.stairs`), bold 14px: `[C] Continue saved run: <name> — Depth <depth>, Turn <turn>`
- Confirming: red (`#ff5555`), bold 14px: `Starting a new game will erase your saved run. [Enter] again to confirm, [C] to continue it.`

## Documentation

README features list gains: `**Save & resume** — Your run autosaves every turn; press C on the hero screen to pick up where you left off`. The controls table gains a row `C | Continue saved run (hero screen)`. Tips gain a line explaining that a new game erases the saved run and that death clears it.

## Testing (Vitest)

`tests/persistence.test.ts`, using an in-memory `RunStorage`:

1. `saveRun` then `loadRun` returns a state deep-equal to the original with `player` relinked to the entry in `entities` that has `player === true`.
2. `loadRun` returns null when nothing is stored.
3. `loadRun` returns null and removes the key when the stored value is not JSON.
4. `loadRun` returns null and removes the key when `version` differs.
5. `saveRun` writes nothing when `state.gameOver` is true.
6. `getSaveSummary` returns the hero name, depth, and turn.
7. `loadRun` forces `uiMode` to `'game'` even if the state was saved with the inventory open.

`tests/game.test.ts` additions, constructing `Game` with an in-memory storage:

8. A wait tick writes a save whose summary has turn 1.
9. Death (player hp set to 0, then a wait tick) clears the save.
10. With a save present, a new `Game` shows a resume summary, and `handleCharSelectInput('c')` restores the saved turn and depth with `uiMode === 'game'`.
11. With a save present, `Enter` once leaves the save in place and sets the confirm flag; `Enter` again starts a new run and the save is gone.
12. After resuming, `createEntity()` returns an id greater than every id in the saved state.

All 81 existing tests must stay green.

## Files

**New:** `src/systems/persistence.ts`, `tests/persistence.test.ts`.
**Changed:** `src/ecs/entity.ts`, `src/game.ts`, `src/render/hud.ts`, `tests/game.test.ts`, `README.md`.
