import { Entity, GameState, Room, Tile } from '../types';
import { createEntity } from '../ecs/entity';
import { BOSS, getEscortTemplate, getMonsterTemplate, MonsterTemplate } from '../data/monsters';
import { getRandomItem } from '../data/items';
import { BOSS_DEPTH } from '../constants';
import { rngFor } from '../systems/rng';

function rand(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomFloorInRoom(state: GameState, room: Room): { x: number; y: number } | null {
  const rng = rngFor(state);
  for (let attempts = 0; attempts < 20; attempts++) {
    const x = rand(rng, room.x + 1, room.x + room.w - 2);
    const y = rand(rng, room.y + 1, room.y + room.h - 2);
    if (state.dungeon.tiles[y][x] === Tile.Floor) {
      const occupied = state.entities.some(
        (e) => e.position && e.position.x === x && e.position.y === y
      );
      if (!occupied) return { x, y };
    }
  }
  return null;
}

function roomCenter(room: Room): { x: number; y: number } {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function isFree(state: GameState, x: number, y: number): boolean {
  return (
    state.dungeon.tiles[y]?.[x] === Tile.Floor &&
    !state.entities.some((e) => e.position && e.position.x === x && e.position.y === y)
  );
}

/** Every unoccupied floor tile inside the room, nearest the centre first. */
function freeTilesInRoom(state: GameState, room: Room): { x: number; y: number }[] {
  const c = roomCenter(room);
  const tiles: { x: number; y: number }[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (isFree(state, x, y)) tiles.push({ x, y });
    }
  }
  return tiles.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
}

function placeMonster(
  state: GameState,
  template: MonsterTemplate,
  pos: { x: number; y: number },
  extra: Partial<Entity> = {}
): Entity {
  const monster = createEntity({
    position: { x: pos.x, y: pos.y },
    stats: { ...template.stats },
    appearance: { ...template.appearance },
    ai: { ...template.ai },
    blocksMovement: true,
    xpValue: template.xpValue,
    ...extra,
  });
  state.entities.push(monster);
  return monster;
}

/** The Overlord and two escorts, in the room farthest from the player. */
function spawnBoss(state: GameState, rooms: Room[]): void {
  const playerPos = state.player.position!;
  const candidates = rooms.length > 1 ? rooms.slice(1) : rooms;
  let bossRoom = candidates[0];
  let bestDist = -1;
  for (const room of candidates) {
    const c = roomCenter(room);
    const dist = Math.hypot(c.x - playerPos.x, c.y - playerPos.y);
    if (dist > bestDist) {
      bestDist = dist;
      bossRoom = room;
    }
  }

  // Deterministic placement: the boss takes the free tile nearest the centre,
  // the escorts the next two. Runs before regular spawns, so the room is empty.
  const rng = rngFor(state);
  const free = freeTilesInRoom(state, bossRoom);
  if (free.length > 0) {
    placeMonster(state, BOSS, free[0], { boss: true });
  }
  for (const pos of free.slice(1, 3)) {
    placeMonster(state, getEscortTemplate(rng), pos);
  }
}

export function populateDungeon(state: GameState, rooms: Room[]): void {
  const depth = state.depth;
  const rng = rngFor(state);
  const monsterCount = 3 + depth * 2;
  const itemCount = 2 + Math.floor(depth / 2);
  const treasureCount = 2 + Math.floor(depth / 2);

  // The final floor holds the Overlord; place it first so its room is still empty
  if (depth === BOSS_DEPTH) {
    spawnBoss(state, rooms);
  }

  // Skip first room (player spawn)
  const spawnRooms = rooms.slice(1);
  if (spawnRooms.length === 0) return;

  // Spawn monsters
  for (let i = 0; i < monsterCount; i++) {
    const room = spawnRooms[rand(rng, 0, spawnRooms.length - 1)];
    const pos = randomFloorInRoom(state, room);
    if (!pos) continue;
    placeMonster(state, getMonsterTemplate(depth, rng), pos);
  }

  // Spawn items
  for (let i = 0; i < itemCount; i++) {
    const room = spawnRooms[rand(rng, 0, spawnRooms.length - 1)];
    const pos = randomFloorInRoom(state, room);
    if (!pos) continue;

    const template = getRandomItem(depth, rng);
    const item = createEntity({
      position: { x: pos.x, y: pos.y },
      appearance: { ...template.appearance },
      item: { ...template.item },
    });
    state.entities.push(item);
  }

  // Spawn static treasure
  for (let i = 0; i < treasureCount; i++) {
    const room = spawnRooms[rand(rng, 0, spawnRooms.length - 1)];
    const pos = randomFloorInRoom(state, room);
    if (!pos) continue;

    const value = rand(rng, depth * 3, depth * 12);
    const treasure = createEntity({
      position: { x: pos.x, y: pos.y },
      appearance: { name: 'Gold', char: '$', color: '#ffd700', sprite: 'treasure' },
      treasure: { value },
    });
    state.entities.push(treasure);
  }
}
