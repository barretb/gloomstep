import { describe, it, expect } from 'vitest';
import { keyToAction } from '../src/systems/input';
import { Game } from '../src/game';
import { drawMessageLog, LOG_CAPACITY, LOG_PAGE, logVisibleLines } from '../src/render/log';
import { canvasHeightFor, COMPACT_LAYOUT, DESKTOP_LAYOUT } from '../src/render/layout';
import { controlBarVisible, parseControlAction } from '../src/ui/touch-controls';
import { createMemoryStorage } from '../src/systems/persistence';
import { makeCtx, makePlayer, makeState } from './helpers';

function startGame(): Game {
  const { ctx } = makeCtx();
  const game = new Game(ctx, new Map(), createMemoryStorage());
  game.handleCharSelectInput('Enter');
  return game;
}

describe('keyToAction for the message log', () => {
  it.each(['l', 'L'])('opens the log with %s during play', (key) => {
    expect(keyToAction(key, 'game')).toEqual({ type: 'toggleLog' });
  });

  it.each(['l', 'L', 'Escape'])('closes the log with %s', (key) => {
    expect(keyToAction(key, 'log')).toEqual({ type: 'toggleLog' });
  });

  it.each([
    ['ArrowUp', 1],
    ['w', 1],
    ['ArrowDown', -1],
    ['s', -1],
    ['PageUp', LOG_PAGE],
    ['PageDown', -LOG_PAGE],
    ['Home', Infinity],
    ['End', -Infinity],
  ])('maps %s to a scroll of %d lines toward older', (key, by) => {
    expect(keyToAction(key, 'log')).toEqual({ type: 'scrollLog', by });
  });

  it('ignores other keys in the log', () => {
    expect(keyToAction('g', 'log')).toBeNull();
    expect(keyToAction('1', 'log')).toBeNull();
  });
});

describe('Game and the message log', () => {
  it('toggles the log without spending a turn', () => {
    const game = startGame();

    game.tick({ type: 'toggleLog' });
    expect(game.state.uiMode).toBe('log');
    expect(game.state.turn).toBe(0);

    game.tick({ type: 'toggleLog' });
    expect(game.state.uiMode).toBe('game');
    expect(game.state.turn).toBe(0);
  });

  it('clamps scrolling between newest and oldest', () => {
    const game = startGame();
    game.state.messages = Array.from({ length: 40 }, (_, i) => `message ${i}`);
    const visible = logVisibleLines(DESKTOP_LAYOUT);
    game.tick({ type: 'toggleLog' });

    game.tick({ type: 'scrollLog', by: 1000 });
    expect(game.logScroll).toBe(40 - visible);

    game.tick({ type: 'scrollLog', by: -1000 });
    expect(game.logScroll).toBe(0);

    game.tick({ type: 'scrollLog', by: 3 });
    expect(game.logScroll).toBe(3);
  });

  it('opens at the newest messages every time', () => {
    const game = startGame();
    game.state.messages = Array.from({ length: 40 }, (_, i) => `message ${i}`);
    game.tick({ type: 'toggleLog' });
    game.tick({ type: 'scrollLog', by: 5 });
    game.tick({ type: 'toggleLog' });

    game.tick({ type: 'toggleLog' });

    expect(game.logScroll).toBe(0);
  });

  it('scrolls instead of moving the hero when the d-pad is used in the log', () => {
    const game = startGame();
    game.state.messages = Array.from({ length: 40 }, (_, i) => `message ${i}`);
    const pos = { ...game.state.player.position! };
    game.tick({ type: 'toggleLog' });

    game.tick({ type: 'move', dx: 0, dy: -1 });

    expect(game.logScroll).toBe(1);
    expect(game.state.player.position).toEqual(pos);
    expect(game.state.turn).toBe(0);
  });

  it('keeps at most LOG_CAPACITY messages', () => {
    const game = startGame();
    game.state.messages = Array.from({ length: LOG_CAPACITY + 50 }, (_, i) => `message ${i}`);

    game.tick({ type: 'wait' });

    expect(game.state.messages.length).toBeLessThanOrEqual(LOG_CAPACITY);
    expect(game.state.messages.at(-1)).toBe(`message ${LOG_CAPACITY + 49}`);
  });
});

describe('drawMessageLog', () => {
  function texts(calls: { name: string; args: unknown[] }[]): string[] {
    return calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
  }

  it('shows the newest lines at scroll zero', () => {
    const state = makeState(makePlayer(1, 1));
    state.messages = Array.from({ length: 40 }, (_, i) => `message ${i}`);
    const { ctx, calls } = makeCtx();

    drawMessageLog(ctx, state, 0);

    const drawn = texts(calls);
    expect(drawn).toContain('message 39');
    expect(drawn).not.toContain('message 0');
  });

  it('shows the oldest line when scrolled all the way back', () => {
    const state = makeState(makePlayer(1, 1));
    state.messages = Array.from({ length: 40 }, (_, i) => `message ${i}`);
    const { ctx, calls } = makeCtx();

    drawMessageLog(ctx, state, 40 - logVisibleLines(DESKTOP_LAYOUT));

    const drawn = texts(calls);
    expect(drawn).toContain('message 0');
    expect(drawn).not.toContain('message 39');
  });

  it('returns close and scroll regions', () => {
    const state = makeState(makePlayer(1, 1));
    const { ctx } = makeCtx();

    const regions = drawMessageLog(ctx, state, 0);

    expect(regions[0].action).toEqual({ type: 'closeLog' });
    expect(regions.filter((r) => r.action.type === 'closeLog')).toHaveLength(2);
    expect(regions.filter((r) => r.action.type === 'scrollLog').map((r) => (r.action as { by: number }).by)).toEqual([LOG_PAGE, -LOG_PAGE]);
  });

  it('says so when there are no messages', () => {
    const state = makeState(makePlayer(1, 1));
    const { ctx, calls } = makeCtx();

    drawMessageLog(ctx, state, 0);

    expect(texts(calls)).toContain('(no messages yet)');
  });
});

describe('log mode plumbing', () => {
  it('keeps the control bar visible and uses the menu canvas height on compact', () => {
    expect(controlBarVisible('log')).toBe(true);
    expect(canvasHeightFor('log', COMPACT_LAYOUT)).toBe(660);
    expect(canvasHeightFor('log', DESKTOP_LAYOUT)).toBe(728);
  });

  it('parses the Log button', () => {
    expect(parseControlAction('toggleLog')).toEqual({ type: 'toggleLog' });
  });
});
