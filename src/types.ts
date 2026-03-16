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

export interface EquipmentComponent {
  weapon: Entity | null;
  armor: Entity | null;
}

export interface ItemComponent {
  kind: 'potion' | 'weapon' | 'armor' | 'scroll';
  useEffect?: UseEffect;
  attackBonus?: number;
  defenseBonus?: number;
}

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
  player?: true;
  blocksMovement?: true;
  xpValue?: number;
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
  | { type: 'descend' }
  | { type: 'toggleInventory' };

export type UIMode = 'charselect' | 'game' | 'inventory' | 'gameover';

export interface GameState {
  dungeon: DungeonLevel;
  entities: Entity[];
  player: Entity;
  depth: number;
  score: number;
  turn: number;
  gameOver: boolean;
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
