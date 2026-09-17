import { describe, it, expect } from 'vitest';
import { contrastRatio, describeState, newMessages } from '../src/ui/a11y';
import { COLORS, BOSS_DEPTH } from '../src/constants';
import { giveAbility, makePlayer, makeState } from './helpers';

const heroScreen = { selectedName: 'Human Mage', dailyDate: null, sharedCode: null, hasSave: false };

describe('describeState', () => {
  it('describes the hero screen with the selected hero', () => {
    const state = makeState(makePlayer(1, 1));
    state.uiMode = 'charselect';

    expect(describeState(state, heroScreen)).toBe('Choose your hero. Selected: Human Mage.');
  });

  it('mentions the daily, a shared run, and a saved run on the hero screen', () => {
    const state = makeState(makePlayer(1, 1));
    state.uiMode = 'charselect';

    const text = describeState(state, {
      selectedName: 'Human Scout',
      dailyDate: '2026-09-16',
      sharedCode: '93ci-7',
      hasSave: true,
    });

    expect(text).toContain('Daily challenge for 2026-09-16');
    expect(text).toContain('Shared run 93ci-7');
    expect(text).toContain('A saved run can be continued');
  });

  it('summarises the map view with hero, depth, health, turn, and ability', () => {
    const player = makePlayer(1, 1, { hp: 20, maxHp: 35 });
    player.appearance!.name = 'Human Mage';
    giveAbility(player, 'arcane-bolt');
    const state = makeState(player);
    state.depth = 3;
    state.turn = 122;

    expect(describeState(state, heroScreen)).toBe(
      'Human Mage on depth 3. HP 20 of 35. Turn 122. Arcane Bolt ready.'
    );

    player.ability!.cooldownRemaining = 4;
    expect(describeState(state, heroScreen)).toContain('Arcane Bolt ready in 4 turns.');
  });

  it('calls the boss depth the final floor', () => {
    const state = makeState(makePlayer(1, 1));
    state.depth = BOSS_DEPTH;

    expect(describeState(state, heroScreen)).toContain(`depth ${BOSS_DEPTH}, the final floor`);
  });

  it('describes the inventory, the log, and both endings', () => {
    const state = makeState(makePlayer(1, 1));
    state.player.inventory!.items.push({ id: 99 }, { id: 100 }, { id: 101 });
    state.messages = ['a', 'b'];

    state.uiMode = 'inventory';
    expect(describeState(state, heroScreen)).toBe('Inventory open. 3 items carried.');

    state.uiMode = 'log';
    expect(describeState(state, heroScreen)).toBe('Message log open. 2 messages.');

    state.uiMode = 'gameover';
    state.score = 300;
    state.depth = 4;
    expect(describeState(state, heroScreen)).toBe('Game over. Score 300 on depth 4.');

    state.won = true;
    state.score = 1200;
    expect(describeState(state, heroScreen)).toBe('Victory! Score 1200.');
  });
});

describe('newMessages', () => {
  it('returns only the lines added since the last announcement', () => {
    expect(newMessages(2, ['a', 'b', 'c', 'd'])).toEqual(['c', 'd']);
    expect(newMessages(4, ['a', 'b', 'c', 'd'])).toEqual([]);
  });

  it('still announces the newest line after the history was trimmed', () => {
    expect(newMessages(201, ['x', 'y', 'z'])).toEqual(['z']);
  });
});

describe('palette contrast', () => {
  it('measures known pairs correctly', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('keeps dim text readable on the HUD and the page background', () => {
    expect(contrastRatio(COLORS.textDim, '#111122')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.textDim, COLORS.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps body text and accents readable on the HUD', () => {
    for (const fg of [COLORS.text, COLORS.textBright, COLORS.stairs, '#ffd700', '#ff88ff']) {
      expect(contrastRatio(fg, '#111122'), fg).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps borders distinguishable from the page', () => {
    expect(contrastRatio(COLORS.inventoryBorder, COLORS.bg)).toBeGreaterThanOrEqual(3);
  });
});
