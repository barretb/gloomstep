import { Tile } from '../types';

export function isWalkable(tile: Tile): boolean {
  return tile === Tile.Floor || tile === Tile.StairsDown;
}

export function isOpaque(tile: Tile): boolean {
  return tile === Tile.Wall;
}
