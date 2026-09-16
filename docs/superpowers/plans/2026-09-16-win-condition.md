# Win Condition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depth 10 is a final floor with no stairs, a guaranteed Overlord and two escorts; slaying the Overlord wins the run with a bonus, a victory screen, and a victorious share message.

**Architecture:** The Overlord moves out of the random monster table into a `BOSS` template. Population on `BOSS_DEPTH` places it in the farthest room with escorts. `killEntity` flags `state.won`; `Game.endTurn` finishes the run before AI acts. The game over drawer and share text read the flag.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-win-condition-design.md`

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` clean (`noUnusedLocals`, `noUnusedParameters`).
- Tests in `tests/`, `npx vitest run`; all 144 existing tests stay green.
- Two-space indent, single quotes, semicolons. No new dependencies.
- Numbers exactly as in the spec: `BOSS_DEPTH = 10`; boss 120 HP / 16 ATK / 6 DEF / 250 XP; `VICTORY_BONUS = 500`; escorts from `minDepth >= 8`.
- Save version stays 1; a missing `won` loads as `false`.
- Commit per task with trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/constants.ts` (modify) | `BOSS_DEPTH` |
| `src/types.ts` (modify) | `Entity.boss`, `GameState.won` |
| `src/data/monsters.ts` (modify) | `BOSS` template, `getEscortTemplate`, Overlord removed from `MONSTERS` |
| `src/dungeon/generator.ts` (modify) | No stairs on the boss depth |
| `src/dungeon/populate.ts` (modify) | `placeMonster` helper; boss and escorts on the boss depth |
| `src/systems/combat.ts` (modify) | `VICTORY_BONUS`; boss kill sets `won` |
| `src/systems/persistence.ts` (modify) | Normalise missing `won` |
| `src/game.ts` (modify) | `finishRun`, win check in `endTurn`, sealed stairs, share text |
| `src/render/hud.ts` (modify) | Final-floor depth readout; VICTORY variant |
| `tests/helpers.ts`, `tests/boss.test.ts`, `README.md` | Tests and docs |

---

### Task 1: Data, types, and the stairless final floor

**Files:**
- Modify: `src/constants.ts`, `src/types.ts`, `src/data/monsters.ts`, `src/dungeon/generator.ts`, `tests/helpers.ts`
- Test: `tests/boss.test.ts`

**Interfaces:**
- Produces: `BOSS_DEPTH`, `BOSS: MonsterTemplate`, `getEscortTemplate(): MonsterTemplate`, `Entity.boss?: true`, `GameState.won: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `tests/boss.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateDungeon } from '../src/dungeon/generator';
import { BOSS, getEscortTemplate, getMonsterTemplate, MONSTERS } from '../src/data/monsters';
import { BOSS_DEPTH } from '../src/constants';
import { Tile } from '../src/types';

function hasStairs(depth: number): boolean {
  const { dungeon } = generateDungeon(depth);
  return dungeon.tiles.some((row) => row.includes(Tile.StairsDown));
}

describe('final floor generation', () => {
  it('places stairs on every floor above the boss depth', () => {
    for (let i = 0; i < 5; i++) {
      expect(hasStairs(BOSS_DEPTH - 1)).toBe(true);
    }
  });

  it('places no stairs on the boss depth', () => {
    for (let i = 0; i < 5; i++) {
      expect(hasStairs(BOSS_DEPTH)).toBe(false);
    }
  });
});

describe('boss data', () => {
  it('keeps the Overlord out of the random monster pool', () => {
    expect(MONSTERS.some((m) => m.appearance.name === 'Overlord')).toBe(false);
    for (let i = 0; i < 2000; i++) {
      expect(getMonsterTemplate(BOSS_DEPTH).appearance.name).not.toBe('Overlord');
    }
  });

  it('defines the Overlord as the boss', () => {
    expect(BOSS.appearance.name).toBe('Overlord');
    expect(BOSS.stats.maxHp).toBe(120);
    expect(BOSS.xpValue).toBe(250);
  });

  it('draws escorts only from deep monsters', () => {
    for (let i = 0; i < 200; i++) {
      expect(getEscortTemplate().minDepth).toBeGreaterThanOrEqual(8);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/boss.test.ts`
Expected: FAIL — `BOSS` / `getEscortTemplate` / `BOSS_DEPTH` are not exported (import errors or undefined), and the stairs test on depth 10 fails.

- [ ] **Step 3: Constants and types**

Append to `src/constants.ts` after `FOV_RADIUS`:

```ts
/** The final floor: no stairs down, the Overlord spawns here. */
export const BOSS_DEPTH = 10;
```

In `src/types.ts`, add to `Entity` after `xpValue?: number;`:

```ts
  /** The floor boss; slaying it wins the run. */
  boss?: true;
```

Add to `GameState` after `gameOver: boolean;`:

```ts
  won: boolean;
```

- [ ] **Step 4: Boss template and escort picker**

In `src/data/monsters.ts`, add the import:

```ts
import { BOSS_DEPTH } from '../constants';
```

Delete the Overlord entry from `MONSTERS` (the object with `name: 'Overlord'`, `minDepth: 10`). Then append after `getMonsterTemplate`:

```ts
/** The final-floor boss. Not part of the random pool; spawned once by populateDungeon. */
export const BOSS: MonsterTemplate = {
  appearance: { name: 'Overlord', char: 'O', color: '#cc2222', sprite: 'overlord' },
  stats: { hp: 120, maxHp: 120, attack: 16, defense: 6, level: 10, xp: 0, xpToNext: 0 },
  ai: { type: 'chase', alertRange: 8 },
  xpValue: 250,
  minDepth: BOSS_DEPTH,
};

/** A uniformly chosen deep monster to guard the boss. */
export function getEscortTemplate(): MonsterTemplate {
  const deep = MONSTERS.filter((m) => m.minDepth >= 8);
  return deep[Math.floor(Math.random() * deep.length)];
}
```

- [ ] **Step 5: No stairs on the final floor**

In `src/dungeon/generator.ts`, add `BOSS_DEPTH` to the constants import:

```ts
import { MAP_W, MAP_H, BOSS_DEPTH } from '../constants';
```

Change the stairs placement condition:

```ts
  // Place stairs in the last room (the final floor has no way down)
  if (rooms.length > 1 && depth < BOSS_DEPTH) {
```

- [ ] **Step 6: Test helper and game state initialisers**

In `tests/helpers.ts`, in `makeState`, add `won: false,` after `gameOver: false,`.

In `src/game.ts`, in both state literals (`showCharSelect` and `startGameWithCharacter`), add `won: false,` after `gameOver: false,`.

- [ ] **Step 7: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 149 tests pass, no type errors. (The durability invariant in `tests/monsters.test.ts` still passes: at depth 10 the toughest pooled monster is now the Abomination at 50 HP versus a max hit of 37.)

- [ ] **Step 8: Commit**

```bash
git add src/constants.ts src/types.ts src/data/monsters.ts src/dungeon/generator.ts src/game.ts tests/helpers.ts tests/boss.test.ts
git commit -m "Add boss template, final-floor constant, and stairless depth 10" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Boss and escorts spawn on the final floor

**Files:**
- Modify: `src/dungeon/populate.ts`
- Test: `tests/boss.test.ts`

**Interfaces:**
- Consumes: `BOSS`, `getEscortTemplate`, `BOSS_DEPTH` (Task 1).

- [ ] **Step 1: Write the failing test**

Append to `tests/boss.test.ts`:

```ts
import { populateDungeon } from '../src/dungeon/populate';
import { makePlayer, makeState } from './helpers';

describe('final floor population', () => {
  it('spawns exactly one Overlord and at least two deep escorts', () => {
    const { dungeon, rooms } = generateDungeon(BOSS_DEPTH);
    const start = rooms[0];
    const player = makePlayer(Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2));
    const state = makeState(player);
    state.dungeon = dungeon;
    state.depth = BOSS_DEPTH;

    populateDungeon(state, rooms);

    const bosses = state.entities.filter((e) => e.boss);
    expect(bosses).toHaveLength(1);
    expect(bosses[0].appearance!.name).toBe('Overlord');
    expect(bosses[0].stats!.maxHp).toBe(120);

    const deepNames = new Set(MONSTERS.filter((m) => m.minDepth >= 8).map((m) => m.appearance.name));
    const escorts = state.entities.filter((e) => e.ai && !e.boss && deepNames.has(e.appearance!.name));
    expect(escorts.length).toBeGreaterThanOrEqual(2);
  });

  it('spawns no boss above the final floor', () => {
    const { dungeon, rooms } = generateDungeon(9);
    const start = rooms[0];
    const state = makeState(makePlayer(Math.floor(start.x + start.w / 2), Math.floor(start.y + start.h / 2)));
    state.dungeon = dungeon;
    state.depth = 9;

    populateDungeon(state, rooms);

    expect(state.entities.some((e) => e.boss)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/boss.test.ts`
Expected: the first population test FAILS (`expected [] to have a length of 1`); the second passes.

- [ ] **Step 3: Implement**

In `src/dungeon/populate.ts`, replace the imports with:

```ts
import { Entity, GameState, Room, Tile } from '../types';
import { createEntity } from '../ecs/entity';
import { BOSS, getEscortTemplate, getMonsterTemplate, MonsterTemplate } from '../data/monsters';
import { getRandomItem } from '../data/items';
import { BOSS_DEPTH } from '../constants';
```

Add after `randomFloorInRoom`:

```ts
function roomCenter(room: Room): { x: number; y: number } {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function isFree(state: GameState, x: number, y: number): boolean {
  return (
    state.dungeon.tiles[y]?.[x] === Tile.Floor &&
    !state.entities.some((e) => e.position && e.position.x === x && e.position.y === y)
  );
}

function placeMonster(
  state: GameState,
  template: MonsterTemplate,
  pos: { x: number; y: number },
  extra: Partial<Entity> = {}
): Entity {
  const monster = createEntity({
    position: { x: pos.x, y: pos.y },
    stats: { ...template.stats },
    appearance: { ...template.appearance },
    ai: { ...template.ai },
    blocksMovement: true,
    xpValue: template.xpValue,
    ...extra,
  });
  state.entities.push(monster);
  return monster;
}

/** The Overlord and two escorts, in the room farthest from the player. */
function spawnBoss(state: GameState, rooms: Room[]): void {
  const playerPos = state.player.position!;
  const candidates = rooms.length > 1 ? rooms.slice(1) : rooms;
  let bossRoom = candidates[0];
  let bestDist = -1;
  for (const room of candidates) {
    const c = roomCenter(room);
    const dist = Math.hypot(c.x - playerPos.x, c.y - playerPos.y);
    if (dist > bestDist) {
      bestDist = dist;
      bossRoom = room;
    }
  }

  const center = roomCenter(bossRoom);
  const bossPos = isFree(state, center.x, center.y) ? center : randomFloorInRoom(state, bossRoom);
  if (bossPos) {
    placeMonster(state, BOSS, bossPos, { boss: true });
  }

  for (let i = 0; i < 2; i++) {
    const pos = randomFloorInRoom(state, bossRoom);
    if (pos) placeMonster(state, getEscortTemplate(), pos);
  }
}
```

Replace the regular monster spawn loop body with the helper:

```ts
  // Spawn monsters
  for (let i = 0; i < monsterCount; i++) {
    const room = spawnRooms[rand(0, spawnRooms.length - 1)];
    const pos = randomFloorInRoom(state, room);
    if (!pos) continue;
    placeMonster(state, getMonsterTemplate(depth), pos);
  }
```

At the end of `populateDungeon`, after the treasure loop, add:

```ts
  // The final floor holds the Overlord
  if (depth === BOSS_DEPTH) {
    spawnBoss(state, rooms);
  }
```

Also change the early return so the boss can still spawn on a one-room floor: replace `if (spawnRooms.length === 0) return;` with

```ts
  if (spawnRooms.length === 0) {
    if (depth === BOSS_DEPTH) spawnBoss(state, rooms);
    return;
  }
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 151 tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/dungeon/populate.ts tests/boss.test.ts
git commit -m "Spawn the Overlord and escorts on the final floor" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Winning ends the run

**Files:**
- Modify: `src/systems/combat.ts`, `src/systems/persistence.ts`, `src/game.ts`
- Test: `tests/boss.test.ts`

**Interfaces:**
- Consumes: `Entity.boss`, `GameState.won` (Task 1).
- Produces: `VICTORY_BONUS` exported from `combat.ts`; `Game.finishRun()` (private).

- [ ] **Step 1: Write the failing tests**

Append to `tests/boss.test.ts`:

```ts
import { killEntity, VICTORY_BONUS } from '../src/systems/combat';
import { createEntity } from '../src/ecs/entity';
import { Game } from '../src/game';
import { createMemoryStorage, getSaveSummary, loadRun, saveRun, SAVE_KEY } from '../src/systems/persistence';
import { makeCtx, makeMonster } from './helpers';

function makeBoss(x: number, y: number) {
  return createEntity({
    position: { x, y },
    stats: { ...BOSS.stats },
    appearance: { ...BOSS.appearance },
    ai: { ...BOSS.ai },
    blocksMovement: true,
    xpValue: BOSS.xpValue,
    boss: true,
  });
}

describe('slaying the boss', () => {
  it('flags the win, adds the bonus, and announces it', () => {
    const player = makePlayer(1, 1);
    const boss = makeBoss(2, 1);
    const state = makeState(player, [boss]);
    const scoreBefore = state.score;

    killEntity(state, boss, player);

    expect(state.won).toBe(true);
    expect(state.score).toBe(scoreBefore + BOSS.xpValue + VICTORY_BONUS);
    expect(state.messages.at(-1)).toContain('Overlord falls');
  });

  it('does not win on an ordinary kill', () => {
    const player = makePlayer(1, 1);
    const rat = makeMonster(2, 1);
    const state = makeState(player, [rat]);

    killEntity(state, rat, player);

    expect(state.won).toBe(false);
  });
});

describe('Game on the final floor', () => {
  function gameOnBossFloor() {
    const storage = createMemoryStorage();
    const { ctx } = makeCtx();
    const game = new Game(ctx, new Map(), storage);
    game.handleCharSelectInput('Enter');
    game.tick({ type: 'wait' });
    game.state.depth = BOSS_DEPTH;
    return { game, storage };
  }

  it('ends the run in victory on the turn the boss dies, before monsters act', () => {
    const { game, storage } = gameOnBossFloor();
    const pos = game.state.player.position!;
    const boss = makeBoss(pos.x + 1, pos.y);
    boss.stats!.hp = 1;
    boss.stats!.defense = 0;
    game.state.entities.push(boss);
    const monster = makeMonster(pos.x - 1, pos.y, { attack: 50 });
    game.state.entities.push(monster);
    const hpBefore = game.state.player.stats!.hp;

    game.tick({ type: 'move', dx: 1, dy: 0 });

    expect(game.state.won).toBe(true);
    expect(game.state.gameOver).toBe(true);
    expect(game.state.uiMode).toBe('gameover');
    expect(game.state.player.stats!.hp).toBe(hpBefore);
    expect(getSaveSummary(storage)).toBeNull();
    expect(game.state.highScores[0]).toBe(game.state.score);
  });

  it('refuses to descend from the final floor', () => {
    const { game } = gameOnBossFloor();
    const pos = game.state.player.position!;
    game.state.dungeon.tiles[pos.y][pos.x] = Tile.StairsDown;

    game.tick({ type: 'descend' });

    expect(game.state.depth).toBe(BOSS_DEPTH);
    expect(game.state.messages.at(-1)).toContain('sealed');
  });
});

describe('save compatibility', () => {
  it('loads an older save without a won flag as not won', () => {
    const storage = createMemoryStorage();
    saveRun(makeState(makePlayer(1, 1)), storage);
    const record = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete record.state.won;
    storage.setItem(SAVE_KEY, JSON.stringify(record));

    expect(loadRun(storage)!.won).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/boss.test.ts`
Expected: `VICTORY_BONUS` import is undefined → the first boss-kill test FAILS on `won` (expected true, got false); the Game victory test FAILS (`won` false / HP reduced by the monster); the descend test FAILS (depth becomes 11); the save test FAILS (`undefined` instead of `false`). The ordinary-kill test passes.

- [ ] **Step 3: Combat flags the win**

In `src/systems/combat.ts`, add after the imports:

```ts
/** Score awarded on top of the boss's XP for slaying it. */
export const VICTORY_BONUS = 500;
```

In `killEntity`, after the `// Award XP` block (after `checkLevelUp(state, killer);` and its closing brace), add:

```ts
  // Slaying the boss wins the run; Game.endTurn finishes it before monsters act.
  if (victim.boss && killer.player) {
    state.won = true;
    state.score += VICTORY_BONUS;
    state.messages.push('The Overlord falls. The dungeon is yours!');
  }
```

- [ ] **Step 4: Persistence normalises the flag**

In `src/systems/persistence.ts`, in `loadRun`, after `state.uiMode = 'game';` add:

```ts
  state.won = state.won ?? false;
```

- [ ] **Step 5: Game finishes the run**

In `src/game.ts`, add `BOSS_DEPTH` to the constants import (create the import if `constants` is not yet imported there):

```ts
import { BOSS_DEPTH } from './constants';
```

Replace the whole `endTurn` method with:

```ts
  private endTurn(): void {
    this.state.turn++;

    // Victory is decided by the player's own action; the monsters get no reply.
    if (this.state.won && !this.state.gameOver) {
      this.finishRun();
      return;
    }

    runAI(this.state);
    tickAbilities(this.state);
    computeFOV(this.state);

    if (this.state.messages.length > 50) {
      this.state.messages = this.state.messages.slice(-50);
    }

    if (this.state.player.stats!.hp <= 0 && !this.state.gameOver) {
      this.finishRun();
      return;
    }

    saveRun(this.state, this.storage);
    this.draw();
  }

  /** Ends the run, in victory or death: records the score and clears the autosave. */
  private finishRun(): void {
    this.state.gameOver = true;
    this.state.uiMode = 'gameover';
    this.state.highScores = saveHighScore(this.state.score);
    clearRun(this.storage);
    this.draw();
  }
```

In `tryDescend`, add at the very top of the method body:

```ts
    if (this.state.depth >= BOSS_DEPTH) {
      this.state.messages.push("The way down is sealed. Only the Overlord's fall can end this.");
      this.draw();
      return;
    }
```

- [ ] **Step 6: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 156 tests pass, no type errors. The existing autosave and death tests in `tests/game.test.ts` still pass via `finishRun`.

- [ ] **Step 7: Commit**

```bash
git add src/systems/combat.ts src/systems/persistence.ts src/game.ts tests/boss.test.ts
git commit -m "Slaying the Overlord wins the run; the final floor is sealed" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Victory presentation and docs

**Files:**
- Modify: `src/render/hud.ts`, `src/game.ts`, `README.md`
- Test: `tests/boss.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/boss.test.ts`:

```ts
import { drawGameOver, drawHud } from '../src/render/hud';

describe('victory presentation', () => {
  it('titles the end screen VICTORY when the run was won', () => {
    const state = makeState(makePlayer(1, 1));
    state.won = true;
    const { ctx, calls } = makeCtx();

    drawGameOver(ctx, state);

    const texts = calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]);
    expect(texts).toContain('VICTORY');
    expect(texts).not.toContain('GAME OVER');
  });

  it('titles the end screen GAME OVER otherwise', () => {
    const state = makeState(makePlayer(1, 1));
    const { ctx, calls } = makeCtx();

    drawGameOver(ctx, state);

    expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toContain('GAME OVER');
  });

  it('marks the final floor in the HUD', () => {
    const state = makeState(makePlayer(1, 1));
    state.depth = BOSS_DEPTH;
    const { ctx, calls } = makeCtx();

    drawHud(ctx, state);

    expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toContain('Depth: 10 (final)');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/boss.test.ts`
Expected: the VICTORY test and the HUD test FAIL; the GAME OVER test passes.

- [ ] **Step 3: HUD and game over variant**

In `src/render/hud.ts`, add `BOSS_DEPTH` to the constants import:

```ts
import { COLORS, TILE_SIZE, BOSS_DEPTH } from '../constants';
```

In `drawHud`, replace the `Depth:` line with:

```ts
  if (state.depth >= BOSS_DEPTH) {
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Depth: ${state.depth} (final)`, statsX, barY + 8);
    ctx.fillStyle = COLORS.text;
  } else {
    ctx.fillText(`Depth: ${state.depth}`, statsX, barY + 8);
  }
```

In `drawGameOver`, replace the title block

```ts
  ctx.fillStyle = '#cc3333';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', cx, cy - 60);
```

with:

```ts
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  if (state.won) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('VICTORY', cx, cy - 60);
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px monospace';
    ctx.fillText(`You slew the Overlord on depth ${BOSS_DEPTH}.`, cx, cy - 30);
  } else {
    ctx.fillStyle = '#cc3333';
    ctx.fillText('GAME OVER', cx, cy - 60);
  }
```

- [ ] **Step 4: Share text**

In `src/game.ts`, replace `getShareText` with:

```ts
  private getShareText(): string {
    const GAME_URL = 'https://gloomstep.barretblake.dev';
    const s = this.state;
    const stats = s.player.stats!;
    const name = s.player.appearance?.name ?? 'Adventurer';
    const title = s.won
      ? `\u{1F3C6} Gloomstep Dungeon — CONQUERED \u{1F3C6}`
      : `⚔️ Gloomstep Dungeon ⚔️`;
    const challenge = s.won ? 'I slew the Overlord. Can you?' : 'Can you survive the dungeon?';
    return [
      title,
      `Score: ${s.score} | Depth: ${s.depth} | Level: ${stats.level}`,
      `Turns Survived: ${s.turn}`,
      `Character: ${name}`,
      challenge,
      GAME_URL,
      `#GloomstepDungeon #roguelike`,
    ].join('\n');
  }
```

- [ ] **Step 5: README**

Features list, after the Permadeath bullet:

```markdown
- **A final floor** — Depth 10 has no way down; slay the Overlord to win
```

Replace the tip `- Deeper floors have tougher monsters but better loot and more valuable treasure. Newly unlocked gear is the most common find, and weapons or armor from six or more floors up stop appearing entirely. Potions and scrolls always stay in the loot pool` with the same text plus a second sentence: `Depth 10 is the final floor: there are no stairs down, and the run ends in victory when the Overlord falls`.

Add a tip:

```markdown
- The Overlord waits in the room farthest from where you arrive on depth 10, guarded by two deep-floor monsters. Buff up, bring potions, and open with your ability
```

- [ ] **Step 6: Run tests, type check, build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 159 tests pass, clean.

- [ ] **Step 7: Browser sanity check**

Start the dev server. Reaching depth 10 by play is impractical, so verify what is observable cheaply: the game loads, a run starts, and there are no console errors. The victory screen, sealed stairs, and boss spawn are covered by the unit tests above. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/render/hud.ts src/game.ts README.md tests/boss.test.ts
git commit -m "Victory screen, final-floor HUD marker, and conquered share text" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Constants/types/BOSS/escorts/stairs → Task 1. Population → Task 2. Kill flag, `finishRun`, sealed descend, save normalisation → Task 3. HUD marker, VICTORY variant, share text, README → Task 4. Spec tests 1, 3 → Task 1; 2 → Task 2; 4–7, 9 → Task 3; 8 → Task 4 (plus the HUD marker).

**Placeholders.** None.

**Type consistency.** `BOSS`, `getEscortTemplate`, `MONSTERS`, `BOSS_DEPTH`, `VICTORY_BONUS`, `Entity.boss`, `GameState.won` named identically across tasks. `placeMonster` is private to `populate.ts`. `finishRun` is private to `Game` and used only inside it.
