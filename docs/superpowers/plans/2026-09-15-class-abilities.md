# Class Abilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the seven hero classes one cooldown-limited active ability fired with the `Q` key.

**Architecture:** Ability definitions are data (`src/data/abilities.ts`) keyed by id; each character template names its ability. A new `src/systems/abilities.ts` applies effects and ticks cooldowns and status effects each turn. Temporary buffs and stealth live in a plain status-effect list on the player; the equipment module folds buffs into attack/defense totals and the AI honours stealth.

**Tech Stack:** TypeScript, Vite, HTML5 Canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-class-abilities-design.md`

## Global Constraints

- TypeScript strict mode; `npx tsc --noEmit` must pass with no errors (config has `noUnusedLocals` and `noUnusedParameters`).
- Tests live in `tests/`, run with `npx vitest run`. All 43 existing tests must stay green.
- Two-space indentation, single quotes, semicolons, matching the existing source.
- No new dependencies.
- Balance numbers are exactly those in the spec table; do not tune.
- Commit after each task with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/types.ts` (modify) | `AbilityId`, `AbilityComponent`, `StatusEffect`, new entity fields, new action |
| `src/data/abilities.ts` (create) | The seven ability definitions |
| `src/data/characters.ts` (modify) | `ability` field on every template |
| `src/systems/targeting.ts` (create) | Shared "nearest visible monster in range" search used by scrolls and bolts |
| `src/systems/abilities.ts` (create) | `useAbility`, `tickAbilities`, `isHidden` |
| `src/systems/equipment.ts` (modify) | Buffs folded into attack/defense totals |
| `src/systems/inventory.ts` (modify) | Scroll damage uses the shared targeting helper |
| `src/systems/ai.ts` (modify) | Stealth hides the player |
| `src/systems/input.ts` (modify) | `Q` key |
| `src/game.ts` (modify) | Player gets ability component; tick handles the action; end of turn ticks abilities |
| `src/render/hud.ts` (modify) | Ability line in HUD; ability line on character select |
| `index.html`, `README.md` (modify) | Controls and docs |
| `tests/helpers.ts` (modify) | `giveAbility` helper |
| `tests/abilities-data.test.ts`, `tests/abilities.test.ts`, `tests/ai.test.ts` (create) | Tests |
| `tests/equipment.test.ts`, `tests/input.test.ts`, `tests/game.test.ts` (modify) | Tests |

---

### Task 1: Types and ability data

**Files:**
- Modify: `src/types.ts`
- Create: `src/data/abilities.ts`
- Modify: `src/data/characters.ts`
- Test: `tests/abilities-data.test.ts`

**Interfaces:**
- Produces: `AbilityId` union, `AbilityComponent { id; cooldownRemaining }`, `StatusEffect` union, `Entity.ability?`, `Entity.statusEffects?`, `Action { type: 'ability' }`, `ABILITIES: Record<AbilityId, AbilityDefinition>`, `CharacterTemplate.ability: AbilityId`.

- [ ] **Step 1: Write the failing test**

Create `tests/abilities-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ABILITIES } from '../src/data/abilities';
import { CHARACTERS } from '../src/data/characters';

describe('ability data', () => {
  it('gives every character a defined ability', () => {
    for (const character of CHARACTERS) {
      expect(ABILITIES[character.ability], character.name).toBeDefined();
    }
  });

  it('gives every ability a positive cooldown', () => {
    for (const ability of Object.values(ABILITIES)) {
      expect(ability.cooldown, ability.name).toBeGreaterThan(0);
    }
  });

  it('maps each class to exactly one ability and each ability to one class', () => {
    const byClass = new Map<string, string>();
    for (const character of CHARACTERS) {
      const existing = byClass.get(character.className);
      if (existing) {
        expect(existing, character.name).toBe(character.ability);
      } else {
        byClass.set(character.className, character.ability);
      }
    }
    expect(new Set(byClass.values()).size).toBe(byClass.size);
    expect(byClass.size).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/abilities-data.test.ts`
Expected: FAIL with `Cannot find module '../src/data/abilities'`

- [ ] **Step 3: Add types**

In `src/types.ts`, add after the `TreasureComponent` interface:

```ts
export type AbilityId =
  | 'cleave'
  | 'rage'
  | 'arcane-bolt'
  | 'vanish'
  | 'survey'
  | 'guard-stance'
  | 'mend';

export interface AbilityComponent {
  id: AbilityId;
  /** Turns until the ability can be used again. 0 means ready. */
  cooldownRemaining: number;
}

export type StatusEffect =
  | { kind: 'buff'; stat: 'attack' | 'defense'; amount: number; turnsRemaining: number }
  | { kind: 'stealth'; turnsRemaining: number };
```

In the `Entity` interface, add after `treasure?: TreasureComponent;`:

```ts
  ability?: AbilityComponent;
  statusEffects?: StatusEffect[];
```

In the `Action` union, add after `| { type: 'descend' }`:

```ts
  | { type: 'ability' }
```

- [ ] **Step 4: Create the ability definitions**

Create `src/data/abilities.ts`:

```ts
import { AbilityId } from '../types';

export type AbilityEffect =
  | { type: 'cleave' }
  | { type: 'bolt'; base: number; perLevel: number; range: number }
  | { type: 'buff'; stat: 'attack' | 'defense'; amount: number; turns: number }
  | { type: 'stealth'; turns: number }
  | { type: 'reveal'; radius: number }
  | { type: 'heal'; fraction: number };

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  /** One line, shown on the character select screen. */
  description: string;
  /** Turns between uses. */
  cooldown: number;
  effect: AbilityEffect;
}

export const ABILITIES: Record<AbilityId, AbilityDefinition> = {
  'cleave': {
    id: 'cleave',
    name: 'Cleave',
    description: 'Strike every adjacent enemy',
    cooldown: 10,
    effect: { type: 'cleave' },
  },
  'rage': {
    id: 'rage',
    name: 'Rage',
    description: '+3 ATK for 6 turns',
    cooldown: 15,
    effect: { type: 'buff', stat: 'attack', amount: 3, turns: 6 },
  },
  'arcane-bolt': {
    id: 'arcane-bolt',
    name: 'Arcane Bolt',
    description: '8 + level damage to the nearest enemy in sight',
    cooldown: 6,
    effect: { type: 'bolt', base: 8, perLevel: 1, range: 6 },
  },
  'vanish': {
    id: 'vanish',
    name: 'Vanish',
    description: 'Monsters lose sight of you for 5 turns',
    cooldown: 15,
    effect: { type: 'stealth', turns: 5 },
  },
  'survey': {
    id: 'survey',
    name: 'Survey',
    description: 'Reveal the map within 12 tiles',
    cooldown: 30,
    effect: { type: 'reveal', radius: 12 },
  },
  'guard-stance': {
    id: 'guard-stance',
    name: 'Guard Stance',
    description: '+4 DEF for 6 turns',
    cooldown: 15,
    effect: { type: 'buff', stat: 'defense', amount: 4, turns: 6 },
  },
  'mend': {
    id: 'mend',
    name: 'Mend',
    description: 'Heal 30% of max HP',
    cooldown: 12,
    effect: { type: 'heal', fraction: 0.3 },
  },
};
```

- [ ] **Step 5: Add the ability to every character template**

In `src/data/characters.ts`, change the import and interface:

```ts
import { AbilityId, Stats } from '../types';

export interface CharacterTemplate {
  id: string;
  name: string;
  race: string;
  className: string;
  ability: AbilityId;
  sprite: string;       // slug for sprite map
  spriteFile: string;   // filename in public/sprites/
  stats: Stats;
}
```

Then in every entry, insert the ability right after `className`. Apply these seven exact replacements to the whole file (each `className` value appears on a line like `id: ..., name: ..., race: ..., className: 'Warrior',`):

| Find | Replace with |
|---|---|
| `className: 'Warrior',` | `className: 'Warrior', ability: 'cleave',` |
| `className: 'Barbarian',` | `className: 'Barbarian', ability: 'rage',` |
| `className: 'Mage',` | `className: 'Mage', ability: 'arcane-bolt',` |
| `className: 'Rogue',` | `className: 'Rogue', ability: 'vanish',` |
| `className: 'Scout',` | `className: 'Scout', ability: 'survey',` |
| `className: 'Sentinel',` | `className: 'Sentinel', ability: 'guard-stance',` |
| `className: 'Healer',` | `className: 'Healer', ability: 'mend',` |

There are six Warrior entries (two Human, two Dwarf, two Drow), one Barbarian, two Mage, two Rogue, one Scout, two Sentinel, one Healer: 15 lines changed.

- [ ] **Step 6: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 46 tests pass (43 + 3), no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/data/abilities.ts src/data/characters.ts tests/abilities-data.test.ts
git commit -m "Add ability types, definitions, and class mapping" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Buffs count toward attack and defense

**Files:**
- Modify: `src/systems/equipment.ts`
- Test: `tests/equipment.test.ts`

**Interfaces:**
- Consumes: `StatusEffect` from Task 1.
- Produces: `getAttackPower` / `getDefensePower` include active buffs. `getAttackBonus` / `getDefenseBonus` remain equipment-only (the HUD shows buffs separately).

- [ ] **Step 1: Write the failing tests**

Append to `tests/equipment.test.ts` inside the existing `describe('getAttackPower', ...)` block:

```ts
  it('adds active attack buffs to attack power', () => {
    const player = makePlayer(1, 1, { attack: 5 });
    player.statusEffects = [{ kind: 'buff', stat: 'attack', amount: 3, turnsRemaining: 6 }];

    expect(getAttackPower(player)).toBe(8);
  });
```

And inside `describe('getDefensePower', ...)`:

```ts
  it('adds active defense buffs to defense power', () => {
    const player = makePlayer(1, 1, { defense: 1 });
    player.statusEffects = [{ kind: 'buff', stat: 'defense', amount: 4, turnsRemaining: 6 }];

    expect(getDefensePower(player)).toBe(5);
  });

  it('ignores attack buffs when computing defense', () => {
    const player = makePlayer(1, 1, { defense: 1 });
    player.statusEffects = [{ kind: 'buff', stat: 'attack', amount: 3, turnsRemaining: 6 }];

    expect(getDefensePower(player)).toBe(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/equipment.test.ts`
Expected: 2 FAIL (`expected 5 to be 8`, `expected 1 to be 5`), 1 pass (the ignore case passes already; it is a guard).

- [ ] **Step 3: Implement**

In `src/systems/equipment.ts`, replace the two power functions:

```ts
/** Base attack plus equipment bonuses plus active attack buffs. */
export function getAttackPower(entity: Entity): number {
  return (entity.stats?.attack ?? 0) + getAttackBonus(entity) + sumBuffs(entity, 'attack');
}

/** Base defense plus equipment bonuses plus active defense buffs. */
export function getDefensePower(entity: Entity): number {
  return (entity.stats?.defense ?? 0) + getDefenseBonus(entity) + sumBuffs(entity, 'defense');
}

function sumBuffs(entity: Entity, stat: 'attack' | 'defense'): number {
  let total = 0;
  for (const effect of entity.statusEffects ?? []) {
    if (effect.kind === 'buff' && effect.stat === stat) {
      total += effect.amount;
    }
  }
  return total;
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 49 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/equipment.ts tests/equipment.test.ts
git commit -m "Fold active buffs into attack and defense totals" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Ability system

**Files:**
- Create: `src/systems/targeting.ts`
- Create: `src/systems/abilities.ts`
- Modify: `src/systems/inventory.ts` (scroll uses shared targeting)
- Modify: `tests/helpers.ts`
- Test: `tests/abilities.test.ts`

**Interfaces:**
- Consumes: `ABILITIES`, `AbilityDefinition`, `StatusEffect` (Task 1); `resolveCombat`, `killEntity` from `src/systems/combat.ts`.
- Produces:
  - `findNearestVisibleMonster(state: GameState, range: number): Entity | null`
  - `useAbility(state: GameState): boolean` — true if the ability fired (turn consumed)
  - `tickAbilities(state: GameState): void` — call once per end of turn
  - `isHidden(entity: Entity): boolean`
  - test helper `giveAbility(player: Entity, id: AbilityId): void`

- [ ] **Step 1: Add the test helper**

In `tests/helpers.ts`, change the types import to include `AbilityId`:

```ts
import { AbilityId, DungeonLevel, Entity, EquipSlot, GameState, Stats, Tile } from '../src/types';
```

And append before the final `export { resetEntityIds };` line:

```ts
/** Gives the player a ready-to-use ability and an empty status list. */
export function giveAbility(player: Entity, id: AbilityId): void {
  player.ability = { id, cooldownRemaining: 0 };
  player.statusEffects = [];
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/abilities.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tickAbilities, useAbility } from '../src/systems/abilities';
import { getAttackPower, getDefensePower } from '../src/systems/equipment';
import { giveAbility, makeDungeon, makeMonster, makePlayer, makeState } from './helpers';

describe('useAbility cooldown', () => {
  it('starts the cooldown when the ability fires', () => {
    const player = makePlayer(1, 1, { hp: 10, maxHp: 20 });
    giveAbility(player, 'mend');
    const state = makeState(player);

    expect(useAbility(state)).toBe(true);
    expect(player.ability!.cooldownRemaining).toBe(12);
  });

  it('refuses a second use while on cooldown and changes nothing', () => {
    const player = makePlayer(1, 1, { hp: 10, maxHp: 20 });
    giveAbility(player, 'mend');
    const state = makeState(player);
    useAbility(state);
    const hpAfterFirst = player.stats!.hp;

    expect(useAbility(state)).toBe(false);
    expect(player.stats!.hp).toBe(hpAfterFirst);
    expect(player.ability!.cooldownRemaining).toBe(12);
    expect(state.messages.at(-1)).toContain('not ready');
  });

  it('returns false when the player has no ability', () => {
    const state = makeState(makePlayer(1, 1));

    expect(useAbility(state)).toBe(false);
  });
});

describe('tickAbilities', () => {
  it('counts the cooldown down by one per tick and stops at zero', () => {
    const player = makePlayer(1, 1);
    giveAbility(player, 'rage');
    player.ability!.cooldownRemaining = 2;
    const state = makeState(player);

    tickAbilities(state);
    expect(player.ability!.cooldownRemaining).toBe(1);
    tickAbilities(state);
    expect(player.ability!.cooldownRemaining).toBe(0);
    tickAbilities(state);
    expect(player.ability!.cooldownRemaining).toBe(0);
  });
});

describe('Cleave', () => {
  it('attacks every adjacent monster and leaves distant ones alone', () => {
    const player = makePlayer(5, 5, { attack: 3 });
    giveAbility(player, 'cleave');
    const left = makeMonster(4, 5);
    const diagonal = makeMonster(6, 6);
    const far = makeMonster(7, 5);
    const state = makeState(player, [left, diagonal, far]);

    expect(useAbility(state)).toBe(true);
    expect(left.stats!.hp).toBe(2);
    expect(diagonal.stats!.hp).toBe(2);
    expect(far.stats!.hp).toBe(5);
  });

  it('refuses when no monster is adjacent', () => {
    const player = makePlayer(5, 5);
    giveAbility(player, 'cleave');
    const state = makeState(player, [makeMonster(8, 8)]);

    expect(useAbility(state)).toBe(false);
    expect(player.ability!.cooldownRemaining).toBe(0);
  });
});

describe('Arcane Bolt', () => {
  it('damages the nearest visible monster by base plus level', () => {
    const player = makePlayer(1, 1, { level: 2 });
    giveAbility(player, 'arcane-bolt');
    const near = makeMonster(3, 1, { hp: 20, maxHp: 20 });
    const farther = makeMonster(5, 1, { hp: 20, maxHp: 20 });
    const state = makeState(player, [near, farther]);

    expect(useAbility(state)).toBe(true);
    expect(near.stats!.hp).toBe(10);
    expect(farther.stats!.hp).toBe(20);
  });

  it('refuses when no monster is visible in range', () => {
    const player = makePlayer(1, 1);
    giveAbility(player, 'arcane-bolt');
    const state = makeState(player, [makeMonster(9, 9)]);

    expect(useAbility(state)).toBe(false);
    expect(player.ability!.cooldownRemaining).toBe(0);
  });

  it('kills and awards XP through the normal kill path', () => {
    const player = makePlayer(1, 1, { xpToNext: 4 });
    giveAbility(player, 'arcane-bolt');
    const state = makeState(player, [makeMonster(2, 1, { hp: 3, maxHp: 3 }, 4)]);

    useAbility(state);

    expect(state.entities.filter((e) => e.ai)).toHaveLength(0);
    expect(player.stats!.level).toBe(2);
  });
});

describe('buffs', () => {
  it('Rage raises attack power by 3 and expires after 6 ticks', () => {
    const player = makePlayer(1, 1, { attack: 5 });
    giveAbility(player, 'rage');
    const state = makeState(player);

    useAbility(state);
    expect(getAttackPower(player)).toBe(8);

    for (let i = 0; i < 5; i++) tickAbilities(state);
    expect(getAttackPower(player)).toBe(8);

    tickAbilities(state);
    expect(getAttackPower(player)).toBe(5);
    expect(player.statusEffects).toHaveLength(0);
  });

  it('Guard Stance raises defense power by 4', () => {
    const player = makePlayer(1, 1, { defense: 1 });
    giveAbility(player, 'guard-stance');
    const state = makeState(player);

    useAbility(state);

    expect(getDefensePower(player)).toBe(5);
  });

  it('re-using a buff refreshes it instead of stacking', () => {
    const player = makePlayer(1, 1, { attack: 5 });
    giveAbility(player, 'rage');
    const state = makeState(player);
    useAbility(state);
    tickAbilities(state);
    tickAbilities(state);
    player.ability!.cooldownRemaining = 0;

    useAbility(state);

    expect(getAttackPower(player)).toBe(8);
    expect(player.statusEffects).toEqual([
      { kind: 'buff', stat: 'attack', amount: 3, turnsRemaining: 6 },
    ]);
  });
});

describe('Vanish', () => {
  it('adds a stealth effect that expires after 5 ticks', () => {
    const player = makePlayer(1, 1);
    giveAbility(player, 'vanish');
    const state = makeState(player);

    useAbility(state);
    expect(player.statusEffects).toEqual([{ kind: 'stealth', turnsRemaining: 5 }]);

    for (let i = 0; i < 5; i++) tickAbilities(state);
    expect(player.statusEffects).toHaveLength(0);
  });
});

describe('Survey', () => {
  it('marks tiles within the radius explored and leaves farther tiles alone', () => {
    const player = makePlayer(5, 5);
    giveAbility(player, 'survey');
    const state = makeState(player);
    state.dungeon = makeDungeon(40, 40);
    for (const row of state.dungeon.explored) row.fill(false);

    expect(useAbility(state)).toBe(true);
    expect(state.dungeon.explored[5][17]).toBe(true);
    expect(state.dungeon.explored[17][17]).toBe(true);
    expect(state.dungeon.explored[5][18]).toBe(false);
  });
});

describe('Mend', () => {
  it('heals 30% of max HP', () => {
    const player = makePlayer(1, 1, { hp: 5, maxHp: 30 });
    giveAbility(player, 'mend');
    const state = makeState(player);

    useAbility(state);

    expect(player.stats!.hp).toBe(14);
  });

  it('does not heal past max HP', () => {
    const player = makePlayer(1, 1, { hp: 28, maxHp: 30 });
    giveAbility(player, 'mend');
    const state = makeState(player);

    useAbility(state);

    expect(player.stats!.hp).toBe(30);
  });

  it('refuses at full health', () => {
    const player = makePlayer(1, 1, { hp: 30, maxHp: 30 });
    giveAbility(player, 'mend');
    const state = makeState(player);

    expect(useAbility(state)).toBe(false);
    expect(player.ability!.cooldownRemaining).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/abilities.test.ts`
Expected: FAIL with `Cannot find module '../src/systems/abilities'`

- [ ] **Step 4: Create the shared targeting helper**

Create `src/systems/targeting.ts`:

```ts
import { Entity, GameState } from '../types';

/**
 * The nearest living monster the player can currently see within
 * `range` tiles (Manhattan distance), or null if there is none.
 */
export function findNearestVisibleMonster(state: GameState, range: number): Entity | null {
  const pos = state.player.position!;
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const e of state.entities) {
    if (!e.ai || !e.position || !e.stats || e.stats.hp <= 0) continue;
    if (!state.dungeon.visible[e.position.y]?.[e.position.x]) continue;

    const dist = Math.abs(e.position.x - pos.x) + Math.abs(e.position.y - pos.y);
    if (dist <= range && dist < nearestDist) {
      nearest = e;
      nearestDist = dist;
    }
  }

  return nearest;
}
```

- [ ] **Step 5: Make the scroll use the shared helper**

In `src/systems/inventory.ts`, add the import:

```ts
import { findNearestVisibleMonster } from './targeting';
```

Then replace the `case 'damage':` block inside `applyEffect` with:

```ts
    case 'damage': {
      const nearest = findNearestVisibleMonster(state, effect.range);

      if (nearest && nearest.stats) {
        nearest.stats.hp -= effect.amount;
        state.messages.push(
          `${name} strikes ${nearest.appearance?.name ?? 'enemy'} for ${effect.amount} damage!`
        );
        if (nearest.stats.hp <= 0) {
          killEntity(state, nearest, state.player);
        }
      } else {
        state.messages.push(`${name} fizzles... no target in range.`);
      }
      break;
    }
```

(The removed code declared `pos`, `nearest`, `nearestDist` and looped over entities; that logic now lives in the helper.)

- [ ] **Step 6: Create the ability system**

Create `src/systems/abilities.ts`:

```ts
import { Entity, GameState, StatusEffect } from '../types';
import { ABILITIES, AbilityDefinition } from '../data/abilities';
import { killEntity, resolveCombat } from './combat';
import { findNearestVisibleMonster } from './targeting';

/**
 * Fires the player's class ability. Returns true if it took effect (the
 * turn is consumed). Returns false, with a message, if the ability is on
 * cooldown or has no valid target; no turn is consumed in that case.
 */
export function useAbility(state: GameState): boolean {
  const ability = state.player.ability;
  if (!ability) return false;

  const def = ABILITIES[ability.id];
  if (ability.cooldownRemaining > 0) {
    state.messages.push(`${def.name} is not ready (${ability.cooldownRemaining} turns).`);
    return false;
  }

  if (!applyAbility(state, def)) return false;

  ability.cooldownRemaining = def.cooldown;
  return true;
}

/** Call once per end of turn: counts down the cooldown and expires status effects. */
export function tickAbilities(state: GameState): void {
  const player = state.player;

  if (player.ability && player.ability.cooldownRemaining > 0) {
    player.ability.cooldownRemaining--;
  }

  if (!player.statusEffects) return;
  const remaining: StatusEffect[] = [];
  for (const effect of player.statusEffects) {
    effect.turnsRemaining--;
    if (effect.turnsRemaining > 0) {
      remaining.push(effect);
    } else {
      state.messages.push(fadeMessage(effect));
    }
  }
  player.statusEffects = remaining;
}

/** True while the entity has an active stealth effect. */
export function isHidden(entity: Entity): boolean {
  return (entity.statusEffects ?? []).some((e) => e.kind === 'stealth');
}

function fadeMessage(effect: StatusEffect): string {
  if (effect.kind === 'stealth') return 'You are visible again.';
  return effect.stat === 'attack' ? 'Your rage fades.' : 'Your guard relaxes.';
}

function applyAbility(state: GameState, def: AbilityDefinition): boolean {
  const effect = def.effect;
  switch (effect.type) {
    case 'cleave':
      return applyCleave(state, def.name);
    case 'bolt': {
      const level = state.player.stats?.level ?? 1;
      return applyBolt(state, def.name, effect.base + effect.perLevel * level, effect.range);
    }
    case 'buff':
      return applyBuff(state, def.name, effect.stat, effect.amount, effect.turns);
    case 'stealth':
      return applyStealth(state, def.name, effect.turns);
    case 'reveal':
      return applyReveal(state, def.name, effect.radius);
    case 'heal':
      return applyHeal(state, def.name, effect.fraction);
  }
}

function applyCleave(state: GameState, name: string): boolean {
  const pos = state.player.position!;
  const targets = state.entities.filter(
    (e) =>
      e.ai && e.stats && e.stats.hp > 0 && e.position &&
      Math.abs(e.position.x - pos.x) <= 1 &&
      Math.abs(e.position.y - pos.y) <= 1
  );
  if (targets.length === 0) {
    state.messages.push('No enemies adjacent.');
    return false;
  }

  state.messages.push(`You unleash ${name}!`);
  // Iterate a copy: resolveCombat removes slain monsters from state.entities.
  for (const target of targets) {
    resolveCombat(state, state.player, target);
  }
  return true;
}

function applyBolt(state: GameState, name: string, damage: number, range: number): boolean {
  const target = findNearestVisibleMonster(state, range);
  if (!target || !target.stats) {
    state.messages.push('No target in range.');
    return false;
  }

  target.stats.hp -= damage;
  state.messages.push(`${name} strikes ${target.appearance?.name ?? 'enemy'} for ${damage} damage!`);
  if (target.stats.hp <= 0) {
    killEntity(state, target, state.player);
  }
  return true;
}

function applyBuff(
  state: GameState,
  name: string,
  stat: 'attack' | 'defense',
  amount: number,
  turns: number
): boolean {
  const effects = (state.player.statusEffects ??= []);
  const buff: StatusEffect = { kind: 'buff', stat, amount, turnsRemaining: turns };
  const existing = effects.findIndex((e) => e.kind === 'buff' && e.stat === stat);
  if (existing >= 0) {
    effects[existing] = buff;
  } else {
    effects.push(buff);
  }
  const label = stat === 'attack' ? 'ATK' : 'DEF';
  state.messages.push(`You use ${name}! ${label} +${amount} for ${turns} turns.`);
  return true;
}

function applyStealth(state: GameState, name: string, turns: number): boolean {
  const effects = (state.player.statusEffects ??= []);
  const stealth: StatusEffect = { kind: 'stealth', turnsRemaining: turns };
  const existing = effects.findIndex((e) => e.kind === 'stealth');
  if (existing >= 0) {
    effects[existing] = stealth;
  } else {
    effects.push(stealth);
  }
  state.messages.push(`You use ${name}. The monsters lose sight of you.`);
  return true;
}

function applyReveal(state: GameState, name: string, radius: number): boolean {
  const pos = state.player.position!;
  const { explored, width, height } = state.dungeon;
  const minY = Math.max(0, pos.y - radius);
  const maxY = Math.min(height - 1, pos.y + radius);
  const minX = Math.max(0, pos.x - radius);
  const maxX = Math.min(width - 1, pos.x + radius);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      explored[y][x] = true;
    }
  }
  state.messages.push(`You use ${name}. The layout comes into focus.`);
  return true;
}

function applyHeal(state: GameState, name: string, fraction: number): boolean {
  const stats = state.player.stats!;
  const amount = Math.max(1, Math.floor(stats.maxHp * fraction));
  const healed = Math.min(amount, stats.maxHp - stats.hp);
  if (healed <= 0) {
    state.messages.push('You are already at full health.');
    return false;
  }
  stats.hp += healed;
  state.messages.push(`You use ${name}. Healed ${healed} HP.`);
  return true;
}
```

- [ ] **Step 7: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 66 tests pass (49 + 17), no type errors. The existing inventory scroll tests still pass against the shared helper.

- [ ] **Step 8: Commit**

```bash
git add src/systems/targeting.ts src/systems/abilities.ts src/systems/inventory.ts tests/helpers.ts tests/abilities.test.ts
git commit -m "Add ability system with cooldowns, buffs, stealth, reveal, and heal" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Stealth hides the player from monsters

**Files:**
- Modify: `src/systems/ai.ts`
- Test: `tests/ai.test.ts`

**Interfaces:**
- Consumes: `isHidden` from Task 3.

- [ ] **Step 1: Write the failing test**

Create `tests/ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runAI } from '../src/systems/ai';
import { makeMonster, makePlayer, makeState } from './helpers';

describe('runAI', () => {
  it('lets an adjacent chase monster attack a visible player', () => {
    const player = makePlayer(1, 1, { defense: 0 });
    const monster = makeMonster(2, 1, { attack: 3 });
    const state = makeState(player, [monster]);

    runAI(state);

    expect(player.stats!.hp).toBe(17);
  });

  it('leaves an adjacent chase monster idle while the player is hidden', () => {
    const player = makePlayer(1, 1, { defense: 0 });
    player.statusEffects = [{ kind: 'stealth', turnsRemaining: 5 }];
    const monster = makeMonster(2, 1, { attack: 3 });
    const state = makeState(player, [monster]);

    runAI(state);

    expect(player.stats!.hp).toBe(20);
    expect(monster.position).toEqual({ x: 2, y: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai.test.ts`
Expected: first test passes (guard), second FAILS with `expected 17 to be 20`.

- [ ] **Step 3: Implement**

In `src/systems/ai.ts`, add the import:

```ts
import { isHidden } from './abilities';
```

Then in `runAI`, replace the `canSeePlayer` computation with:

```ts
    // Check if player is within alert range, visible, and not hidden
    const canSeePlayer = !isHidden(state.player) &&
      dist <= entity.ai.alertRange &&
      state.dungeon.visible[entity.position.y]?.[entity.position.x];
```

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 68 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/ai.ts tests/ai.test.ts
git commit -m "Monsters cannot see a hidden player" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Input and game loop wiring

**Files:**
- Modify: `src/systems/input.ts`
- Modify: `src/game.ts`
- Test: `tests/input.test.ts`, `tests/game.test.ts`

**Interfaces:**
- Consumes: `useAbility`, `tickAbilities` (Task 3); `CharacterTemplate.ability` (Task 1); `Action { type: 'ability' }` (Task 1).

- [ ] **Step 1: Write the failing tests**

Append to `tests/input.test.ts` inside `describe('keyToAction', ...)`:

```ts
  it.each(['q', 'Q'])('maps %s to the ability action in game mode', (key) => {
    expect(keyToAction(key, 'game')).toEqual({ type: 'ability' });
  });

  it('does not fire the ability from the inventory screen', () => {
    expect(keyToAction('q', 'inventory')).toBeNull();
  });
```

Append to `tests/game.test.ts` inside `describe('Game.tick', ...)`:

```ts
  it('gives the chosen hero their class ability with no cooldown', () => {
    expect(game.state.player.ability).toEqual({ id: 'cleave', cooldownRemaining: 0 });
    expect(game.state.player.statusEffects).toEqual([]);
  });

  it('does not spend a turn when the ability refuses', () => {
    // The Human Warrior starts alone in the first room, so Cleave has no target.
    game.tick({ type: 'ability' });

    expect(game.state.turn).toBe(0);
    expect(game.state.player.ability!.cooldownRemaining).toBe(0);
  });

  it('counts the ability cooldown down at the end of each turn', () => {
    game.state.player.ability!.cooldownRemaining = 3;

    game.tick({ type: 'wait' });

    expect(game.state.player.ability!.cooldownRemaining).toBe(2);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/input.test.ts tests/game.test.ts`
Expected: the two `q`/`Q` cases FAIL (`expected null to deeply equal { type: 'ability' }`), the inventory guard passes; in game tests, the hero-ability test FAILS (`expected undefined to deeply equal ...`), the refuse test passes trivially, and the cooldown test FAILS (`Cannot read properties of undefined`).

- [ ] **Step 3: Map the key**

In `src/systems/input.ts`, in the game-mode `switch (key)`, add before `case '>':`:

```ts
    case 'q':
    case 'Q':
      return { type: 'ability' };
```

- [ ] **Step 4: Wire the game**

In `src/game.ts`, add the import after the inventory import:

```ts
import { tickAbilities, useAbility } from './systems/abilities';
```

In `startGameWithCharacter`, add two fields to the `createEntity({...})` call after `equipment: createEmptyEquipment(),`:

```ts
      ability: { id: template.ability, cooldownRemaining: 0 },
      statusEffects: [],
```

In `tick`, add after the `pickup` block and before the `descend` block:

```ts
    if (action.type === 'ability') {
      if (useAbility(this.state)) {
        this.endTurn();
      } else {
        this.draw();
      }
      return;
    }
```

In `endTurn`, add directly after `runAI(this.state);`:

```ts
    tickAbilities(this.state);
```

- [ ] **Step 5: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 74 tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/systems/input.ts src/game.ts tests/input.test.ts tests/game.test.ts
git commit -m "Wire the Q key and turn loop to class abilities" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: HUD, character select, controls text, and docs

**Files:**
- Modify: `src/render/hud.ts`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `ABILITIES` (Task 1), `Entity.ability`, `Entity.statusEffects`.

No unit tests: canvas drawing is verified in the browser. The existing renderer test exercises `drawHud` with a stub context and must still pass.

- [ ] **Step 1: Show the ability in the bottom HUD**

In `src/render/hud.ts`, add the import:

```ts
import { ABILITIES } from '../data/abilities';
```

In `drawHud`, directly after the line that draws `Gold:`, add:

```ts
  // Ability status and active effects, e.g. "[Q] Rage: READY  RAGE 4"
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
    ctx.fillText(`[Q] ${def.name}: ${status}`, statsX + 300, barY + 24);
    if (effects.length > 0) {
      ctx.fillStyle = '#ff88ff';
      const prefixW = ctx.measureText(`[Q] ${def.name}: ${status}  `).width;
      ctx.fillText(effects.join('  '), statsX + 300 + prefixW, barY + 24);
    }
  }
```

- [ ] **Step 2: Show the ability on character select**

In `drawCharSelect`, change the detail panel height from 80 to 100 in both the `fillRect` and `strokeRect` calls:

```ts
  ctx.fillRect(startX, detailY, gridW, 100);
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, detailY, gridW, 100);
```

Replace the stats line and controls line at the end of `drawCharSelect` with:

```ts
  ctx.fillStyle = COLORS.text;
  ctx.font = '13px monospace';
  const statsText = `HP: ${selected.stats.hp}  ATK: ${selected.stats.attack}  DEF: ${selected.stats.defense}`;
  ctx.fillText(statsText, CANVAS_W / 2, detailY + 40);

  const ability = ABILITIES[selected.ability];
  ctx.fillStyle = '#ff88ff';
  ctx.font = '12px monospace';
  ctx.fillText(`[Q] ${ability.name}: ${ability.description} (${ability.cooldown} turn cooldown)`, CANVAS_W / 2, detailY + 60);

  // Controls
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px monospace';
  ctx.fillText('[Arrow Keys] Select   [Enter] Start', CANVAS_W / 2, detailY + 84);
```

- [ ] **Step 3: Update the page footer**

In `index.html`, change the controls line to:

```html
        WASD/Arrows: Move | G: Pickup | I: Inventory | Q: Ability | >: Descend | .: Wait
```

- [ ] **Step 4: Update the README**

In the Features list, after the Equipment system bullet, add:

```markdown
- **Class abilities** — Every class has a signature ability on a turn cooldown, fired with Q
```

In the Controls table, after the `I` row, add:

```markdown
| Q | Use class ability |
```

After the Controls table and before `### Tips`, add:

```markdown
### Class Abilities

Each class has one ability. Press **Q** to use it; the HUD shows when it is ready.

| Class | Ability | Effect | Cooldown |
|-------|---------|--------|----------|
| Warrior | Cleave | Strike every adjacent enemy with a normal attack | 10 turns |
| Barbarian | Rage | +3 ATK for 6 turns | 15 turns |
| Mage | Arcane Bolt | 8 + level damage to the nearest enemy in sight (range 6) | 6 turns |
| Rogue | Vanish | Monsters lose sight of you for 5 turns | 15 turns |
| Scout | Survey | Reveals the map layout within 12 tiles | 30 turns |
| Sentinel | Guard Stance | +4 DEF for 6 turns | 15 turns |
| Healer | Mend | Heal 30% of max HP | 12 turns |

Abilities that find no target (Cleave with nothing adjacent, Arcane Bolt with nothing in sight, Mend at full health) do not fire and do not cost a turn. Using Rage or Guard Stance again while active refreshes the duration rather than stacking.
```

In the Tips list, add:

```markdown
- Your class ability is often the difference in a tough fight; Rogues can Vanish to slip past a room, Scouts can Survey to find the stairs
```

In the Project Structure block, change the `data/` and `systems/` lines to:

```
  data/         Character, monster, item, and ability definitions
  systems/      Input, movement, combat, AI, FOV, inventory, equipment, abilities, targeting, scoring
```

- [ ] **Step 5: Run tests, type check, and build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 74 tests pass, no type errors, build succeeds.

- [ ] **Step 6: Verify in the browser**

Start the dev server (`.claude/launch.json` config `dev`). On the character select screen, arrow to each class and confirm the magenta ability line appears under the stats. Press Enter as the Human Warrior, then Q with no enemy adjacent: the log says "No enemies adjacent." and the Turn counter stays at 0. Pick a fight and press Q next to a monster: the log shows "You unleash Cleave!" and the HUD shows "[Q] Cleave: 10 turns" counting down. Check the console for errors.

- [ ] **Step 7: Commit**

```bash
git add src/render/hud.ts index.html README.md
git commit -m "Show class abilities in the HUD, character select, and docs" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Abilities table → Task 1 data. Data model → Task 1. `useAbility`/`tickAbilities` → Task 3. Equipment buffs → Task 2. AI stealth → Task 4. `game.ts` wiring and input → Task 5. HUD, character select, footer, README → Task 6. Tests 1–11 → Task 3 (plus Task 4 for test 9); tests 12–13 → Task 5. All spec sections have a task.

**Placeholders.** None; every code step carries full code.

**Type consistency.** `AbilityId` is defined in `src/types.ts` and imported by `src/data/abilities.ts` and `src/data/characters.ts` (Task 1), by `tests/helpers.ts` (Task 3). `useAbility(state): boolean` and `tickAbilities(state): void` are named identically in Tasks 3, 5. `isHidden(entity)` in Tasks 3, 4. `findNearestVisibleMonster(state, range)` in Task 3 only. `giveAbility(player, id)` in Task 3 helpers and tests.
