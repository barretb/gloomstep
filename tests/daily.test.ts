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
import { Game } from '../src/game';
import { drawCharSelect, drawGameOver } from '../src/render/hud';
import { makeCtx, makePlayer, makeState } from './helpers';

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
