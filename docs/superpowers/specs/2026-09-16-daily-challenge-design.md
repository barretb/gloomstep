# Daily Challenge — Design

**Date:** 2026-09-16
**Status:** Approved in discussion; spec for implementation planning.

## Goal

Every run is driven by one seeded random source carried in the game state, so a seed reproduces a run exactly. A daily challenge mode derives its seed and hero from today's UTC date, so all players face the same run, allows one attempt per day, records the result locally, and labels the end screen and share text with the date.

## Non-goals

- No server, leaderboard, or cross-device sync; the one-attempt rule is honour-system, enforced in the player's own browser.
- No seed entry UI or seed sharing (the groundwork is laid; the UI is a later feature).
- No change to game balance or content.
- No daily-specific modifiers.

## Random source

### `src/systems/rng.ts` (new)

```ts
/** Stable 32-bit hash of a string (FNV-1a). */
export function hashString(s: string): number;
/** One mulberry32 step: returns the next state and a float in [0, 1). */
export function stepRng(state: number): { state: number; value: number };
/** A draw function bound to a game state; each call advances state.rngState. */
export function rngFor(state: GameState): () => number;
/** A draw function over a private state, for code that has no GameState (e.g. tests, hero pick). */
export function makeRng(seed: number): () => number;
/** A fresh 32-bit seed from Math.random — the only remaining use of Math.random in game logic. */
export function randomSeed(): number;
```

mulberry32: `state = (state + 0x6D2B79F5) | 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); value = ((t ^ (t >>> 14)) >>> 0) / 4294967296`.

### `src/types.ts`

`GameState` gains:

```ts
  /** Seed the run started from; reproduces the run with the same actions. */
  seed: number;
  /** Current generator state; advances on every draw. */
  rngState: number;
  mode: 'normal' | 'daily';
  /** YYYY-MM-DD (UTC) for daily runs. */
  dailyDate?: string;
```

## Threading

Each call site draws from the run's generator. Signatures:

- `generateDungeon(depth, rng: () => number)` — internal `rand` and the three `Math.random() < 0.5` sites use `rng`.
- `populateDungeon(state, rooms)` — internal `rand` uses `rngFor(state)`; passes it to `getMonsterTemplate(depth, rng)`, `getEscortTemplate(rng)`, `getRandomItem(depth, rng)`.
- `getMonsterTemplate(depth, rng = Math.random)`, `getEscortTemplate(rng = Math.random)` gain the parameter (defaults keep the data tests simple).
- `runAI(state)` — wander chance and direction use `rngFor(state)`.
- `resolveCombat(state, attacker, defender)` — passes `rngFor(state)` to `computeDamage`.
- `killEntity` — gold drop chance and amount use `rngFor(state)`.
- `Game.showCharSelect`'s placeholder dungeon uses `makeRng(1)`; it is never played.

After this change `grep Math.random src/` matches only `rng.ts` (`randomSeed`) and `placeholder-sprites.ts` (if any; it currently has none).

## Daily rules

### `src/systems/daily.ts` (new)

```ts
export const DAILY_KEY = 'gloomstep-dungeon-daily';
export interface DailyResult { date: string; score: number; won: boolean; depth: number; turn: number; }

export function dailyDate(now: Date): string;              // UTC YYYY-MM-DD
export function dailySeed(date: string): number;           // hashString('gloomstep-daily-' + date)
export function dailyHeroIndex(date: string): number;      // Math.floor(makeRng(dailySeed(date))() * CHARACTERS.length)
export function loadDailyResults(storage?: RunStorage): Record<string, DailyResult>;
export function getDailyResult(date: string, storage?: RunStorage): DailyResult | null;
export function recordDailyResult(result: DailyResult, storage?: RunStorage): void;
```

Results are a JSON object keyed by date; reads and writes are wrapped in try/catch like the other storage code. `recordDailyResult` keeps the higher score if a record already exists (defensive; normally there is one attempt).

The run's own generator is seeded with `dailySeed(date)` too; the hero pick uses a separate private generator over the same seed so it does not shift the dungeon sequence.

## Game (`src/game.ts`)

- Constructor gains an options object: `new Game(ctx, sprites, storage = defaultStorage(), options: { now?: () => Date; seedSource?: () => number } = {})`. Defaults: `() => new Date()`, `randomSeed`.
- New fields: `dailyMode = false`, `todaysDate: string` (from `now()` in `showCharSelect`), `todaysResult: DailyResult | null`.
- `startRun(template, seed, mode, dailyDate?)` replaces `startGameWithCharacter`: sets `seed`, `rngState: seed`, `mode`, `dailyDate`, and uses `rngFor(state)` for `generateDungeon` and population. Public, so tests can start two identical runs.
- `handleCharSelectInput`:
  - `'d'`/`'D'`: toggle `dailyMode`; when turning on, set `charSelectIndex = dailyHeroIndex(todaysDate)` and `confirmAbandon = false`; redraw.
  - Arrow keys are ignored in daily mode (selection is locked).
  - Enter/START in daily mode: if `todaysResult` exists, push nothing and just redraw (the banner already says it's done); otherwise the same erase confirmation, then `startRun(CHARACTERS[dailyHeroIndex], dailySeed(todaysDate), 'daily', todaysDate)`.
  - Enter in free play: `startRun(CHARACTERS[charSelectIndex], seedSource(), 'normal')`.
- `finishRun`: if `state.mode === 'daily' && state.dailyDate`, call `recordDailyResult({ date, score, won, depth, turn }, storage)` before saving high scores. Daily scores also go through `saveHighScore` as today.
- `showCharSelect`: compute `todaysDate = dailyDate(now())`, `todaysResult = getDailyResult(todaysDate, storage)`.
- `getShareText`: when daily, the first line is `\u{1F4C5} Gloomstep Daily ${dailyDate}` (with the trophy variant when won: `\u{1F3C6} Gloomstep Daily ${dailyDate} — CONQUERED`), and the hashtag line adds `#GloomstepDaily`.
- `applyTap`: new `toggleDaily` tap action → same as pressing D.

## Persistence (`src/systems/persistence.ts`)

`loadRun` normalises older saves: `state.mode ??= 'normal'`; if `state.seed` is undefined set `state.seed = state.rngState = randomSeed()`. Save version stays 1.

## Presentation (`src/render/hud.ts`)

`drawCharSelect` gains parameters `daily: { on: boolean; date: string; heroIndex: number; result: DailyResult | null }`.

- A daily toggle button drawn in the detail panel's left corner: rectangle `(startX + 8, detailY + 66, 150, 26)` (compact: `(startX + 8, detailY + 68, 130, 26)`), text `[D] Daily: ON` / `[D] Daily: OFF`, gold border when on, dim when off. Region → `toggleDaily`.
- In daily mode a banner at `detailY + 150` (desktop bold 14px, compact bold 12px), cyan: `DAILY CHALLENGE ${date} — Hero: ${name}`; if `result` exists a second line at `+168`, dim: `Already played today: score ${score}${won ? ' (victory)' : ''}. Come back tomorrow.` Otherwise the second line reads `Same dungeon for everyone. One attempt.` The locked hero card is drawn with the selected highlight as usual.
- `drawGameOver`: when `state.mode === 'daily'`, draw `DAILY CHALLENGE ${state.dailyDate}` in cyan bold 14px at `cy - 88`, above the title. That sits inside the canvas on both layouts (`cy` is at least 330) and does not collide with the victory line at `cy - 30`.

`TapAction` gains `{ type: 'toggleDaily' }`.

## Documentation

README: features bullet `**Daily challenge** — Press D on the hero screen: everyone gets the same dungeon and hero for the day, one attempt, result saved locally`; controls row `D | Toggle daily challenge (hero screen)`; a Tips line explaining the UTC day boundary.

## Testing

`tests/rng.test.ts`
1. Two generators from the same seed produce the same first 20 values; different seeds differ.
2. `hashString('gloomstep-daily-2026-09-16')` equals a fixed number (snapshot the value once implemented).
3. `rngFor(state)` advances `state.rngState` on each draw.

`tests/determinism.test.ts`
4. `generateDungeon(3, makeRng(42))` twice yields deep-equal tiles; `makeRng(43)` differs.
5. Two `Game`s with the same `seedSource` and identical action sequences (start, ten moves/waits/pickups) have deep-equal `dungeon.tiles` and `entities` afterwards.
6. A run saved and reloaded continues identically to an unsaved twin for ten further waits.

`tests/daily.test.ts`
7. `dailyDate(new Date('2026-09-16T23:59:59Z'))` is `2026-09-16`; `dailyDate(new Date('2026-09-17T00:00:00Z'))` is `2026-09-17`.
8. `dailyHeroIndex` is within `[0, 15)` and equal across calls for the same date.
9. `recordDailyResult` then `getDailyResult` round-trips; recording a lower score keeps the higher.
10. `Game` with a fixed `now`: pressing D locks the hero to `dailyHeroIndex`; arrows do not change it; Enter starts a run with `mode 'daily'`, `seed === dailySeed(date)`, `dailyDate === date`.
11. After the daily run ends (player hp 0 then wait), the result is recorded, and a new `Game` on the same date with D pressed refuses Enter (stays on charselect) while a `Game` with `now` on the next day starts normally.
12. `drawGameOver` on a daily state draws the text `DAILY CHALLENGE 2026-09-16`; `getShareText` (exposed via a public wrapper `shareText()`) starts with the daily line.
13. `loadRun` on a record lacking `seed`/`mode` yields `mode 'normal'` and a numeric `seed`/`rngState`.

Existing tests: `tests/movement.test.ts`, `tests/ai.test.ts`, `tests/abilities.test.ts` drop the `Math.random` spy and assert damage ranges (attack 3 into defense 0 → 2..4 damage). `tests/game.test.ts` and others constructing `Game` are unaffected.

## Files

**New:** `src/systems/rng.ts`, `src/systems/daily.ts`, `tests/rng.test.ts`, `tests/daily.test.ts`, `tests/determinism.test.ts`.
**Changed:** `src/types.ts`, `src/dungeon/generator.ts`, `src/dungeon/populate.ts`, `src/data/monsters.ts`, `src/systems/ai.ts`, `src/systems/combat.ts`, `src/systems/persistence.ts`, `src/game.ts`, `src/render/hud.ts`, `src/ui/hit-regions.ts`, `tests/helpers.ts`, `tests/movement.test.ts`, `tests/ai.test.ts`, `tests/abilities.test.ts`, `README.md`.
