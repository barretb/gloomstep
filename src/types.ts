export type EntityId = number;

export interface Position {
  x: number;
  y: number;
}

export interface Stats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  xp: number;
  xpToNext: number;
}

export interface Appearance {
  name: string;
  char: string;
  color: string;
  sprite: string;
}

export interface AIComponent {
  type: 'wander' | 'chase';
  alertRange: number;
}

export interface InventoryComponent {
  items: Entity[];
  capacity: number;
}

export type EquipSlot = 'weapon' | 'body' | 'offhand' | 'head' | 'hands' | 'legs';

export type EquipmentComponent = Record<EquipSlot, Entity | null>;

export interface ItemComponent {
  kind: 'potion' | 'weapon' | 'armor' | 'scroll';
  /** Which equipment slot this occupies. Required for weapons and armor. */
  slot?: EquipSlot;
  useEffect?: UseEffect;
  attackBonus?: number;
  defenseBonus?: number;
}

export interface TreasureComponent {
  value: number;
}

export type AbilityId =
  | 'cleave'
  | 'rage'
  | 'arcane-bolt'
  | 'vanish'
  | 'survey'
  | 'guard-stance'
  | 'mend';

export interface AbilityComponent {
  id: AbilityId;
  /** Turns until the ability can be used again. 0 means ready. */
  cooldownRemaining: number;
}

export type StatusEffect =
  | { kind: 'buff'; stat: 'attack' | 'defense'; amount: number; turnsRemaining: number }
  | { kind: 'stealth'; turnsRemaining: number };

export type UseEffect =
  | { type: 'heal'; amount: number }
  | { type: 'damage'; amount: number; range: number };

export interface Entity {
  id: EntityId;
  position?: Position;
  stats?: Stats;
  appearance?: Appearance;
  ai?: AIComponent;
  inventory?: InventoryComponent;
  equipment?: EquipmentComponent;
  item?: ItemComponent;
  treasure?: TreasureComponent;
  ability?: AbilityComponent;
  statusEffects?: StatusEffect[];
  player?: true;
  blocksMovement?: true;
  xpValue?: number;
  /** The floor boss; slaying it wins the run. */
  boss?: true;
}

export enum Tile {
  Wall,
  Floor,
  StairsDown,
}

export interface DungeonLevel {
  width: number;
  height: number;
  tiles: Tile[][];
  visible: boolean[][];
  explored: boolean[][];
}

export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'wait' }
  | { type: 'pickup' }
  | { type: 'useItem'; index: number }
  | { type: 'dropItem'; index: number }
  | { type: 'descend' }
  | { type: 'ability' }
  | { type: 'toggleInventory' }
  | { type: 'toggleLog' }
  /** Positive scrolls toward older messages; Infinity jumps to the oldest, -Infinity to the newest. */
  | { type: 'scrollLog'; by: number };

export type UIMode = 'charselect' | 'game' | 'inventory' | 'log' | 'gameover';

export interface GameState {
  dungeon: DungeonLevel;
  entities: Entity[];
  player: Entity;
  depth: number;
  score: number;
  treasureCollected: number;
  turn: number;
  gameOver: boolean;
  won: boolean;
  /** The Overlord has been sighted this run (drives the one-time announcement). */
  bossSeen: boolean;
  /** Seed the run started from; reproduces the run given the same actions. */
  seed: number;
  /** Current generator state; advances on every draw. */
  rngState: number;
  mode: 'normal' | 'daily' | 'shared';
  /** Index into CHARACTERS of the hero being played; part of the shareable run code. */
  heroIndex: number;
  /** YYYY-MM-DD (UTC) for daily runs. */
  dailyDate?: string;
  messages: string[];
  uiMode: UIMode;
  highScores: number[];
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}
