import { describe, it, expect } from 'vitest';
import { formatRunCode, parseRunCode } from '../src/systems/runcode';
import { Game } from '../src/game';
import { CHARACTERS } from '../src/data/characters';
import { drawCharSelect, drawGameOver } from '../src/render/hud';
import { createMemoryStorage, loadRun, saveRun, SAVE_KEY } from '../src/systems/persistence';
import { makeCtx, makePlayer, makeState } from './helpers';

function heroScreen(storage = createMemoryStorage()) {
  const { ctx, calls } = makeCtx();
  const game = new Game(ctx, new Map(), storage, {
    now: () => new Date('2026-09-16T12:00:00Z'),
    seedSource: () => 5,
  });
  return { game, calls };
}

describe('run codes', () => {
  it('round-trips a seed and hero index', () => {
    const code = formatRunCode(123456789, 7);

    expect(code).toBe(`${(123456789).toString(36)}-7`);
    expect(parseRunCode(code)).toEqual({ seed: 123456789, heroIndex: 7 });
  });

  it('accepts upper case and surrounding whitespace', () => {
    expect(parseRunCode('  1Z8K3F-7 ')).toEqual({ seed: parseInt('1z8k3f', 36), heroIndex: 7 });
  });

  it.each(['', 'abc', '1z8k3f', '1z8k3f-zz', '-1', '1z8k3f-', 'zzzzzzzz-1', '1z8k3f-7-2'])(
    'rejects %s',
    (code) => {
      expect(parseRunCode(code)).toBeNull();
    }
  );
});

describe('shared runs on the hero screen', () => {
  const code = formatRunCode(424242, 7);

  it('arms a shared run, locks the hero, and starts it with the coded seed', () => {
    const { game } = heroScreen();

    expect(game.armSharedRun(code)).toBe(true);
    expect(game.sharedRun).toEqual({ code, seed: 424242, heroIndex: 7 });
    expect(game.charSelectIndex).toBe(7);

    game.handleCharSelectInput('ArrowRight');
    expect(game.charSelectIndex).toBe(7);

    game.handleCharSelectInput('Enter');
    expect(game.state.uiMode).toBe('game');
    expect(game.state.mode).toBe('shared');
    expect(game.state.seed).toBe(424242);
    expect(game.state.heroIndex).toBe(7);
    expect(game.state.player.appearance!.name).toBe(CHARACTERS[7].name);
  });

  it('produces the same dungeon for everyone with the code', () => {
    const a = heroScreen().game;
    const b = heroScreen().game;
    a.armSharedRun(code);
    b.armSharedRun(code);

    a.handleCharSelectInput('Enter');
    b.handleCharSelectInput('Enter');

    expect(a.state.dungeon.tiles).toEqual(b.state.dungeon.tiles);
    expect(a.state.entities).toEqual(b.state.entities);
  });

  it('reports a bad code without arming anything', () => {
    const { game } = heroScreen();

    expect(game.armSharedRun('not-a-code')).toBe(false);
    expect(game.sharedRun).toBeNull();
    expect(game.sharedError).toBe(true);

    game.handleCharSelectInput('ArrowRight');
    expect(game.sharedError).toBe(false);
  });

  it('clears a pending shared run when daily mode is toggled', () => {
    const { game } = heroScreen();
    game.armSharedRun(code);

    game.handleCharSelectInput('d');

    expect(game.sharedRun).toBeNull();
    expect(game.dailyMode).toBe(true);
  });

  it('asks the page for a code on E and on the drawn button', () => {
    const { game } = heroScreen();
    let asked = 0;
    game.onRequestRunCode = () => {
      asked++;
    };

    game.handleCharSelectInput('e');
    const button = game.hitRegions.find((r) => r.action.type === 'enterRunCode')!;
    game.handleTap(button.x + 1, button.y + 1);

    expect(asked).toBe(2);
  });

  it('draws the shared banner and the code button', () => {
    const { ctx, calls } = makeCtx();

    const regions = drawCharSelect(ctx, 7, new Map(), null, false, null, { code, heroIndex: 7 });

    expect(regions.filter((r) => r.action.type === 'enterRunCode')).toHaveLength(1);
    const texts = calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
    expect(texts.some((t) => t.startsWith(`SHARED RUN ${code}`))).toBe(true);
  });
});

describe('sharing a finished run', () => {
  it('shows the run code on the end screen and links to it in the share text', () => {
    const { game } = heroScreen();
    game.handleCharSelectInput('Enter');
    const code = formatRunCode(game.state.seed, game.state.heroIndex);
    const { ctx, calls } = makeCtx();

    drawGameOver(ctx, game.state);

    expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toContain(`Run code: ${code}`);
    expect(game.shareText()).toContain(`https://gloomstep.barretblake.dev/?run=${code}`);
  });

  it('keeps the daily share text free of run codes', () => {
    const { game } = heroScreen();
    game.handleCharSelectInput('d');
    game.handleCharSelectInput('Enter');

    expect(game.shareText()).not.toContain('?run=');
    expect(game.shareText()).toContain('https://gloomstep.barretblake.dev');
  });

  it('records the hero index on a fresh run', () => {
    const { game } = heroScreen();
    game.handleCharSelectInput('ArrowRight');
    game.handleCharSelectInput('ArrowRight');

    game.handleCharSelectInput('Enter');

    expect(game.state.heroIndex).toBe(2);
  });
});

describe('older saves', () => {
  it('recover the hero index from the sprite', () => {
    const storage = createMemoryStorage();
    const state = makeState(makePlayer(1, 1));
    state.player.appearance!.sprite = CHARACTERS[4].sprite;
    saveRun(state, storage);
    const record = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete record.state.heroIndex;
    storage.setItem(SAVE_KEY, JSON.stringify(record));

    expect(loadRun(storage)!.heroIndex).toBe(4);
  });
});
