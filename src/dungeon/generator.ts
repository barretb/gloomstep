import { MAP_W, MAP_H } from '../constants';
import { DungeonLevel, Room, Tile } from '../types';

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitNode(node: BSPNode, minSize: number): void {
  if (node.w < minSize * 2 && node.h < minSize * 2) return;

  const splitH =
    node.w < minSize * 2 ? true :
    node.h < minSize * 2 ? false :
    node.w > node.h * 1.25 ? false :
    node.h > node.w * 1.25 ? true :
    Math.random() < 0.5;

  if (splitH) {
    if (node.h < minSize * 2) return;
    const split = rand(minSize, node.h - minSize);
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    if (node.w < minSize * 2) return;
    const split = rand(minSize, node.w - minSize);
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }

  splitNode(node.left, minSize);
  splitNode(node.right, minSize);
}

function createRooms(node: BSPNode, rooms: Room[]): void {
  if (node.left && node.right) {
    createRooms(node.left, rooms);
    createRooms(node.right, rooms);
    return;
  }

  const padX = 2;
  const padY = 2;
  const maxW = node.w - padX * 2;
  const maxH = node.h - padY * 2;

  if (maxW < 4 || maxH < 4) return;

  const roomW = rand(4, maxW);
  const roomH = rand(4, maxH);
  const roomX = node.x + rand(padX, node.w - roomW - padX);
  const roomY = node.y + rand(padY, node.h - roomH - padY);

  const room: Room = { x: roomX, y: roomY, w: roomW, h: roomH };
  node.room = room;
  rooms.push(room);
}

function getRoom(node: BSPNode): Room | undefined {
  if (node.room) return node.room;
  const leftRoom = node.left ? getRoom(node.left) : undefined;
  const rightRoom = node.right ? getRoom(node.right) : undefined;
  if (leftRoom && rightRoom) return Math.random() < 0.5 ? leftRoom : rightRoom;
  return leftRoom || rightRoom;
}

function roomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function carveCorridor(tiles: Tile[][], x1: number, y1: number, x2: number, y2: number): void {
  let x = x1;
  let y = y1;

  // go horizontal first or vertical first, randomly
  if (Math.random() < 0.5) {
    while (x !== x2) {
      if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
        tiles[y][x] = Tile.Floor;
      }
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
        tiles[y][x] = Tile.Floor;
      }
      y += y < y2 ? 1 : -1;
    }
  } else {
    while (y !== y2) {
      if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
        tiles[y][x] = Tile.Floor;
      }
      y += y < y2 ? 1 : -1;
    }
    while (x !== x2) {
      if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
        tiles[y][x] = Tile.Floor;
      }
      x += x < x2 ? 1 : -1;
    }
  }
  // final tile
  if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
    tiles[y][x] = Tile.Floor;
  }
}

function connectRooms(node: BSPNode, tiles: Tile[][]): void {
  if (!node.left || !node.right) return;

  connectRooms(node.left, tiles);
  connectRooms(node.right, tiles);

  const roomA = getRoom(node.left);
  const roomB = getRoom(node.right);
  if (!roomA || !roomB) return;

  const a = roomCenter(roomA);
  const b = roomCenter(roomB);
  carveCorridor(tiles, a.x, a.y, b.x, b.y);
}

export function generateDungeon(depth: number): { dungeon: DungeonLevel; rooms: Room[] } {
  const width = MAP_W;
  const height = MAP_H;

  // Init all walls
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = Tile.Wall;
    }
  }

  const minPartitionSize = Math.max(7, 10 - Math.floor(depth / 3));
  const root: BSPNode = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitNode(root, minPartitionSize);

  const rooms: Room[] = [];
  createRooms(root, rooms);
  connectRooms(root, tiles);

  // Carve rooms into tiles
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < height && x >= 0 && x < width) {
          tiles[y][x] = Tile.Floor;
        }
      }
    }
  }

  // Place stairs in the last room
  if (rooms.length > 1) {
    const lastRoom = rooms[rooms.length - 1];
    const center = roomCenter(lastRoom);
    tiles[center.y][center.x] = Tile.StairsDown;
  }

  const visible: boolean[][] = [];
  const explored: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    visible[y] = new Array(width).fill(false);
    explored[y] = new Array(width).fill(false);
  }

  return {
    dungeon: { width, height, tiles, visible, explored },
    rooms,
  };
}
