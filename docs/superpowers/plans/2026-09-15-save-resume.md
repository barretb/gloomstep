# Save and Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Autosave the run after every turn to one browser-storage slot and let the player continue it from the character select screen.

**Architecture:** A new `src/systems/persistence.ts` serialises the whole `GameState` as a versioned JSON record behind a tiny storage interface (localStorage by default, in-memory fallback). `Game` saves after each turn and on descent, clears on death and new game, and gains a resume path that relinks the player and resets the entity id counter. The character select screen shows a Continue banner and a two-step confirm before discarding a save.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-save-resume-design.md`

## Global Constraints

- TypeScript strict mode; `npx tsc --noEmit` must pass (config has `noUnusedLocals`, `noUnusedParameters`).
- Tests live in `tests/`, run with `npx vitest run`. All 81 existing tests must stay green.
- Two-space indentation, single quotes, semicolons.
- No new dependencies.
- Storage key is exactly `gloomstep-dungeon-save`; save version is `1`.
- Commit after each task with trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/systems/persistence.ts` (create) | Storage interface, default/in-memory storage, save/load/clear/summary |
| `src/ecs/entity.ts` (modify) | `setNextEntityId` |
| `src/game.ts` (modify) | Storage on the instance; autosave/clear hooks; resume and confirm flow |
| `src/render/hud.ts` (modify) | Continue banner on character select |
| `README.md` (modify) | Feature, control, tips |
| `tests/persistence.test.ts` (create) | Persistence module tests |
| `tests/game.test.ts` (modify) | Hook and resume tests |

---

### Task 1: Persistence module and entity id setter

**Files:**
- Create: `src/systems/persistence.ts`
- Modify: `src/ecs/entity.ts`
- Test: `tests/persistence.test.ts`

**Interfaces:**
- Produces:
  - `RunStorage { getItem(key): string | null; setItem(key, value): void; removeItem(key): void }`
  - `SaveSummary { name: string; depth: number; turn: number }`
  - `createMemoryStorage(): RunStorage`
  - `defaultStorage(): RunStorage`
  - `saveRun(state, storage?)`, `loadRun(storage?): GameState | null`, `clearRun(storage?)`, `getSaveSummary(storage?): SaveSummary | null`
  - `SAVE_KEY`, `SAVE_VERSION`
  - `setNextEntityId(id: number): void` in `src/ecs/entity.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/persistence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  clearRun,
  getSaveSummary,
  loadRun,
  saveRun,
  SAVE_KEY,
} from '../src/systems/persistence';
import { makeGear, makePlayer, makeState, makeMonster } from './helpers';

function savedState() {
  const player = makePlayer(3, 4, { hp: 12 });
  player.appearance!.name = 'Elf Sentinel';
  player.inventory!.items.push(makeGear('Short Sword', 'weapon', { attackBonus: 2 }));
  player.equipment!.head = makeGear('Iron Helmet', 'head', { defenseBonus: 2 });
  const state = makeState(player, [makeMonster(6, 6)]);
  state.depth = 4;
  state.turn = 212;
  state.score = 310;
  return state;
}

describe('saveRun and loadRun', () => {
  it('round-trips the state and relinks the player to its entity', () => {
    const storage = createMemoryStorage();
    const original = savedState();

    saveRun(original, storage);
    const loaded = loadRun(storage);

    expect(loaded).not.toBeNull();
    expect(loaded).toEqual({ ...original, uiMode: 'game' });
    expect(loaded!.player).toBe(loaded!.entities.find((e) => e.player));
    expect(loaded!.player.equipment!.head!.appearance!.name).toBe('Iron Helmet');
  });

  it('returns null when nothing is stored', () => {
    expect(loadRun(createMemoryStorage())).toBeNull();
  });

  it('returns null and removes a save that is not JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');

    expect(loadRun(storage)).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('returns null and removes a save from a different version', () => {
    const storage = createMemoryStorage();
    saveRun(savedState(), storage);
    const record = JSON.parse(storage.getItem(SAVE_KEY)!);
    record.version = 99;
    storage.setItem(SAVE_KEY, JSON.stringify(record));

    expect(loadRun(storage)).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('writes nothing once the run is over', () => {
    const storage = createMemoryStorage();
    const state = savedState();
    state.gameOver = true;

    saveRun(state, storage);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('forces the UI mode back to the game screen', () => {
    const storage = createMemoryStorage();
    const state = savedState();
    state.uiMode = 'inventory';

    saveRun(state, storage);

    expect(loadRun(storage)!.uiMode).toBe('game');
  });
});

describe('getSaveSummary', () => {
  it('reports the hero, depth, and turn of the saved run', () => {
    const storage = createMemoryStorage();
    saveRun(savedState(), storage);

    expect(getSaveSummary(storage)).toEqual({ name: 'Elf Sentinel', depth: 4, turn: 212 });
  });

  it('is null after clearRun', () => {
    const storage = createMemoryStorage();
    saveRun(savedState(), storage);

    clearRun(storage);

    expect(getSaveSummary(storage)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/persistence.test.ts`
Expected: FAIL with `Cannot find module '../src/systems/persistence'`

- [ ] **Step 3: Add the entity id setter**

Append to `src/ecs/entity.ts`:

```ts
/** Continue numbering from `id`; used after loading a saved run. */
export function setNextEntityId(id: number): void {
  nextId = id;
}
```

- [ ] **Step 4: Create the persistence module**

Create `src/systems/persistence.ts`:

```ts
import { GameState } from '../types';

export const SAVE_KEY = 'gloomstep-dungeon-save';
export const SAVE_VERSION = 1;

/** The subset of the Web Storage API the game needs. */
export interface RunStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveSummary {
  name: string;
  depth: number;
  turn: number;
}

interface SaveRecord {
  version: number;
  savedAt: number;
  state: GameState;
}

/** In-memory storage for tests and for browsers where localStorage is unavailable. */
export function createMemoryStorage(): RunStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

let fallbackStorage: RunStorage | null = null;

/** localStorage when it exists and is writable, otherwise a shared in-memory store. */
export function defaultStorage(): RunStorage {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const probe = `${SAVE_KEY}-probe`;
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // fall through to the in-memory store
  }
  fallbackStorage ??= createMemoryStorage();
  return fallbackStorage;
}

/** Writes the run. Does nothing once the run is over. */
export function saveRun(state: GameState, storage: RunStorage = defaultStorage()): void {
  if (state.gameOver) return;
  const record: SaveRecord = { version: SAVE_VERSION, savedAt: Date.now(), state };
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(record));
  } catch {
    // storage full or unavailable; the run simply is not saved this turn
  }
}

/**
 * Reads the saved run, or null if there is none or it is unusable.
 * Relinks `player` to its entity and returns the state on the game screen.
 */
export function loadRun(storage: RunStorage = defaultStorage()): GameState | null {
  const state = readValidState(storage);
  if (!state) return null;
  state.player = state.entities.find((e) => e.player)!;
  state.uiMode = 'game';
  return state;
}

export function clearRun(storage: RunStorage = defaultStorage()): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function getSaveSummary(storage: RunStorage = defaultStorage()): SaveSummary | null {
  const state = readValidState(storage);
  if (!state) return null;
  const player = state.entities.find((e) => e.player)!;
  return {
    name: player.appearance?.name ?? 'Adventurer',
    depth: state.depth,
    turn: state.turn,
  };
}

function readValidState(storage: RunStorage): GameState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    clearRun(storage);
    return null;
  }
  if (!isValidRecord(record)) {
    clearRun(storage);
    return null;
  }
  return record.state;
}

function isValidRecord(value: unknown): value is SaveRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<SaveRecord>;
  if (record.version !== SAVE_VERSION) return false;
  const state = record.state as Partial<GameState> | undefined;
  if (!state || typeof state !== 'object') return false;
  if (!state.dungeon || !Array.isArray(state.entities)) return false;
  return state.entities.some((e) => e && e.player === true);
}
```

- [ ] **Step 5: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 89 tests pass (81 + 8), no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/systems/persistence.ts src/ecs/entity.ts tests/persistence.test.ts
git commit -m "Add run persistence module and entity id setter" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Autosave and clear hooks in the game loop

**Files:**
- Modify: `src/game.ts`
- Test: `tests/game.test.ts`

**Interfaces:**
- Consumes: `RunStorage`, `defaultStorage`, `saveRun`, `clearRun`, `getSaveSummary`, `createMemoryStorage` (Task 1).
- Produces: `new Game(ctx, sprites, storage?)`; the instance field `storage: RunStorage`.

- [ ] **Step 1: Write the failing tests**

In `tests/game.test.ts`, replace the imports and the `startGame` helper at the top of the file with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game';
import { createMemoryStorage, getSaveSummary, RunStorage } from '../src/systems/persistence';
import { makeCtx } from './helpers';

function startGame(storage: RunStorage = createMemoryStorage()): Game {
  const { ctx } = makeCtx();
  const game = new Game(ctx, new Map(), storage);
  game.handleCharSelectInput('Enter');
  return game;
}
```

Then append a new describe block at the end of the file:

```ts
describe('Game autosave', () => {
  it('saves the run after a turn', () => {
    const storage = createMemoryStorage();
    const game = startGame(storage);

    game.tick({ type: 'wait' });

    expect(getSaveSummary(storage)).toEqual({ name: 'Human Warrior', depth: 1, turn: 1 });
  });

  it('clears the save when the hero dies', () => {
    const storage = createMemoryStorage();
    const game = startGame(storage);
    game.tick({ type: 'wait' });
    game.state.player.stats!.hp = 0;

    game.tick({ type: 'wait' });

    expect(game.state.gameOver).toBe(true);
    expect(getSaveSummary(storage)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game.test.ts`
Expected: the two new tests FAIL (`expected null to deeply equal {...}` and the death test passes only if no save was written; with no hooks the first fails and the second passes trivially). All earlier game tests still pass because the extra constructor argument is ignored by the current signature.

- [ ] **Step 3: Add storage and the hooks**

In `src/game.ts`, add the import after the scoring import:

```ts
import { clearRun, defaultStorage, RunStorage, saveRun } from './systems/persistence';
```

Change the fields and constructor:

```ts
export class Game {
  state!: GameState;
  ctx: CanvasRenderingContext2D;
  sprites: SpriteMap;
  storage: RunStorage;
  charSelectIndex = 0;
  shareStatus = '';

  constructor(ctx: CanvasRenderingContext2D, sprites: SpriteMap, storage: RunStorage = defaultStorage()) {
    this.ctx = ctx;
    this.sprites = sprites;
    this.storage = storage;
    this.showCharSelect();
  }
```

In `startGameWithCharacter`, add as the first line of the method body:

```ts
    clearRun(this.storage);
```

In `endTurn`, replace the block from the death check to the end of the method with:

```ts
    const died = this.state.player.stats!.hp <= 0 && !this.state.gameOver;
    if (died) {
      this.state.gameOver = true;
      this.state.uiMode = 'gameover';
      this.state.highScores = saveHighScore(this.state.score);
    }

    if (this.state.messages.length > 50) {
      this.state.messages = this.state.messages.slice(-50);
    }

    if (died) {
      clearRun(this.storage);
    } else {
      saveRun(this.state, this.storage);
    }

    this.draw();
```

In `tryDescend`, after `computeFOV(this.state);` and before `this.draw();`, add:

```ts
    saveRun(this.state, this.storage);
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 91 tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/game.ts tests/game.test.ts
git commit -m "Autosave the run each turn and clear it on death or new game" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Resume flow and Continue banner

**Files:**
- Modify: `src/game.ts`
- Modify: `src/render/hud.ts`
- Test: `tests/game.test.ts`

**Interfaces:**
- Consumes: `loadRun`, `getSaveSummary`, `SaveSummary` (Task 1); `setNextEntityId` (Task 1).
- Produces: `Game.resumeRun(): boolean`, `Game.resumeSummary: SaveSummary | null`, `Game.confirmAbandon: boolean`; `drawCharSelect(ctx, selectedIndex, sprites, resume?, confirmAbandon?)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/game.test.ts`:

```ts
import { createEntity } from '../src/ecs/entity';

describe('Game resume', () => {
  function storageWithSave(): RunStorage {
    const storage = createMemoryStorage();
    const game = startGame(storage);
    game.tick({ type: 'wait' });
    game.tick({ type: 'wait' });
    return storage;
  }

  it('offers to continue when a save exists', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();

    const game = new Game(ctx, new Map(), storage);

    expect(game.state.uiMode).toBe('charselect');
    expect(game.resumeSummary).toEqual({ name: 'Human Warrior', depth: 1, turn: 2 });
  });

  it('restores the saved run when C is pressed', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('c');

    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(2);
    expect(game.state.player.appearance!.name).toBe('Human Warrior');
    expect(game.state.player).toBe(game.state.entities.find((e) => e.player));
    expect(game.state.messages.at(-1)).toContain('Welcome back');
  });

  it('asks for confirmation before a new game erases the save', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('Enter');

    expect(game.confirmAbandon).toBe(true);
    expect(game.state.uiMode).toBe('charselect');
    expect(getSaveSummary(storage)).not.toBeNull();
  });

  it('starts a new run and erases the save on the second Enter', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('Enter');
    game.handleCharSelectInput('Enter');

    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(0);
    expect(getSaveSummary(storage)).toBeNull();
  });

  it('cancels the confirmation when another key is pressed', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);

    game.handleCharSelectInput('Enter');
    game.handleCharSelectInput('ArrowRight');

    expect(game.confirmAbandon).toBe(false);
  });

  it('numbers new entities above every saved id after resuming', () => {
    const storage = storageWithSave();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);
    game.handleCharSelectInput('c');
    const maxSaved = Math.max(...game.state.entities.map((e) => e.id));

    const fresh = createEntity();

    expect(fresh.id).toBeGreaterThan(maxSaved);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game.test.ts`
Expected: the six new tests FAIL. The first fails on `resumeSummary` being undefined; the C test fails because `uiMode` stays `'charselect'`; the confirm tests fail because Enter starts a game immediately; the id test fails because `showCharSelect` reset the counter to 1.

- [ ] **Step 3: Implement the resume flow in `src/game.ts`**

Update the persistence import to:

```ts
import {
  clearRun,
  defaultStorage,
  getSaveSummary,
  loadRun,
  RunStorage,
  saveRun,
  SaveSummary,
} from './systems/persistence';
```

Update the entity import to:

```ts
import { createEntity, resetEntityIds, setNextEntityId } from './ecs/entity';
```

Add two fields after `shareStatus = '';`:

```ts
  resumeSummary: SaveSummary | null = null;
  confirmAbandon = false;
```

In `showCharSelect`, replace the first line `this.charSelectIndex = 0;` with:

```ts
    this.charSelectIndex = 0;
    this.resumeSummary = getSaveSummary(this.storage);
    this.confirmAbandon = false;
```

Replace `handleCharSelectInput` entirely:

```ts
  handleCharSelectInput(key: string): void {
    const cols = 5;
    const total = CHARACTERS.length;

    if ((key === 'c' || key === 'C') && this.resumeSummary) {
      this.resumeRun();
      return;
    }

    if (key === 'Enter') {
      // A saved run is erased by a new game, so ask once before doing it.
      if (this.resumeSummary && !this.confirmAbandon) {
        this.confirmAbandon = true;
        this.drawCharSelectScreen();
        return;
      }
      this.startGameWithCharacter(CHARACTERS[this.charSelectIndex]);
      return;
    }

    this.confirmAbandon = false;

    switch (key) {
      case 'ArrowRight':
      case 'd':
        this.charSelectIndex = (this.charSelectIndex + 1) % total;
        break;
      case 'ArrowLeft':
      case 'a':
        this.charSelectIndex = (this.charSelectIndex - 1 + total) % total;
        break;
      case 'ArrowDown':
      case 's':
        this.charSelectIndex = Math.min(this.charSelectIndex + cols, total - 1);
        break;
      case 'ArrowUp':
      case 'w':
        this.charSelectIndex = Math.max(this.charSelectIndex - cols, 0);
        break;
    }
    this.drawCharSelectScreen();
  }

  /** Loads the saved run. Returns false if there is none. */
  resumeRun(): boolean {
    const state = loadRun(this.storage);
    if (!state) return false;

    this.state = state;
    this.state.highScores = loadHighScores();
    setNextEntityId(maxEntityId(state) + 1);

    const name = state.player.appearance?.name ?? 'Adventurer';
    this.state.messages.push(`Welcome back, ${name}. Depth ${state.depth}, turn ${state.turn}.`);
    computeFOV(this.state);
    this.draw();
    return true;
  }
```

Replace `drawCharSelectScreen`:

```ts
  private drawCharSelectScreen(): void {
    drawCharSelect(this.ctx, this.charSelectIndex, this.sprites, this.resumeSummary, this.confirmAbandon);
  }
```

Add a module-level helper at the bottom of `src/game.ts`, after the class:

```ts
/** Highest entity id anywhere in the state, including carried and equipped items. */
function maxEntityId(state: GameState): number {
  let max = 0;
  for (const entity of state.entities) {
    max = Math.max(max, entity.id);
  }
  for (const item of state.player.inventory?.items ?? []) {
    max = Math.max(max, item.id);
  }
  for (const item of Object.values(state.player.equipment ?? {})) {
    if (item) max = Math.max(max, item.id);
  }
  return max;
}
```

- [ ] **Step 4: Draw the banner in `src/render/hud.ts`**

Add the import:

```ts
import { SaveSummary } from '../systems/persistence';
```

Change the `drawCharSelect` signature:

```ts
export function drawCharSelect(
  ctx: CanvasRenderingContext2D,
  selectedIndex: number,
  sprites: SpriteMap,
  resume: SaveSummary | null = null,
  confirmAbandon = false
): void {
```

At the very end of `drawCharSelect`, after the controls line, add:

```ts
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
  }
```

- [ ] **Step 5: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 97 tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/game.ts src/render/hud.ts tests/game.test.ts
git commit -m "Resume a saved run from character select with an erase confirmation" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Documentation and browser verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README**

In the Features list, after the Permadeath bullet, add:

```markdown
- **Save & resume** — Your run autosaves every turn; press C on the hero screen to pick up where you left off
```

In the Controls table, after the `Q` row, add:

```markdown
| C | Continue saved run (hero screen) |
```

In the Tips list, add:

```markdown
- The game saves after every turn, so closing the tab is safe. Dying clears the save, and starting a new hero asks once before erasing it
```

- [ ] **Step 2: Run tests, type check, and build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 97 tests pass, clean.

- [ ] **Step 3: Verify in the browser**

Start the dev server (`.claude/launch.json` config `dev`). Start a run, take a few steps, then reload the page: the hero screen shows the cyan Continue banner with the hero, depth, and turn. Press Enter: the banner turns red. Press ArrowRight: it turns cyan again. Press C: the game resumes with the "Welcome back" message and the same turn count. Check the console for errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document save and resume" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Record shape, storage abstraction, all four functions → Task 1. Entity id setter → Task 1; reset on load → Task 3. Autosave after turn, on descent; clear on death and new game → Task 2. Resume, confirm flow, banner → Task 3. README → Task 4. Spec tests 1–7 → Task 1 (8 tests written, one extra for `clearRun`); 8–9 → Task 2; 10–12 → Task 3 (6 tests, adding the cancel case and separating the two Enter cases).

**Placeholders.** None.

**Type consistency.** `RunStorage`, `SaveSummary`, `createMemoryStorage`, `getSaveSummary`, `loadRun`, `saveRun`, `clearRun`, `defaultStorage` named identically across Tasks 1–3. `setNextEntityId` defined in Task 1, used in Task 3. `drawCharSelect` gains `resume` and `confirmAbandon` in Task 3 and `drawCharSelectScreen` passes exactly those. `startGame(storage)` helper in Task 2 is reused in Task 3.
