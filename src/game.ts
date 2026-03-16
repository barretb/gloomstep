import { Action, GameState, Tile } from './types';
import { createEntity, resetEntityIds } from './ecs/entity';
import { generateDungeon } from './dungeon/generator';
import { populateDungeon } from './dungeon/populate';
import { moveEntity } from './systems/movement';
import { runAI } from './systems/ai';
import { computeFOV } from './systems/fov';
import { pickupItem, useItem } from './systems/inventory';
import { loadHighScores, saveHighScore } from './systems/scoring';
import { render } from './render/renderer';
import { SpriteMap } from './render/sprite-loader';
import { CHARACTERS, CharacterTemplate } from './data/characters';
import { drawCharSelect } from './render/hud';

export class Game {
  state!: GameState;
  ctx: CanvasRenderingContext2D;
  sprites: SpriteMap;
  charSelectIndex = 0;
  shareStatus = '';

  constructor(ctx: CanvasRenderingContext2D, sprites: SpriteMap) {
    this.ctx = ctx;
    this.sprites = sprites;
    this.showCharSelect();
  }

  showCharSelect(): void {
    this.charSelectIndex = 0;
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
      equipment: { weapon: null, armor: null },
    });
    this.state = {
      dungeon,
      entities: [player],
      player,
      depth: 1,
      score: 0,
      turn: 0,
      gameOver: false,
      messages: [],
      uiMode: 'charselect',
      highScores: loadHighScores(),
    };
    this.drawCharSelectScreen();
  }

  handleCharSelectInput(key: string): void {
    const cols = 5;
    const total = CHARACTERS.length;

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
      case 'Enter':
        this.startGameWithCharacter(CHARACTERS[this.charSelectIndex]);
        return;
    }
    this.drawCharSelectScreen();
  }

  private startGameWithCharacter(template: CharacterTemplate): void {
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
      equipment: { weapon: null, armor: null },
    });

    this.state = {
      dungeon,
      entities: [player],
      player,
      depth,
      score: 0,
      turn: 0,
      gameOver: false,
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

    if (action.type === 'useItem') {
      useItem(this.state, action.index);
      this.state.uiMode = 'game';
      this.endTurn();
      return;
    }

    if (action.type === 'pickup') {
      pickupItem(this.state);
      this.endTurn();
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

    runAI(this.state);
    computeFOV(this.state);

    if (this.state.player.stats!.hp <= 0 && !this.state.gameOver) {
      this.state.gameOver = true;
      this.state.uiMode = 'gameover';
      this.state.highScores = saveHighScore(this.state.score);
    }

    if (this.state.messages.length > 50) {
      this.state.messages = this.state.messages.slice(-50);
    }

    this.draw();
  }

  private tryDescend(): void {
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
    this.draw();
  }

  private drawCharSelectScreen(): void {
    drawCharSelect(this.ctx, this.charSelectIndex, this.sprites);
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
    return [
      `\u2694\uFE0F Gloomstep Dungeon \u2694\uFE0F`,
      `Score: ${s.score} | Depth: ${s.depth} | Level: ${stats.level}`,
      `Turns Survived: ${s.turn}`,
      `Character: ${name}`,
      `Can you survive the dungeon?`,
      GAME_URL,
      `#GloomstepDungeon #roguelike`,
    ].join('\n');
  }

  draw(): void {
    render(this.ctx, this.state, this.sprites, this.shareStatus);
  }
}
