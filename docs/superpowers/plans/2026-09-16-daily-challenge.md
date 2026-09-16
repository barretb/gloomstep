# Daily Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every run is reproducible from a seed carried in the game state, and a daily challenge mode derives seed and hero from the UTC date with one recorded attempt per day.

**Architecture:** `src/systems/rng.ts` provides a mulberry32 step, a string hash, and `rngFor(state)`. All random call sites draw from the run's generator. `src/systems/daily.ts` derives date, seed, hero, and stores results. `Game` gains injectable clock and seed source, a `startRun` entry point, a daily toggle on the hero screen, and daily labelling at the end.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-daily-challenge-design.md`

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` clean (`noUnusedLocals`, `noUnusedParameters`).
- Tests in `tests/`, `npx vitest run`; run with the exit code checked (`npx vitest run > log; code=$?`).
- Two-space indent, single quotes, semicolons. No new dependencies.
- After Task 1, `grep -rn "Math.random" src/` must match only `src/systems/rng.ts`.
- Save version stays 1; older saves normalise to `mode 'normal'` with a fresh seed.
- Commit per task with trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/systems/rng.ts` (create) | `hashString`, `stepRng`, `rngFor`, `makeRng`, `randomSeed` |
| `src/types.ts` (modify) | `seed`, `rngState`, `mode`, `dailyDate` on `GameState` |
| `src/dungeon/generator.ts`, `src/dungeon/populate.ts`, `src/data/monsters.ts`, `src/systems/ai.ts`, `src/systems/combat.ts` (modify) | Draw from the run's generator |
| `src/systems/persistence.ts` (modify) | Normalise old saves |
| `src/systems/daily.ts` (create) | Date, seed, hero, result storage |
| `src/game.ts` (modify) | Options, `startRun`, daily toggle/lock/gate, record result, share text |
| `src/render/hud.ts`, `src/ui/hit-regions.ts` (modify) | Daily toggle button, banners, end-screen line |
| `tests/helpers.ts` (modify) | `makeState` seeds; `startGame` helpers take options |
| `tests/rng.test.ts`, `tests/determinism.test.ts`, `tests/daily.test.ts` (create) | Tests |
| `tests/movement.test.ts`, `tests/ai.test.ts`, `tests/abilities.test.ts` (modify) | Range assertions instead of `Math.random` spies |
| `README.md` (modify) | Docs |

---

### Task 1: Seeded random source threaded through the systems

**Files:**
- Create: `src/systems/rng.ts`
- Modify: `src/types.ts`, `src/dungeon/generator.ts`, `src/dungeon/populate.ts`, `src/data/monsters.ts`, `src/systems/ai.ts`, `src/systems/combat.ts`, `src/systems/persistence.ts`, `src/game.ts`, `tests/helpers.ts`, `tests/movement.test.ts`, `tests/ai.test.ts`, `tests/abilities.test.ts`
- Test: `tests/rng.test.ts`, `tests/determinism.test.ts`

**Interfaces:**
- Produces: `hashString(s): number`, `stepRng(state): { state; value }`, `rngFor(state): () => number`, `makeRng(seed): () => number`, `randomSeed(): number`; `GameState.seed/rngState/mode/dailyDate`; `generateDungeon(depth, rng)`; `getMonsterTemplate(depth, rng?)`, `getEscortTemplate(rng?)`; `Game.startRun(template, seed, mode, dailyDate?)`; `new Game(ctx, sprites, storage?, { now?, seedSource? })`.

- [ ] **Step 1: Write the failing tests**

Create `tests/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashString, makeRng, rngFor, stepRng } from '../src/systems/rng';
import { makePlayer, makeState } from './helpers';

describe('makeRng', () => {
  it('reproduces the same sequence from the same seed', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());

    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('diverges for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);

    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
  });
});

describe('stepRng', () => {
  it('is a pure function of its input state', () => {
    expect(stepRng(99)).toEqual(stepRng(99));
    expect(stepRng(99).state).not.toBe(99);
  });
});

describe('hashString', () => {
  it('is stable and differs between dates', () => {
    expect(hashString('gloomstep-daily-2026-09-16')).toBe(hashString('gloomstep-daily-2026-09-16'));
    expect(hashString('gloomstep-daily-2026-09-16')).not.toBe(hashString('gloomstep-daily-2026-09-17'));
    expect(Number.isInteger(hashString('x'))).toBe(true);
  });
});

describe('rngFor', () => {
  it('advances the state it is bound to', () => {
    const state = makeState(makePlayer(1, 1));
    state.rngState = 7;
    const rng = rngFor(state);

    const first = rng();
    expect(state.rngState).not.toBe(7);
    const second = rng();

    expect(first).not.toBe(second);
    expect(makeRng(7)()).toBe(first);
  });
});
```

Create `tests/determinism.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../src/dungeon/generator';
import { makeRng } from '../src/systems/rng';
import { Game } from '../src/game';
import { CHARACTERS } from '../src/data/characters';
import { createMemoryStorage, loadRun, saveRun } from '../src/systems/persistence';
import { Action } from '../src/types';
import { makeCtx } from './helpers';

const SCRIPT: Action[] = [
  { type: 'move', dx: 1, dy: 0 },
  { type: 'move', dx: 1, dy: 0 },
  { type: 'wait' },
  { type: 'move', dx: 0, dy: 1 },
  { type: 'pickup' },
  { type: 'move', dx: -1, dy: 0 },
  { type: 'wait' },
  { type: 'move', dx: 0, dy: -1 },
  { type: 'ability' },
  { type: 'wait' },
];

function seededGame(seed: number): Game {
  const { ctx } = makeCtx();
  const game = new Game(ctx, new Map(), createMemoryStorage(), { seedSource: () => seed });
  game.startRun(CHARACTERS[0], seed, 'normal');
  return game;
}

describe('generateDungeon', () => {
  it('is identical for the same seed and different for another', () => {
    const a = generateDungeon(3, makeRng(42));
    const b = generateDungeon(3, makeRng(42));
    const c = generateDungeon(3, makeRng(43));

    expect(a.dungeon.tiles).toEqual(b.dungeon.tiles);
    expect(a.rooms).toEqual(b.rooms);
    expect(a.dungeon.tiles).not.toEqual(c.dungeon.tiles);
  });
});

describe('whole runs', () => {
  it('match exactly when started from the same seed and given the same actions', () => {
    const a = seededGame(777);
    const b = seededGame(777);

    for (const action of SCRIPT) {
      a.tick(action);
      b.tick(action);
    }

    expect(a.state.dungeon.tiles).toEqual(b.state.dungeon.tiles);
    expect(a.state.entities).toEqual(b.state.entities);
    expect(a.state.player.stats).toEqual(b.state.player.stats);
    expect(a.state.rngState).toBe(b.state.rngState);
    expect(a.state.messages).toEqual(b.state.messages);
  });

  it('continue identically after a save and reload', () => {
    const live = seededGame(31337);
    const storage = createMemoryStorage();
    for (const action of SCRIPT.slice(0, 5)) live.tick(action);
    saveRun(live.state, storage);
    const { ctx } = makeCtx();
    const resumed = new Game(ctx, new Map(), storage, { seedSource: () => 0 });
    resumed.handleCharSelectInput('c');
    expect(loadRun(storage)).not.toBeNull();

    for (const action of SCRIPT.slice(5)) {
      live.tick(action);
      resumed.tick(action);
    }

    expect(resumed.state.entities).toEqual(live.state.entities);
    expect(resumed.state.rngState).toBe(live.state.rngState);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/rng.test.ts tests/determinism.test.ts`
Expected: FAIL with `Cannot find module '../src/systems/rng'` and, in the determinism file, type/argument errors around `startRun` and the options object.

- [ ] **Step 3: Create `src/systems/rng.ts`**

```ts
import { GameState } from '../types';

/** Stable 32-bit FNV-1a hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One mulberry32 step. Pure: the same state always yields the same result. */
export function stepRng(state: number): { state: number; value: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: next, value };
}

/** A draw function bound to a game state; every call advances `state.rngState`. */
export function rngFor(state: GameState): () => number {
  return () => {
    const step = stepRng(state.rngState);
    state.rngState = step.state;
    return step.value;
  };
}

/** A draw function over private state, for code that has no GameState. */
export function makeRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    const step = stepRng(state);
    state = step.state;
    return step.value;
  };
}

/** A fresh 32-bit seed. The only place game logic touches Math.random. */
export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
```

- [ ] **Step 4: State fields**

In `src/types.ts`, add to `GameState` after `won: boolean;`:

```ts
  /** Seed the run started from; reproduces the run given the same actions. */
  seed: number;
  /** Current generator state; advances on every draw. */
  rngState: number;
  mode: 'normal' | 'daily';
  /** YYYY-MM-DD (UTC) for daily runs. */
  dailyDate?: string;
```

In `tests/helpers.ts`, in `makeState`, add after `won: false,`:

```ts
    seed: 1,
    rngState: 1,
    mode: 'normal',
```

- [ ] **Step 5: Generator draws from a passed generator**

In `src/dungeon/generator.ts`:

- Change `function rand(min: number, max: number): number { return Math.floor(Math.random() * ...` to take the generator: `function rand(rng: () => number, min: number, max: number): number { return Math.floor(rng() * (max - min + 1)) + min; }`
- `splitNode(node, minSize)` → `splitNode(node: BSPNode, minSize: number, rng: () => number)`: replace `Math.random() < 0.5` with `rng() < 0.5`, both `rand(minSize, ...)` calls with `rand(rng, minSize, ...)`, and the two recursive calls with `splitNode(node.left, minSize, rng)` / `splitNode(node.right, minSize, rng)`.
- `createRooms(node, rooms)` → `createRooms(node: BSPNode, rooms: Room[], rng: () => number)`: the two recursive calls pass `rng`; the four `rand(...)` calls become `rand(rng, ...)`.
- `getRoom(node)` → `getRoom(node: BSPNode, rng: () => number)`: recursive calls pass `rng`; `Math.random() < 0.5` → `rng() < 0.5`.
- `carveCorridor(tiles, x1, y1, x2, y2)` → add a trailing `rng: () => number` parameter; `Math.random() < 0.5` → `rng() < 0.5`.
- `connectRooms(node, tiles)` → `connectRooms(node: BSPNode, tiles: Tile[][], rng: () => number)`: recursive calls, both `getRoom` calls, and `carveCorridor(..., rng)` pass it.
- `export function generateDungeon(depth: number): {...}` → `export function generateDungeon(depth: number, rng: () => number): {...}`; calls become `splitNode(root, minPartitionSize, rng)`, `createRooms(root, rooms, rng)`, `connectRooms(root, tiles, rng)`.

- [ ] **Step 6: Pickers accept a generator**

In `src/data/monsters.ts`:

```ts
export function getMonsterTemplate(depth: number, rng: () => number = Math.random): MonsterTemplate {
  const available = MONSTERS.filter((m) => m.minDepth <= depth);
  // Weight toward harder monsters at deeper levels
  const weighted = available.flatMap((m) => Array(depthWeight(depth, m.minDepth)).fill(m));
  return weighted[Math.floor(rng() * weighted.length)];
}
```

and

```ts
export function getEscortTemplate(rng: () => number = Math.random): MonsterTemplate {
  const deep = MONSTERS.filter((m) => m.minDepth >= 8);
  return deep[Math.floor(rng() * deep.length)];
}
```

- [ ] **Step 7: Population, AI, combat draw from the state**

`src/dungeon/populate.ts`: add `import { rngFor } from '../systems/rng';`. Change `rand` to `function rand(rng: () => number, min: number, max: number): number { return Math.floor(rng() * (max - min + 1)) + min; }`. `randomFloorInRoom(state, room)`: `const rng = rngFor(state);` as its first line and `rand(rng, ...)` for both calls. In `populateDungeon`, add `const rng = rngFor(state);` after `const depth = state.depth;`; replace every `rand(0, spawnRooms.length - 1)` with `rand(rng, 0, spawnRooms.length - 1)`, `rand(depth * 3, depth * 12)` with `rand(rng, depth * 3, depth * 12)`, `getMonsterTemplate(depth)` with `getMonsterTemplate(depth, rng)`, `getRandomItem(depth)` with `getRandomItem(depth, rng)`. In `spawnBoss`, add `const rng = rngFor(state);` and use `getEscortTemplate(rng)`.

`src/systems/ai.ts`: add `import { rngFor } from './rng';`. In `runAI`, add `const rng = rngFor(state);` after `const playerPos = ...;` and change `if (Math.random() < 0.5) { wander(state, entity); }` to `if (rng() < 0.5) { wander(state, entity, rng); }`. Change `function wander(state: GameState, entity: Entity)` to `function wander(state: GameState, entity: Entity, rng: () => number)` and `dirs[Math.floor(Math.random() * dirs.length)]` to `dirs[Math.floor(rng() * dirs.length)]`.

`src/systems/combat.ts`: add `import { rngFor } from './rng';`. In `resolveCombat`: `const damage = computeDamage(getAttackPower(attacker), getDefensePower(defender), rngFor(state));`. In `killEntity`, replace the gold drop block with:

```ts
  // Chance to drop treasure
  const rng = rngFor(state);
  if (victim.position && victim.xpValue && rng() < 0.4) {
    const value = Math.max(1, Math.ceil(victim.xpValue / 3) + Math.floor((rng() * victim.xpValue) / 3));
```

(the rest of the block is unchanged).

- [ ] **Step 8: Game options and `startRun`**

In `src/game.ts`, add imports:

```ts
import { makeRng, randomSeed, rngFor } from './systems/rng';
```

Add an options type above the class:

```ts
export interface GameOptions {
  /** Clock, injectable for tests. */
  now?: () => Date;
  /** Seed for free-play runs, injectable for tests. */
  seedSource?: () => number;
}
```

Replace the constructor and add fields:

```ts
  now: () => Date;
  seedSource: () => number;

  constructor(
    ctx: CanvasRenderingContext2D,
    sprites: SpriteMap,
    storage: RunStorage = defaultStorage(),
    options: GameOptions = {}
  ) {
    this.ctx = ctx;
    this.sprites = sprites;
    this.storage = storage;
    this.now = options.now ?? (() => new Date());
    this.seedSource = options.seedSource ?? randomSeed;
    this.showCharSelect();
  }
```

In `showCharSelect`, change `const { dungeon, rooms } = generateDungeon(1);` to `const { dungeon, rooms } = generateDungeon(1, makeRng(1));` and add to its state literal after `won: false,`: `seed: 1, rngState: 1, mode: 'normal',`.

Rename `startGameWithCharacter(template)` to a public `startRun` and thread the seed:

```ts
  /** Starts a fresh run from `seed`. Public so tests can start identical runs. */
  startRun(template: CharacterTemplate, seed: number, mode: 'normal' | 'daily', dailyDate?: string): void {
    clearRun(this.storage);
    resetEntityIds();
    const depth = 1;

    // Build the state first so the run's generator drives generation and population.
    const player = createEntity({ ... unchanged player literal ... });

    this.state = {
      dungeon: { width: 0, height: 0, tiles: [], visible: [], explored: [] },
      entities: [player],
      player,
      depth,
      score: 0,
      treasureCollected: 0,
      turn: 0,
      gameOver: false,
      won: false,
      seed,
      rngState: seed,
      mode,
      dailyDate,
      messages: [`${template.name} enters the dungeon...`],
      uiMode: 'game',
      highScores: loadHighScores(),
    };

    const { dungeon, rooms } = generateDungeon(depth, rngFor(this.state));
    this.state.dungeon = dungeon;
    const firstRoom = rooms[0];
    player.position = {
      x: Math.floor(firstRoom.x + firstRoom.w / 2),
      y: Math.floor(firstRoom.y + firstRoom.h / 2),
    };

    populateDungeon(this.state, rooms);
    computeFOV(this.state);
    this.draw();
  }
```

(The player literal keeps every field it has today; its `position` is set after generation, so give it `position: { x: 0, y: 0 }` in the literal.) Update the Enter branch of `handleCharSelectInput` to `this.startRun(CHARACTERS[this.charSelectIndex], this.seedSource(), 'normal');`.

In `tryDescend`, change `generateDungeon(this.state.depth)` to `generateDungeon(this.state.depth, rngFor(this.state))`.

- [ ] **Step 9: Persistence normalises old saves**

In `src/systems/persistence.ts`, add `import { randomSeed } from './rng';` and in `loadRun` after `state.won = state.won ?? false;`:

```ts
  state.mode = state.mode ?? 'normal';
  if (typeof state.seed !== 'number' || typeof state.rngState !== 'number') {
    state.seed = randomSeed();
    state.rngState = state.seed;
  }
```

- [ ] **Step 10: Existing tests stop pinning Math.random**

In `tests/movement.test.ts` and `tests/ai.test.ts`: remove the `beforeEach`/`afterEach` blocks that spy on `Math.random`, drop `afterEach, beforeEach, vi` from the vitest import, and change exact damage assertions to ranges. Attack 3 into defense 0 rolls 80–120% of 3, i.e. 2, 3, or 4:

- movement `lets a monster attack the player`: `expect(player.stats!.hp).toBeGreaterThanOrEqual(16); expect(player.stats!.hp).toBeLessThanOrEqual(18);`
- movement `lets the player attack a monster`: monster hp between 1 and 3.
- ai `lets an adjacent chase monster attack a visible player`: player hp between 16 and 18.

In `tests/abilities.test.ts`: remove the spy blocks and the `vi`/hooks import; in the Cleave test assert `left` and `diagonal` hp are each between 1 and 3 and `far` is 5.

- [ ] **Step 11: Run tests, type check, and the Math.random audit**

Run: `npx vitest run > log 2>&1; code=$?; grep -E "Tests |FAIL" log; echo $code; npx tsc --noEmit; grep -rn "Math.random" src/`
Expected: 197 tests pass (184 + 5 + 3 new, plus the reworked ones), no type errors, and the grep lists only `src/systems/rng.ts`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Seeded random source carried in game state and threaded through all systems" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Daily rules module

**Files:**
- Create: `src/systems/daily.ts`
- Test: `tests/daily.test.ts`

**Interfaces:**
- Produces: `DAILY_KEY`, `DailyResult`, `dailyDate(now)`, `dailySeed(date)`, `dailyHeroIndex(date)`, `loadDailyResults(storage?)`, `getDailyResult(date, storage?)`, `recordDailyResult(result, storage?)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/daily.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  dailyDate,
  dailyHeroIndex,
  dailySeed,
  getDailyResult,
  recordDailyResult,
} from '../src/systems/daily';
import { hashString } from '../src/systems/rng';
import { CHARACTERS } from '../src/data/characters';
import { createMemoryStorage } from '../src/systems/persistence';

describe('dailyDate', () => {
  it('uses the UTC calendar day', () => {
    expect(dailyDate(new Date('2026-09-16T23:59:59Z'))).toBe('2026-09-16');
    expect(dailyDate(new Date('2026-09-17T00:00:00Z'))).toBe('2026-09-17');
  });
});

describe('dailySeed and dailyHeroIndex', () => {
  it('derives the seed from the date', () => {
    expect(dailySeed('2026-09-16')).toBe(hashString('gloomstep-daily-2026-09-16'));
    expect(dailySeed('2026-09-16')).not.toBe(dailySeed('2026-09-17'));
  });

  it('picks a valid hero deterministically', () => {
    const index = dailyHeroIndex('2026-09-16');

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(CHARACTERS.length);
    expect(dailyHeroIndex('2026-09-16')).toBe(index);
  });
});

describe('daily results', () => {
  it('round-trips a recorded result', () => {
    const storage = createMemoryStorage();
    const result = { date: '2026-09-16', score: 420, won: false, depth: 4, turn: 300 };

    recordDailyResult(result, storage);

    expect(getDailyResult('2026-09-16', storage)).toEqual(result);
    expect(getDailyResult('2026-09-17', storage)).toBeNull();
  });

  it('keeps the higher score when a result already exists', () => {
    const storage = createMemoryStorage();
    recordDailyResult({ date: '2026-09-16', score: 500, won: true, depth: 10, turn: 900 }, storage);

    recordDailyResult({ date: '2026-09-16', score: 100, won: false, depth: 2, turn: 50 }, storage);

    expect(getDailyResult('2026-09-16', storage)!.score).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/daily.test.ts`
Expected: FAIL with `Cannot find module '../src/systems/daily'`.

- [ ] **Step 3: Create `src/systems/daily.ts`**

```ts
import { CHARACTERS } from '../data/characters';
import { defaultStorage, RunStorage } from './persistence';
import { hashString, makeRng } from './rng';

export const DAILY_KEY = 'gloomstep-dungeon-daily';

export interface DailyResult {
  date: string;
  score: number;
  won: boolean;
  depth: number;
  turn: number;
}

/** The daily's calendar day, in UTC, as YYYY-MM-DD. */
export function dailyDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dailySeed(date: string): number {
  return hashString(`gloomstep-daily-${date}`);
}

/** Everyone gets the same hero on a given day. Drawn from a private generator so the dungeon sequence is untouched. */
export function dailyHeroIndex(date: string): number {
  return Math.floor(makeRng(dailySeed(date))() * CHARACTERS.length);
}

export function loadDailyResults(storage: RunStorage = defaultStorage()): Record<string, DailyResult> {
  try {
    const raw = storage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, DailyResult>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function getDailyResult(date: string, storage: RunStorage = defaultStorage()): DailyResult | null {
  return loadDailyResults(storage)[date] ?? null;
}

/** Records a finished daily. If one exists for the date, the higher score stays. */
export function recordDailyResult(result: DailyResult, storage: RunStorage = defaultStorage()): void {
  const all = loadDailyResults(storage);
  const existing = all[result.date];
  if (!existing || result.score > existing.score) {
    all[result.date] = result;
  }
  try {
    storage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run` (exit-checked) and `npx tsc --noEmit`
Expected: 202 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/daily.ts tests/daily.test.ts
git commit -m "Add daily challenge date, seed, hero, and result storage" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Daily mode in the game and on screen

**Files:**
- Modify: `src/game.ts`, `src/render/hud.ts`, `src/ui/hit-regions.ts`
- Test: `tests/daily.test.ts`

**Interfaces:**
- Consumes: Task 1 and Task 2 exports.
- Produces: `Game.dailyMode`, `Game.todaysDate`, `Game.todaysResult`, `Game.shareText()`; `drawCharSelect(..., daily)`; `TapAction 'toggleDaily'`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/daily.test.ts`:

```ts
import { Game } from '../src/game';
import { drawCharSelect, drawGameOver } from '../src/render/hud';
import { makeCtx, makePlayer, makeState } from './helpers';

const DAY = () => new Date('2026-09-16T12:00:00Z');
const NEXT_DAY = () => new Date('2026-09-17T12:00:00Z');

function heroScreen(storage = createMemoryStorage(), now = DAY) {
  const { ctx, calls } = makeCtx();
  const game = new Game(ctx, new Map(), storage, { now, seedSource: () => 5 });
  return { game, calls, storage };
}

describe('daily mode on the hero screen', () => {
  it('locks the hero to the day and starts a seeded daily run', () => {
    const { game } = heroScreen();
    const heroIndex = dailyHeroIndex('2026-09-16');

    game.handleCharSelectInput('d');
    expect(game.dailyMode).toBe(true);
    expect(game.charSelectIndex).toBe(heroIndex);

    game.handleCharSelectInput('ArrowRight');
    expect(game.charSelectIndex).toBe(heroIndex);

    game.handleCharSelectInput('Enter');
    expect(game.state.uiMode).toBe('game');
    expect(game.state.mode).toBe('daily');
    expect(game.state.seed).toBe(dailySeed('2026-09-16'));
    expect(game.state.dailyDate).toBe('2026-09-16');
    expect(game.state.player.appearance!.name).toBe(CHARACTERS[heroIndex].name);
  });

  it('records the result and allows only one attempt per day', () => {
    const { game, storage } = heroScreen();
    game.handleCharSelectInput('d');
    game.handleCharSelectInput('Enter');
    game.tick({ type: 'wait' });
    game.state.player.stats!.hp = 0;
    game.tick({ type: 'wait' });
    expect(game.state.gameOver).toBe(true);
    expect(getDailyResult('2026-09-16', storage)).toMatchObject({ date: '2026-09-16', won: false });

    const again = heroScreen(storage).game;
    again.handleCharSelectInput('d');
    expect(again.todaysResult).not.toBeNull();
    again.handleCharSelectInput('Enter');
    expect(again.state.uiMode).toBe('charselect');

    const tomorrow = heroScreen(storage, NEXT_DAY).game;
    tomorrow.handleCharSelectInput('d');
    tomorrow.handleCharSelectInput('Enter');
    expect(tomorrow.state.uiMode).toBe('game');
    expect(tomorrow.state.dailyDate).toBe('2026-09-17');
  });

  it('draws a daily toggle region and a locked banner', () => {
    const { ctx, calls } = makeCtx();

    const regions = drawCharSelect(ctx, 3, new Map(), null, false, {
      on: true,
      date: '2026-09-16',
      heroIndex: 3,
      result: null,
    });

    expect(regions.filter((r) => r.action.type === 'toggleDaily')).toHaveLength(1);
    const texts = calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
    expect(texts.some((t) => t.startsWith('DAILY CHALLENGE 2026-09-16'))).toBe(true);
  });
});

describe('daily labelling at the end', () => {
  it('names the daily on the end screen and in the share text', () => {
    const state = makeState(makePlayer(1, 1));
    state.mode = 'daily';
    state.dailyDate = '2026-09-16';
    const { ctx, calls } = makeCtx();

    drawGameOver(ctx, state);

    expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toContain('DAILY CHALLENGE 2026-09-16');

    const { game } = heroScreen();
    game.handleCharSelectInput('d');
    game.handleCharSelectInput('Enter');
    expect(game.shareText().split('\n')[0]).toContain('Daily 2026-09-16');
    expect(game.shareText()).toContain('#GloomstepDaily');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/daily.test.ts`
Expected: the four new tests FAIL (`dailyMode` undefined, `drawCharSelect` ignores the sixth argument, `shareText` not a function, no daily line drawn).

- [ ] **Step 3: Tap action**

In `src/ui/hit-regions.ts`, add to `TapAction`: `| { type: 'toggleDaily' }`.

- [ ] **Step 4: Game daily mode**

In `src/game.ts`, add imports:

```ts
import { dailyDate, dailyHeroIndex, dailySeed, DailyResult, getDailyResult, recordDailyResult } from './systems/daily';
```

Add fields after `logScroll = 0;`:

```ts
  dailyMode = false;
  todaysDate = '';
  todaysResult: DailyResult | null = null;
```

In `showCharSelect`, after `this.confirmAbandon = false;`:

```ts
    this.dailyMode = false;
    this.todaysDate = dailyDate(this.now());
    this.todaysResult = getDailyResult(this.todaysDate, this.storage);
```

Replace `handleCharSelectInput` with:

```ts
  handleCharSelectInput(key: string): void {
    const cols = 5;
    const total = CHARACTERS.length;

    if ((key === 'c' || key === 'C') && this.resumeSummary) {
      this.resumeRun();
      return;
    }

    if (key === 'd' || key === 'D') {
      this.dailyMode = !this.dailyMode;
      this.confirmAbandon = false;
      if (this.dailyMode) {
        this.charSelectIndex = dailyHeroIndex(this.todaysDate);
      }
      this.drawCharSelectScreen();
      return;
    }

    if (key === 'Enter') {
      // Today's daily is done: nothing to start
      if (this.dailyMode && this.todaysResult) {
        this.drawCharSelectScreen();
        return;
      }
      // A saved run is erased by a new game, so ask once before doing it.
      if (this.resumeSummary && !this.confirmAbandon) {
        this.confirmAbandon = true;
        this.drawCharSelectScreen();
        return;
      }
      if (this.dailyMode) {
        const hero = CHARACTERS[dailyHeroIndex(this.todaysDate)];
        this.startRun(hero, dailySeed(this.todaysDate), 'daily', this.todaysDate);
      } else {
        this.startRun(CHARACTERS[this.charSelectIndex], this.seedSource(), 'normal');
      }
      return;
    }

    this.confirmAbandon = false;

    // The daily's hero is fixed; arrows do nothing
    if (this.dailyMode) {
      this.drawCharSelectScreen();
      return;
    }

    switch (key) {
      ... unchanged arrow handling ...
    }
    this.drawCharSelectScreen();
  }
```

In `finishRun`, before `this.state.highScores = saveHighScore(this.state.score);`:

```ts
    if (this.state.mode === 'daily' && this.state.dailyDate) {
      recordDailyResult(
        {
          date: this.state.dailyDate,
          score: this.state.score,
          won: this.state.won,
          depth: this.state.depth,
          turn: this.state.turn,
        },
        this.storage
      );
    }
```

Rename `private getShareText()` to `shareText()` (public) and update its callers (`handleGameOverInput` uses `this.getShareText()` three times → `this.shareText()`). Replace its body's title/challenge/hashtag lines:

```ts
    const daily = s.mode === 'daily' && s.dailyDate ? `Daily ${s.dailyDate}` : null;
    const title = s.won
      ? daily
        ? `\u{1F3C6} Gloomstep ${daily} — CONQUERED \u{1F3C6}`
        : `\u{1F3C6} Gloomstep Dungeon — CONQUERED \u{1F3C6}`
      : daily
        ? `\u{1F4C5} Gloomstep ${daily}`
        : `⚔️ Gloomstep Dungeon ⚔️`;
    const challenge = s.won ? 'I slew the Overlord. Can you?' : 'Can you survive the dungeon?';
    const tags = daily ? '#GloomstepDungeon #GloomstepDaily #roguelike' : '#GloomstepDungeon #roguelike';
```

and use `tags` as the last array element.

In `drawCharSelectScreen`, pass the daily info:

```ts
    this.hitRegions = drawCharSelect(this.ctx, this.charSelectIndex, this.sprites, this.resumeSummary, this.confirmAbandon, {
      on: this.dailyMode,
      date: this.todaysDate,
      heroIndex: dailyHeroIndex(this.todaysDate),
      result: this.todaysResult,
    });
```

In `applyTap`, add:

```ts
      case 'toggleDaily':
        this.handleCharSelectInput('d');
        return;
```

- [ ] **Step 5: Hero screen and end screen drawing**

In `src/render/hud.ts`, add `import { DailyResult } from '../systems/daily';` and `import { CHARACTERS } ...` is already present. Extend the signature:

```ts
export interface DailyPanelInfo {
  on: boolean;
  date: string;
  heroIndex: number;
  result: DailyResult | null;
}

export function drawCharSelect(
  ctx: CanvasRenderingContext2D,
  selectedIndex: number,
  sprites: SpriteMap,
  resume: SaveSummary | null = null,
  confirmAbandon = false,
  daily: DailyPanelInfo | null = null
): HitRegion[] {
```

After the START button block and before the Continue banner, add:

```ts
  // Daily toggle (tap target)
  if (daily) {
    const dailyBtn = L.compact
      ? { x: startX + 8, y: detailY + 68, w: 130, h: 26 }
      : { x: startX + 8, y: detailY + 66, w: 150, h: 26 };
    ctx.strokeStyle = daily.on ? COLORS.stairs : COLORS.textDim;
    ctx.lineWidth = 1;
    ctx.strokeRect(dailyBtn.x, dailyBtn.y, dailyBtn.w, dailyBtn.h);
    ctx.fillStyle = daily.on ? COLORS.stairs : COLORS.textDim;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[D] Daily: ${daily.on ? 'ON' : 'OFF'}`, dailyBtn.x + dailyBtn.w / 2, dailyBtn.y + dailyBtn.h / 2);
    regions.push({ ...dailyBtn, action: { type: 'toggleDaily' } });
  }
```

After the Continue banner block and before `return regions;`, add:

```ts
  // Daily banner
  if (daily?.on) {
    const hero = CHARACTERS[daily.heroIndex];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = L.compact ? 'bold 12px monospace' : 'bold 14px monospace';
    ctx.fillStyle = COLORS.stairs;
    ctx.fillText(`DAILY CHALLENGE ${daily.date} — Hero: ${hero.name}`, cx, detailY + 150);
    ctx.font = L.compact ? '11px monospace' : '12px monospace';
    ctx.fillStyle = COLORS.textDim;
    const second = daily.result
      ? `Already played today: score ${daily.result.score}${daily.result.won ? ' (victory)' : ''}. Come back tomorrow.`
      : 'Same dungeon for everyone. One attempt.';
    ctx.fillText(second, cx, detailY + 168);
  }
```

In `drawGameOver`, after the title block (the `if (state.won) ... else ...`), add:

```ts
  if (state.mode === 'daily' && state.dailyDate) {
    ctx.fillStyle = COLORS.stairs;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`DAILY CHALLENGE ${state.dailyDate}`, cx, cy - 88);
  }
```

- [ ] **Step 6: Run tests and type check**

Run: `npx vitest run` (exit-checked) and `npx tsc --noEmit`
Expected: 206 tests pass, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/game.ts src/render/hud.ts src/ui/hit-regions.ts tests/daily.test.ts
git commit -m "Daily challenge mode: locked hero, seeded run, one attempt, labelled results" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Docs and browser check

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**

Features, after the Save & resume bullet:

```markdown
- **Daily challenge** — Press D on the hero screen: everyone gets the same dungeon and hero for the day, one attempt, result saved locally
```

Controls table, after the `C` row:

```markdown
| D | Toggle daily challenge (hero screen) |
```

Tips:

```markdown
- The daily challenge rolls over at midnight UTC. Its hero and dungeon come from the date, so compare scores with friends by sharing the result
```

- [ ] **Step 2: Run tests, type check, build; audit Math.random**

Run: `npx vitest run` (exit-checked), `npx tsc --noEmit`, `npm run build`, `grep -rn "Math.random" src/`
Expected: 206 pass, clean, grep lists only `src/systems/rng.ts`.

- [ ] **Step 3: Browser check**

Start the dev server. Clear any stale save. Verify through the page: pressing D on the hero screen locks the selection and draws the daily banner; Enter starts a run whose autosave has `mode: 'daily'` and today's `dailyDate`; two fresh loads with the daily started produce identical dungeon tiles (compare the saved `tiles` JSON from two separate starts after clearing the daily record between them); no console errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document the daily challenge" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** rng module, state fields, threading, persistence normalisation, `startRun`, options → Task 1. daily module → Task 2. Toggle/lock/gate, recording, share text, hero-screen and end-screen drawing, tap action → Task 3. README → Task 4. Spec tests 1–6 → Task 1; 7–9 → Task 2; 10–12 → Task 3; 13 (old-save normalisation) is exercised by the determinism reload test only indirectly — add to Task 1's `rng.test.ts`? It is covered in `tests/persistence.test.ts` style; **add** the following to Task 1 Step 1 in `tests/determinism.test.ts`:

```ts
describe('old saves', () => {
  it('load as a normal run with a fresh seed', () => {
    const storage = createMemoryStorage();
    const game = seededGame(9);
    saveRun(game.state, storage);
    const record = JSON.parse(storage.getItem('gloomstep-dungeon-save')!);
    delete record.state.seed;
    delete record.state.rngState;
    delete record.state.mode;
    storage.setItem('gloomstep-dungeon-save', JSON.stringify(record));

    const loaded = loadRun(storage)!;

    expect(loaded.mode).toBe('normal');
    expect(typeof loaded.seed).toBe('number');
    expect(loaded.rngState).toBe(loaded.seed);
  });
});
```

**Placeholders.** Task 1 Step 8 elides the unchanged player literal with a comment; every other step is complete.

**Type consistency.** `rngFor`, `makeRng`, `randomSeed`, `hashString`, `stepRng` from Task 1 used verbatim in Tasks 2–3. `startRun(template, seed, mode, dailyDate?)` in Tasks 1 and 3. `DailyPanelInfo` shape in Task 3 matches the test's object literal. `Game.shareText()` public in Task 3 and used by the test.
