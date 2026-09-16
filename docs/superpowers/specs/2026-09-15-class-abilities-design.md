# Class Abilities — Design

**Date:** 2026-09-15
**Status:** Approved in discussion; spec for implementation planning.

## Goal

Give each of the seven playable classes one active ability so heroes differ in play, not only in starting numbers. Abilities are limited by a per-ability turn cooldown and fire with a single keypress. Ranged abilities auto-target the nearest visible enemy, matching the existing Scroll of Lightning behaviour.

## Non-goals

- No mana or other new resource stat.
- No targeting cursor or new UI mode.
- No passive traits.
- No changes to item numbers or monster stats. Balance is tuned after playtesting.
- No unequip, save/resume, or other unrelated features.

## Abilities

| Class | Ability | Effect | Cooldown (turns) |
|---|---|---|---|
| Warrior | Cleave | Deal a normal melee attack to every adjacent enemy (8 neighbours) | 10 |
| Barbarian | Rage | +3 attack for 6 turns | 15 |
| Mage | Arcane Bolt | 8 + player level damage to the nearest visible enemy within 6 tiles (Manhattan) | 6 |
| Rogue | Vanish | Monsters cannot see the player for 5 turns | 15 |
| Scout | Survey | Mark every tile within 12 tiles (Chebyshev) as explored | 30 |
| Sentinel | Guard Stance | +4 defense for 6 turns | 15 |
| Healer | Mend | Restore 30% of max HP (rounded down, at least 1), capped at max | 12 |

Male and female variants of a class share one ability. Cleave uses normal combat resolution per neighbour (attack minus defense, minimum 1), so it scales with weapon bonuses. Arcane Bolt deals its flat amount directly and ignores defense, like the Scroll of Lightning.

## Data model

### `src/data/abilities.ts` (new)

```ts
export type AbilityId =
  | 'cleave' | 'rage' | 'arcane-bolt' | 'vanish' | 'survey' | 'guard-stance' | 'mend';

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
  description: string;   // one line, shown on character select
  cooldown: number;
  effect: AbilityEffect;
}

export const ABILITIES: Record<AbilityId, AbilityDefinition>;
```

### `src/data/characters.ts`

`CharacterTemplate` gains `ability: AbilityId`. Mapping by class: Warrior → cleave, Barbarian → rage, Mage → arcane-bolt, Rogue → vanish, Scout → survey, Sentinel → guard-stance, Healer → mend.

### `src/types.ts`

```ts
export interface AbilityComponent {
  id: AbilityId;
  cooldownRemaining: number;   // 0 = ready
}

export type StatusEffect =
  | { kind: 'buff'; stat: 'attack' | 'defense'; amount: number; turnsRemaining: number }
  | { kind: 'stealth'; turnsRemaining: number };

// Entity gains:
//   ability?: AbilityComponent;
//   statusEffects?: StatusEffect[];
// Action gains:
//   | { type: 'ability' }
```

Both new components are plain data with no entity references, so they remain JSON-serialisable.

## Systems

### `src/systems/abilities.ts` (new)

`useAbility(state): boolean`

1. If the player has no ability component, return false.
2. If `cooldownRemaining > 0`, push `"<Name> is not ready (N turns)."` and return false. No turn is spent.
3. Apply the effect:
   - **cleave** — for each of the 8 neighbouring tiles, if a monster (entity with `ai` and `stats`) is there, call `resolveCombat(state, player, monster)`. If no neighbour is a monster, push `"No enemies adjacent."` and return false.
   - **bolt** — find the nearest visible monster within `range` (same search as the Scroll of Lightning's damage effect). If none, push `"No target in range."` and return false. Otherwise subtract `base + perLevel * level` HP, push a message, and call `killEntity` if HP is 0 or less.
   - **buff** — push a `buff` status effect. If a buff on the same stat is already active, replace it (refresh duration and amount) rather than stacking.
   - **stealth** — push a `stealth` status effect, replacing any existing one.
   - **reveal** — set `explored[y][x] = true` for every in-bounds tile with `max(|dx|,|dy|) <= radius`.
   - **heal** — `healed = min(max(1, floor(maxHp * fraction)), maxHp - hp)`. If `healed == 0`, push `"You are already at full health."` and return false.
4. Set `cooldownRemaining = definition.cooldown`, push a use message, return true.

`tickAbilities(state): void` — called once per end of turn, after AI runs:

- Decrement `cooldownRemaining` toward 0.
- Decrement every status effect's `turnsRemaining`; remove those reaching 0 and push a fade message (`"Your rage fades."`, `"You are visible again."`, and so on).

### `src/systems/equipment.ts`

`getAttackPower` and `getDefensePower` add the sum of active `buff` amounts for the matching stat. Combat, the HUD, and the inventory screen therefore see buffs with no further change.

### `src/systems/ai.ts`

`canSeePlayer` is false while the player has a `stealth` status effect. Wandering monsters keep wandering; chasing monsters wait.

### `src/systems/combat.ts`

No changes. Cleave uses `resolveCombat`; bolt uses `killEntity`.

### `src/game.ts`

- Player creation sets `ability: { id: template.ability, cooldownRemaining: 0 }` and `statusEffects: []`.
- `tick` handles `{ type: 'ability' }`: call `useAbility`; end the turn only if it returned true, otherwise redraw.
- `endTurn` calls `tickAbilities(state)` after `runAI` and before the death check.

### `src/systems/input.ts`

In game mode, `q` and `Q` map to `{ type: 'ability' }`.

## UI

### Bottom HUD (`drawHud`)

A new line on the right of the stats block: `[Q] <Ability name>: READY` in bright text, or `[Q] <Ability name>: 4 turns` in dim text. Active status effects append after it, e.g. `RAGE 4` or `HIDDEN 3`, in an accent colour.

### Character select (`drawCharSelect`)

The detail panel gains one line showing `<Ability name>: <description>` under the stats line. Panel height increases from 80 to 100px; the canvas has room.

### Page footer (`index.html`) and README

Add `Q: Ability` to the controls line and the README controls table. The README features list gains a "Class abilities" bullet and the ability table above.

## Testing (Vitest, `tests/abilities.test.ts`)

Each written to fail before implementation:

1. Using an ability starts its cooldown; a second use while on cooldown returns false and leaves state unchanged.
2. Cooldown ticks down by one per `tickAbilities` call and stops at 0.
3. Cleave damages two adjacent monsters and does not touch a monster two tiles away.
4. Cleave with no adjacent monster returns false.
5. Arcane Bolt damages the nearest visible monster within range by `base + perLevel * level`.
6. Arcane Bolt with no visible target returns false.
7. Rage raises `getAttackPower` by 3 while active and the bonus disappears after 6 ticks.
8. Guard Stance raises `getDefensePower` by 4.
9. Vanish makes `runAI` leave an adjacent chase monster in place with the player's HP unchanged.
10. Survey marks tiles within radius explored and leaves tiles beyond it untouched.
11. Mend heals 30% of max HP and does not exceed max; at full HP it returns false.
12. `keyToAction('q', 'game')` yields the ability action.
13. `Game.tick` with the ability action does not spend a turn when the ability refuses.

All 43 existing tests must stay green.

## Files

**New:** `src/data/abilities.ts`, `src/systems/abilities.ts`, `tests/abilities.test.ts`.

**Changed:** `src/types.ts`, `src/data/characters.ts`, `src/systems/input.ts`, `src/systems/equipment.ts`, `src/systems/ai.ts`, `src/game.ts`, `src/render/hud.ts`, `index.html`, `README.md`, `tests/helpers.ts` (player factory gains ability and status fields).

## Balance notes (for the later tuning pass)

- Arcane Bolt at level 1 deals 9: one-shots everything through depth 3, two or three hits deeper.
- Rage +3 is roughly a two-tier weapon jump; Guard Stance +4 is roughly one body-armor tier.
- Cleave scales with weapon bonuses automatically because it uses normal combat.
- Survey's 30-turn cooldown means roughly one use per floor in practice.
