import { Action, GameState, Tile } from './types';
import { BOSS_DEPTH } from './constants';
import { makeRng, randomSeed, rngFor } from './systems/rng';
import { dailyDate, dailyHeroIndex, dailySeed, DailyResult, getDailyResult, recordDailyResult } from './systems/daily';
import { formatRunCode, parseRunCode, RunCode } from './systems/runcode';
import { createEntity, resetEntityIds, setNextEntityId } from './ecs/entity';
import { generateDungeon } from './dungeon/generator';
import { populateDungeon } from './dungeon/populate';
import { moveEntity } from './systems/movement';
import { runAI } from './systems/ai';
import { computeFOV } from './systems/fov';
import { pickupItem, useItem, dropItem } from './systems/inventory';
import { createEmptyEquipment } from './systems/equipment';
import { tickAbilities, useAbility } from './systems/abilities';
import { loadHighScores, saveHighScore } from './systems/scoring';
import {
  clearRun,
  defaultStorage,
  getSaveSummary,
  loadRun,
  RunStorage,
  saveRun,
  SaveSummary,
} from './systems/persistence';
import { render } from './render/renderer';
import { SpriteMap } from './render/sprite-loader';
import { CHARACTERS, CharacterTemplate } from './data/characters';
import { drawCharSelect } from './render/hud';
import { findHitRegion, HitRegion, TapAction } from './ui/hit-regions';
import { canvasHeightFor, getLayout } from './render/layout';
import { LOG_CAPACITY, logVisibleLines } from './render/log';

export interface GameOptions {
  /** Clock, injectable for tests. */
  now?: () => Date;
  /** Seed for free-play runs, injectable for tests. */
  seedSource?: () => number;
}

export class Game {
  state!: GameState;
  ctx: CanvasRenderingContext2D;
  sprites: SpriteMap;
  storage: RunStorage;
  now: () => Date;
  seedSource: () => number;
  charSelectIndex = 0;
  shareStatus = '';
  resumeSummary: SaveSummary | null = null;
  confirmAbandon = false;
  /** Tappable regions of whatever is currently drawn. */
  hitRegions: HitRegion[] = [];
  /** Message log scroll position: lines back from the newest message. */
  logScroll = 0;
  dailyMode = false;
  todaysDate = '';
  todaysResult: DailyResult | null = null;
  /** A run code armed from a link or the prompt, waiting for Enter. */
  sharedRun: (RunCode & { code: string }) | null = null;
  sharedError = false;
  /** Set by the page: asks the player for a run code (a browser prompt). */
  onRequestRunCode: (() => void) | null = null;

  constructor(
    ctx: CanvasRenderingContext2D,
    sprites: SpriteMap,
    storage: RunStorage = defaultStorage(),
    options: GameOptions = {}
  ) {
    this.ctx = ctx;
    this.sprites = sprites;
    this.storage = storage;
    this.now = options.now ?? (() => new Date());
    this.seedSource = options.seedSource ?? randomSeed;
    this.showCharSelect();
  }

  showCharSelect(): void {
    this.charSelectIndex = 0;
    this.resumeSummary = getSaveSummary(this.storage);
    this.confirmAbandon = false;
    this.dailyMode = false;
    this.sharedRun = null;
    this.sharedError = false;
    this.todaysDate = dailyDate(this.now());
    this.todaysResult = getDailyResult(this.todaysDate, this.storage);
    // Create a minimal state for the charselect screen
    resetEntityIds();
    const { dungeon, rooms } = generateDungeon(1, makeRng(1));
    const firstRoom = rooms[0];
    const player = createEntity({
      position: { x: Math.floor(firstRoom.x + firstRoom.w / 2), y: Math.floor(firstRoom.y + firstRoom.h / 2) },
      stats: { ...CHARACTERS[0].stats },
      appearance: { name: 'Player', char: '@', color: '#ffcc00', sprite: 'player' },
      player: true,
      blocksMovement: true,
      inventory: { items: [], capacity: 10 },
      equipment: createEmptyEquipment(),
    });
    this.state = {
      dungeon,
      entities: [player],
      player,
      depth: 1,
      score: 0,
      treasureCollected: 0,
      turn: 0,
      gameOver: false,
      won: false,
      seed: 1,
      rngState: 1,
      mode: 'normal',
      heroIndex: 0,
      messages: [],
      uiMode: 'charselect',
      highScores: loadHighScores(),
    };
    this.drawCharSelectScreen();
  }

  handleCharSelectInput(key: string): void {
    const cols = 5;
    const total = CHARACTERS.length;

    if ((key === 'c' || key === 'C') && this.resumeSummary) {
      this.resumeRun();
      return;
    }

    if (key === 'd' || key === 'D') {
      this.dailyMode = !this.dailyMode;
      this.confirmAbandon = false;
      this.sharedRun = null;
      this.sharedError = false;
      if (this.dailyMode) {
        this.charSelectIndex = dailyHeroIndex(this.todaysDate);
      }
      this.drawCharSelectScreen();
      return;
    }

    if (key === 'e' || key === 'E') {
      this.onRequestRunCode?.();
      return;
    }

    if (key === 'Enter') {
      // Today's daily is done: nothing to start
      if (this.dailyMode && this.todaysResult) {
        this.drawCharSelectScreen();
        return;
      }
      // A saved run is erased by a new game, so ask once before doing it.
      if (this.resumeSummary && !this.confirmAbandon) {
        this.confirmAbandon = true;
        this.drawCharSelectScreen();
        return;
      }
      if (this.dailyMode) {
        const hero = CHARACTERS[dailyHeroIndex(this.todaysDate)];
        this.startRun(hero, dailySeed(this.todaysDate), 'daily', this.todaysDate);
      } else if (this.sharedRun) {
        this.startRun(CHARACTERS[this.sharedRun.heroIndex], this.sharedRun.seed, 'shared');
      } else {
        this.startRun(CHARACTERS[this.charSelectIndex], this.seedSource(), 'normal');
      }
      return;
    }

    this.confirmAbandon = false;
    this.sharedError = false;

    // The daily's or a shared run's hero is fixed; arrows do nothing
    if (this.dailyMode || this.sharedRun) {
      this.drawCharSelectScreen();
      return;
    }

    switch (key) {
      case 'ArrowRight':
      case 'd':
        this.charSelectIndex = (this.charSelectIndex + 1) % total;
        break;
      case 'ArrowLeft':
      case 'a':
        this.charSelectIndex = (this.charSelectIndex - 1 + total) % total;
        break;
      case 'ArrowDown':
      case 's':
        this.charSelectIndex = Math.min(this.charSelectIndex + cols, total - 1);
        break;
      case 'ArrowUp':
      case 'w':
        this.charSelectIndex = Math.max(this.charSelectIndex - cols, 0);
        break;
    }
    this.drawCharSelectScreen();
  }

  /**
   * Arms a shared run from a code (link parameter or prompt). Locks the hero
   * and waits for Enter. Returns false, and shows an error, for a bad code.
   */
  armSharedRun(input: string): boolean {
    const parsed = parseRunCode(input);
    if (!parsed) {
      this.sharedError = true;
      this.drawCharSelectScreen();
      return false;
    }
    this.sharedRun = { ...parsed, code: formatRunCode(parsed.seed, parsed.heroIndex) };
    this.sharedError = false;
    this.dailyMode = false;
    this.confirmAbandon = false;
    this.charSelectIndex = parsed.heroIndex;
    this.drawCharSelectScreen();
    return true;
  }

  /** Loads the saved run. Returns false if there is none. */
  resumeRun(): boolean {
    const state = loadRun(this.storage);
    if (!state) return false;

    this.state = state;
    this.state.highScores = loadHighScores();
    setNextEntityId(maxEntityId(state) + 1);

    const name = state.player.appearance?.name ?? 'Adventurer';
    this.state.messages.push(`Welcome back, ${name}. Depth ${state.depth}, turn ${state.turn}.`);
    computeFOV(this.state);
    this.draw();
    return true;
  }

  /** Starts a fresh run from `seed`. Public so tests can start identical runs. */
  startRun(template: CharacterTemplate, seed: number, mode: 'normal' | 'daily' | 'shared', dailyDate?: string): void {
    clearRun(this.storage);
    resetEntityIds();
    const depth = 1;

    const player = createEntity({
      position: { x: 0, y: 0 },
      stats: { ...template.stats },
      appearance: {
        name: template.name,
        char: '@',
        color: '#ffcc00',
        sprite: template.sprite,
      },
      player: true,
      blocksMovement: true,
      inventory: { items: [], capacity: 10 },
      equipment: createEmptyEquipment(),
      ability: { id: template.ability, cooldownRemaining: 0 },
      statusEffects: [],
    });

    // Build the state first so the run's own generator drives generation and population.
    this.state = {
      dungeon: { width: 0, height: 0, tiles: [], visible: [], explored: [] },
      entities: [player],
      player,
      depth,
      score: 0,
      treasureCollected: 0,
      turn: 0,
      gameOver: false,
      won: false,
      seed,
      rngState: seed,
      mode,
      heroIndex: Math.max(0, CHARACTERS.indexOf(template)),
      dailyDate,
      messages: [`${template.name} enters the dungeon...`],
      uiMode: 'game',
      highScores: loadHighScores(),
    };

    const { dungeon, rooms } = generateDungeon(depth, rngFor(this.state));
    this.state.dungeon = dungeon;
    const firstRoom = rooms[0];
    player.position = {
      x: Math.floor(firstRoom.x + firstRoom.w / 2),
      y: Math.floor(firstRoom.y + firstRoom.h / 2),
    };

    populateDungeon(this.state, rooms);
    computeFOV(this.state);
    this.draw();
  }

  tick(action: Action): void {
    if (this.state.gameOver) return;

    // Handle UI-only actions
    if (action.type === 'toggleLog') {
      this.state.uiMode = this.state.uiMode === 'log' ? 'game' : 'log';
      this.logScroll = 0;
      this.draw();
      return;
    }

    if (action.type === 'scrollLog') {
      this.scrollLog(action.by);
      this.draw();
      return;
    }

    // While the log is open the d-pad scrolls it and nothing else acts
    if (this.state.uiMode === 'log') {
      if (action.type === 'move') {
        this.scrollLog(-action.dy);
      }
      this.draw();
      return;
    }

    if (action.type === 'toggleInventory') {
      this.state.uiMode = this.state.uiMode === 'inventory' ? 'game' : 'inventory';
      this.draw();
      return;
    }

    // Inventory actions only consume a turn (and close the inventory)
    // when they actually did something.
    if (action.type === 'useItem' || action.type === 'dropItem') {
      const acted = action.type === 'useItem'
        ? useItem(this.state, action.index)
        : dropItem(this.state, action.index);
      if (acted) {
        this.state.uiMode = 'game';
        this.endTurn();
      } else {
        this.draw();
      }
      return;
    }

    if (action.type === 'pickup') {
      if (pickupItem(this.state)) {
        this.endTurn();
      } else {
        this.draw();
      }
      return;
    }

    if (action.type === 'ability') {
      if (useAbility(this.state)) {
        this.endTurn();
      } else {
        this.draw();
      }
      return;
    }

    if (action.type === 'descend') {
      this.tryDescend();
      return;
    }

    if (action.type === 'wait') {
      this.endTurn();
      return;
    }

    if (action.type === 'move') {
      const moved = moveEntity(this.state, this.state.player.id, action.dx, action.dy);
      if (moved) {
        this.endTurn();
      }
      return;
    }
  }

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

    if (this.state.messages.length > LOG_CAPACITY) {
      this.state.messages = this.state.messages.slice(-LOG_CAPACITY);
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
    if (this.state.mode === 'daily' && this.state.dailyDate) {
      recordDailyResult(
        {
          date: this.state.dailyDate,
          score: this.state.score,
          won: this.state.won,
          depth: this.state.depth,
          turn: this.state.turn,
        },
        this.storage
      );
    }
    this.state.highScores = saveHighScore(this.state.score);
    clearRun(this.storage);
    this.draw();
  }

  private tryDescend(): void {
    if (this.state.depth >= BOSS_DEPTH) {
      this.state.messages.push("The way down is sealed. Only the Overlord's fall can end this.");
      this.draw();
      return;
    }

    const pos = this.state.player.position!;
    if (this.state.dungeon.tiles[pos.y][pos.x] !== Tile.StairsDown) {
      this.state.messages.push('No stairs here.');
      this.draw();
      return;
    }

    this.state.depth++;
    this.state.score += 50;

    const { dungeon, rooms } = generateDungeon(this.state.depth, rngFor(this.state));
    this.state.dungeon = dungeon;

    const firstRoom = rooms[0];
    this.state.player.position!.x = Math.floor(firstRoom.x + firstRoom.w / 2);
    this.state.player.position!.y = Math.floor(firstRoom.y + firstRoom.h / 2);

    this.state.entities = this.state.entities.filter((e) => e.player);
    populateDungeon(this.state, rooms);

    this.state.messages.push(`You descend to depth ${this.state.depth}...`);
    computeFOV(this.state);
    saveRun(this.state, this.storage);
    this.draw();
  }

  private drawCharSelectScreen(): void {
    this.ensureCanvasSize();
    this.hitRegions = drawCharSelect(this.ctx, this.charSelectIndex, this.sprites, this.resumeSummary, this.confirmAbandon, {
      on: this.dailyMode,
      date: this.todaysDate,
      heroIndex: dailyHeroIndex(this.todaysDate),
      result: this.todaysResult,
    }, this.sharedRun ? { code: this.sharedRun.code, heroIndex: this.sharedRun.heroIndex } : null, this.sharedError);
  }

  /** Redraws whatever screen is active; used after the layout changes. */
  redraw(): void {
    if (this.state.uiMode === 'charselect') {
      this.drawCharSelectScreen();
    } else {
      this.draw();
    }
  }

  /** Sizes the canvas for the active screen. Resizing clears the context state, so re-apply what we rely on. */
  private ensureCanvasSize(): void {
    const layout = getLayout();
    const w = layout.mapW;
    const h = canvasHeightFor(this.state.uiMode, layout);
    const canvas = this.ctx.canvas;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /** Moves the log view by `by` lines toward older messages, clamped to the history. */
  private scrollLog(by: number): void {
    const max = Math.max(0, this.state.messages.length - logVisibleLines(getLayout()));
    const next = this.logScroll + by;
    this.logScroll = Math.min(max, Math.max(0, Number.isFinite(next) ? next : next > 0 ? max : 0));
  }

  /** Dispatches a tap at canvas pixel (x, y) to whatever was drawn there. */
  handleTap(x: number, y: number): void {
    const region = findHitRegion(this.hitRegions, x, y);
    if (!region) return;
    this.applyTap(region.action);
  }

  private applyTap(action: TapAction): void {
    switch (action.type) {
      case 'selectHero':
        this.charSelectIndex = action.index;
        this.confirmAbandon = false;
        this.drawCharSelectScreen();
        return;
      case 'startHero':
        this.handleCharSelectInput('Enter');
        return;
      case 'continueRun':
        this.handleCharSelectInput('c');
        return;
      case 'toggleDaily':
        this.handleCharSelectInput('d');
        return;
      case 'enterRunCode':
        this.onRequestRunCode?.();
        return;
      case 'useItem':
        this.tick({ type: 'useItem', index: action.index });
        return;
      case 'dropItem':
        this.tick({ type: 'dropItem', index: action.index });
        return;
      case 'closeInventory':
        if (this.state.uiMode === 'inventory') {
          this.tick({ type: 'toggleInventory' });
        }
        return;
      case 'closeLog':
        if (this.state.uiMode === 'log') {
          this.tick({ type: 'toggleLog' });
        }
        return;
      case 'scrollLog':
        this.tick({ type: 'scrollLog', by: action.by });
        return;
      case 'share':
        this.handleGameOverInput(action.target);
        return;
      case 'playAgain':
        this.handleGameOverInput('Enter');
        return;
    }
  }

  handleGameOverInput(key: string): void {
    switch (key.toLowerCase()) {
      case 'enter':
        this.showCharSelect();
        break;
      case 'b':
        window.open(
          `https://bsky.app/intent/compose?text=${encodeURIComponent(this.shareText())}`,
          '_blank'
        );
        break;
      case 'm':
        window.open(
          `https://toot.kytta.dev/?text=${encodeURIComponent(this.shareText())}`,
          '_blank'
        );
        break;
      case 'c':
        this.copyToClipboard(this.shareText());
        break;
    }
  }

  private copyToClipboard(text: string): void {
    const onSuccess = () => {
      this.shareStatus = 'Copied to clipboard!';
      this.draw();
      setTimeout(() => {
        if (this.state.uiMode === 'gameover') {
          this.shareStatus = '';
          this.draw();
        }
      }, 2000);
    };

    // Try modern Clipboard API first
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
        // Fallback: hidden textarea + execCommand
        this.fallbackCopy(text, onSuccess);
      });
    } else {
      this.fallbackCopy(text, onSuccess);
    }
  }

  private fallbackCopy(text: string, onSuccess: () => void): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch {
      this.shareStatus = 'Copy failed — try manually';
      this.draw();
    }
    document.body.removeChild(textarea);
  }

  /** The text posted or copied from the end screen. */
  shareText(): string {
    const GAME_URL = 'https://gloomstep.barretblake.dev';
    const s = this.state;
    const stats = s.player.stats!;
    const name = s.player.appearance?.name ?? 'Adventurer';
    const daily = s.mode === 'daily' && s.dailyDate ? `Daily ${s.dailyDate}` : null;
    const title = s.won
      ? daily
        ? `\u{1F3C6} Gloomstep ${daily} \u2014 CONQUERED \u{1F3C6}`
        : `\u{1F3C6} Gloomstep Dungeon \u2014 CONQUERED \u{1F3C6}`
      : daily
        ? `\u{1F4C5} Gloomstep ${daily}`
        : `\u2694\uFE0F Gloomstep Dungeon \u2694\uFE0F`;
    const challenge = s.won ? 'I slew the Overlord. Can you?' : 'Can you survive the dungeon?';
    const tags = daily ? '#GloomstepDungeon #GloomstepDaily #roguelike' : '#GloomstepDungeon #roguelike';
    // Free-play and shared runs link straight to the same run; the daily is identified by its date.
    const link = daily ? GAME_URL : `${GAME_URL}/?run=${formatRunCode(s.seed, s.heroIndex)}`;
    return [
      title,
      `Score: ${s.score} | Depth: ${s.depth} | Level: ${stats.level}`,
      `Turns Survived: ${s.turn}`,
      `Character: ${name}`,
      challenge,
      link,
      tags,
    ].join('\n');
  }

  draw(): void {
    this.ensureCanvasSize();
    this.hitRegions = render(this.ctx, this.state, this.sprites, this.shareStatus, this.logScroll);
  }
}

/** Highest entity id anywhere in the state, including carried and equipped items. */
function maxEntityId(state: GameState): number {
  let max = 0;
  for (const entity of state.entities) {
    max = Math.max(max, entity.id);
  }
  for (const item of state.player.inventory?.items ?? []) {
    max = Math.max(max, item.id);
  }
  for (const item of Object.values(state.player.equipment ?? {})) {
    if (item) max = Math.max(max, item.id);
  }
  return max;
}
