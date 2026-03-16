import { GameState, Room, Tile } from '../types';
import { createEntity } from '../ecs/entity';
import { getMonsterTemplate } from '../data/monsters';
import { getRandomItem } from '../data/items';

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloorInRoom(state: GameState, room: Room): { x: number; y: number } | null {
  for (let attempts = 0; attempts < 20; attempts++) {
    const x = rand(room.x + 1, room.x + room.w - 2);
    const y = rand(room.y + 1, room.y + room.h - 2);
    if (state.dungeon.tiles[y][x] === Tile.Floor) {
      const occupied = state.entities.some(
        (e) => e.position && e.position.x === x && e.position.y === y
      );
      if (!occupied) return { x, y };
    }
  }
  return null;
}

export function populateDungeon(state: GameState, rooms: Room[]): void {
  const depth = state.depth;
  const monsterCount = 3 + depth * 2;
  const itemCount = 2 + Math.floor(depth / 2);

  // Skip first room (player spawn)
  const spawnRooms = rooms.slice(1);
  if (spawnRooms.length === 0) return;

  // Spawn monsters
  for (let i = 0; i < monsterCount; i++) {
    const room = spawnRooms[rand(0, spawnRooms.length - 1)];
    const pos = randomFloorInRoom(state, room);
    if (!pos) continue;

    const template = getMonsterTemplate(depth);
    const monster = createEntity({
      position: { x: pos.x, y: pos.y },
      stats: { ...template.stats },
      appearance: { ...template.appearance },
      ai: { ...template.ai },
      blocksMovement: true,
      xpValue: template.xpValue,
    });
    state.entities.push(monster);
  }

  // Spawn items
  for (let i = 0; i < itemCount; i++) {
    const room = spawnRooms[rand(0, spawnRooms.length - 1)];
    const pos = randomFloorInRoom(state, room);
    if (!pos) continue;

    const template = getRandomItem(depth);
    const item = createEntity({
      position: { x: pos.x, y: pos.y },
      appearance: { ...template.appearance },
      item: { ...template.item },
    });
    state.entities.push(item);
  }
}
