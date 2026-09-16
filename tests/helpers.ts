import { DungeonLevel, Entity, EquipSlot, GameState, Stats, Tile } from '../src/types';
import { createEntity, resetEntityIds } from '../src/ecs/entity';
import { createEmptyEquipment } from '../src/systems/equipment';

const BASE_STATS: Stats = { hp: 20, maxHp: 20, attack: 5, defense: 1, level: 1, xp: 0, xpToNext: 20 };

export function makeDungeon(width = 10, height = 10): DungeonLevel {
  const tiles: Tile[][] = [];
  const visible: boolean[][] = [];
  const explored: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = new Array(width).fill(Tile.Floor);
    visible[y] = new Array(width).fill(true);
    explored[y] = new Array(width).fill(true);
  }
  return { width, height, tiles, visible, explored };
}

export function makePlayer(x: number, y: number, stats: Partial<Stats> = {}): Entity {
  return createEntity({
    position: { x, y },
    stats: { ...BASE_STATS, ...stats },
    appearance: { name: 'Hero', char: '@', color: '#fff', sprite: 'player' },
    player: true,
    blocksMovement: true,
    inventory: { items: [], capacity: 10 },
    equipment: createEmptyEquipment(),
  });
}

/** An equippable item entity (not on the map). */
export function makeGear(
  name: string,
  slot: EquipSlot,
  bonus: { attackBonus?: number; defenseBonus?: number }
): Entity {
  return createEntity({
    appearance: { name, char: slot === 'weapon' ? '/' : '[', color: '#ccc', sprite: name.toLowerCase() },
    item: { kind: slot === 'weapon' ? 'weapon' : 'armor', slot, ...bonus },
  });
}

export function makeMonster(x: number, y: number, stats: Partial<Stats> = {}, xpValue = 4): Entity {
  return createEntity({
    position: { x, y },
    stats: { ...BASE_STATS, hp: 5, maxHp: 5, attack: 1, defense: 0, ...stats },
    appearance: { name: 'Rat', char: 'r', color: '#888', sprite: 'rat' },
    ai: { type: 'chase', alertRange: 5 },
    blocksMovement: true,
    xpValue,
  });
}

export function makeTreasure(x: number, y: number, value = 10): Entity {
  return createEntity({
    position: { x, y },
    appearance: { name: 'Gold', char: '$', color: '#ffd700', sprite: 'treasure' },
    treasure: { value },
  });
}

export function makeState(player: Entity, others: Entity[] = []): GameState {
  return {
    dungeon: makeDungeon(),
    entities: [player, ...others],
    player,
    depth: 1,
    score: 0,
    treasureCollected: 0,
    turn: 0,
    gameOver: false,
    messages: [],
    uiMode: 'game',
    highScores: [],
  };
}

export interface CtxCall {
  name: string;
  args: unknown[];
}

/** A canvas-context stand-in that records every method call. */
export function makeCtx(): { ctx: CanvasRenderingContext2D; calls: CtxCall[] } {
  const calls: CtxCall[] = [];
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (prop === 'measureText') return () => ({ width: 0 });
      return (...args: unknown[]) => {
        calls.push({ name: prop, args });
      };
    },
    set(t, prop: string, value) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

export { resetEntityIds };
