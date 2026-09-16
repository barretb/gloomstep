export const TILE_SIZE = 32;

export const MAP_W = 60;
export const MAP_H = 40;

export const FOV_RADIUS = 8;

export const COLORS = {
  bg: '#0a0a1a',
  wall: '#4a4a6a',
  wallExplored: '#2a2a3a',
  floor: '#2a2a3a',
  floorExplored: '#1a1a2a',
  player: '#ffcc00',
  stairs: '#00ccff',
  hpBar: '#cc3333',
  hpBarBg: '#331111',
  xpBar: '#33cc33',
  text: '#cccccc',
  textBright: '#ffffff',
  textDim: '#666666',
  inventoryBg: 'rgba(10, 10, 26, 0.92)',
  inventoryBorder: '#4a4a6a',
} as const;
