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
