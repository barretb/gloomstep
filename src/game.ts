import { Action, GameState, Tile } from './types';
import { BOSS_DEPTH } from './constants';
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

export class Game {
  state!: GameState;
  ctx: CanvasRenderingContext2D;
  sprites: SpriteMap;
  storage: RunStorage;
  charSelectIndex = 0;
  shareStatus = '';
  resumeSummary: SaveSummary | null = null;
  confirmAbandon = false;
  /** Tappable regions of whatever is currently drawn. */
  hitRegions: HitRegion[] = [];

  constructor(ctx: CanvasRenderingContext2D, sprites: SpriteMap, storage: RunStorage = defaultStorage()) {
    this.ctx = ctx;
    this.sprites = sprites;
    this.storage = storage;
    this.showCharSelect();
  }

  showCharSelect(): void {
    this.charSelectIndex = 0;
    this.resumeSummary = getSaveSummary(this.storage);
    this.confirmAbandon = false;
    // Create a minimal state for the charselect screen
    resetEntityIds();
    const { dungeon, rooms } = generateDungeon(1);
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

    if (key === 'Enter') {
      // A saved run is erased by a new game, so ask once before doing it.
      if (this.resumeSummary && !this.confirmAbandon) {
        this.confirmAbandon = true;
        this.drawCharSelectScreen();
        return;
      }
      this.startGameWithCharacter(CHARACTERS[this.charSelectIndex]);
      return;
    }

    this.confirmAbandon = false;

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

  private startGameWithCharacter(template: CharacterTemplate): void {
    clearRun(this.storage);
    resetEntityIds();
    const depth = 1;
    const { dungeon, rooms } = generateDungeon(depth);

    const firstRoom = rooms[0];
    const startX = Math.floor(firstRoom.x + firstRoom.w / 2);
    const startY = Math.floor(firstRoom.y + firstRoom.h / 2);

    const player = createEntity({
      position: { x: startX, y: startY },
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

    this.state = {
      dungeon,
      entities: [player],
      player,
      depth,
      score: 0,
      treasureCollected: 0,
      turn: 0,
      gameOver: false,
      won: false,
      messages: [`${template.name} enters the dungeon...`],
      uiMode: 'game',
      highScores: loadHighScores(),
    };

    populateDungeon(this.state, rooms);
    computeFOV(this.state);
    this.draw();
  }

  tick(action: Action): void {
    if (this.state.gameOver) return;

    // Handle UI-only actions
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

    const { dungeon, rooms } = generateDungeon(this.state.depth);
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
    this.hitRegions = drawCharSelect(this.ctx, this.charSelectIndex, this.sprites, this.resumeSummary, this.confirmAbandon);
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
          `https://bsky.app/intent/compose?text=${encodeURIComponent(this.getShareText())}`,
          '_blank'
        );
        break;
      case 'm':
        window.open(
          `https://toot.kytta.dev/?text=${encodeURIComponent(this.getShareText())}`,
          '_blank'
        );
        break;
      case 'c':
        this.copyToClipboard(this.getShareText());
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

  private getShareText(): string {
    const GAME_URL = 'https://gloomstep.barretblake.dev';
    const s = this.state;
    const stats = s.player.stats!;
    const name = s.player.appearance?.name ?? 'Adventurer';
    const title = s.won
      ? `\u{1F3C6} Gloomstep Dungeon \u2014 CONQUERED \u{1F3C6}`
      : `\u2694\uFE0F Gloomstep Dungeon \u2694\uFE0F`;
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

  draw(): void {
    this.ensureCanvasSize();
    this.hitRegions = render(this.ctx, this.state, this.sprites, this.shareStatus);
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
