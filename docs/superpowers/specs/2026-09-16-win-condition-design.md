# Win Condition — Design

**Date:** 2026-09-16
**Status:** Approved in discussion; spec for implementation planning.

## Goal

Depth 10 is the final floor. It has no stairs down, spawns the Overlord exactly once with two escorts, and slaying the Overlord ends the run in victory: a score bonus, a victory screen, a victorious share message, and the high score recorded.

## Non-goals

- No upward travel, amulet, or escape sequence.
- No hand-made boss arena; the BSP generator is used as on every floor.
- No new UI mode; the game over screen gains a victory variant.
- No boss-specific AI or abilities. The boss uses the normal chase behaviour.
- Boss numbers are a first guess; tuning comes after play.

## Data

### `src/constants.ts`

```ts
/** The final floor: no stairs down, the Overlord spawns here. */
export const BOSS_DEPTH = 10;
```

### `src/data/monsters.ts`

The Overlord entry is removed from `MONSTERS` (so the random picker never returns it) and exported separately:

```ts
export const BOSS: MonsterTemplate = {
  appearance: { name: 'Overlord', char: 'O', color: '#cc2222', sprite: 'overlord' },
  stats: { hp: 120, maxHp: 120, attack: 16, defense: 6, level: 10, xp: 0, xpToNext: 0 },
  ai: { type: 'chase', alertRange: 8 },
  xpValue: 250,
  minDepth: BOSS_DEPTH,
};
```

`getMonsterTemplate` is unchanged in code; because the boss is no longer in the table it can never be drawn.

### `src/types.ts`

- `Entity` gains `boss?: true`.
- `GameState` gains `won: boolean`.

## Generation (`src/dungeon/generator.ts`)

`generateDungeon(depth)` places the stairs only when `depth < BOSS_DEPTH`. Everything else is unchanged.

## Population (`src/dungeon/populate.ts`)

After the normal monster, item, and treasure spawns, when `state.depth === BOSS_DEPTH`:

1. Pick the boss room: among `rooms.slice(1)`, the room whose centre is farthest (Euclidean) from the player's position. If there is only the start room, use it.
2. Place the boss at the room's centre if that tile is free, otherwise at `randomFloorInRoom`. Create it from `BOSS` with `boss: true`, `blocksMovement: true`, `xpValue: BOSS.xpValue`.
3. Place two escorts at `randomFloorInRoom` in the same room, each created from `getEscortTemplate()`: a uniform pick among `MONSTERS` with `minDepth >= 8`. Export `getEscortTemplate` from `monsters.ts`.

A helper `placeMonster(state, template, pos, extra?)` is extracted so the three call sites (regular, boss, escorts) share entity construction.

## Winning (`src/systems/combat.ts`, `src/game.ts`)

- `killEntity`: after awarding XP, if `victim.boss && killer.player`: `state.won = true`, `state.score += VICTORY_BONUS` (500, a constant in `combat.ts`), push `'The Overlord falls. The dungeon is yours!'`.
- `Game.endTurn`: at the top, after `this.state.turn++`, if `this.state.won && !this.state.gameOver` → call `this.finishRun()` and return **without** running AI, so no monster gets a swing at the victor. `finishRun()` sets `gameOver = true`, `uiMode = 'gameover'`, `highScores = saveHighScore(score)`, `clearRun(storage)`, then `draw()`. The existing death branch is refactored to call the same `finishRun()`.
- `Game.tryDescend`: if `this.state.depth >= BOSS_DEPTH`, push `'The way down is sealed. Only the Overlord's fall can end this.'` and return, before checking the tile.
- New runs start with `won: false`; `showCharSelect`'s placeholder state too. `loadRun` normalises a missing flag: `state.won = state.won ?? false`.

## Presentation (`src/render/hud.ts`, `src/game.ts`)

- `drawHud`: on `BOSS_DEPTH` the depth readout is `Depth: 10 (final)` in gold.
- `drawGameOver`: when `state.won`, the title is `VICTORY` in `#ffcc00` and a 14px gold line `You slew the Overlord on depth 10.` is drawn at `cy - 30` (the score line and everything below are unchanged). Otherwise exactly as today.
- `getShareText`: when won, the first line is `🏆 Gloomstep Dungeon — CONQUERED 🏆` and the fifth line is `I slew the Overlord. Can you?`; otherwise unchanged.

## Documentation

README: features gain `**A final floor** — Depth 10 has no way down; slay the Overlord to win`. The Tips section gains a line about the sealed final floor and the boss escorts. The "Deeper floors" tip mentions the run ends in victory at depth 10.

## Testing

`tests/boss.test.ts`
1. `generateDungeon(9)` contains a `StairsDown` tile; `generateDungeon(10)` contains none.
2. `populateDungeon` on a depth-10 state yields exactly one entity with `boss: true` named Overlord, plus at least two escorts whose templates have `minDepth >= 8` (checked by name against `MONSTERS`).
3. `getMonsterTemplate(10)` never returns an Overlord across 2000 draws.
4. Killing a boss entity via `killEntity` with the player as killer sets `won`, adds 500 to the score, and pushes the victory message.
5. Killing a non-boss monster leaves `won` false.
6. `Game`: after a boss kill, the next `tick` ends the run — `gameOver` true, `uiMode` `'gameover'`, autosave cleared, and the player's HP unchanged from before the tick (no monster acted).
7. `Game.tryDescend` on depth 10 pushes the sealed message and does not change depth, even when the player stands on a tile that would be stairs.
8. `drawGameOver` with `won` true draws the text `VICTORY`; with `won` false draws `GAME OVER` (via the `makeCtx` call log).
9. `loadRun` of a record whose state lacks `won` returns `won: false`.

All 144 existing tests stay green.

## Files

**New:** `tests/boss.test.ts`.
**Changed:** `src/constants.ts`, `src/types.ts`, `src/data/monsters.ts`, `src/dungeon/generator.ts`, `src/dungeon/populate.ts`, `src/systems/combat.ts`, `src/systems/persistence.ts`, `src/game.ts`, `src/render/hud.ts`, `tests/helpers.ts` (`makeState` sets `won: false`), `README.md`.
