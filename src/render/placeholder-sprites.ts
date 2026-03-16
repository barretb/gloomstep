import { TILE_SIZE } from '../constants';

type SpriteMap = Map<string, HTMLImageElement>;

// Simple pixel art drawing helpers
function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function canvasToImage(canvas: HTMLCanvasElement): HTMLImageElement {
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}

// -- Tile sprites --

function drawWall(): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const s = TILE_SIZE;
  // Stone wall with brick pattern
  ctx.fillStyle = '#4a4a6a';
  ctx.fillRect(0, 0, s, s);
  // Brick lines
  ctx.fillStyle = '#3a3a5a';
  ctx.fillRect(0, Math.floor(s * 0.33) - 1, s, 2);
  ctx.fillRect(0, Math.floor(s * 0.66) - 1, s, 2);
  // Vertical mortar lines (offset per row)
  ctx.fillRect(Math.floor(s * 0.5) - 1, 0, 2, Math.floor(s * 0.33) - 1);
  ctx.fillRect(Math.floor(s * 0.25) - 1, Math.floor(s * 0.33) + 1, 2, Math.floor(s * 0.33) - 2);
  ctx.fillRect(Math.floor(s * 0.75) - 1, Math.floor(s * 0.33) + 1, 2, Math.floor(s * 0.33) - 2);
  ctx.fillRect(Math.floor(s * 0.5) - 1, Math.floor(s * 0.66) + 1, 2, s - Math.floor(s * 0.66) - 1);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, s, 2);
  return canvasToImage(c);
}

function drawFloor(): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const s = TILE_SIZE;
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(0, 0, s, s);
  // Subtle stone tile pattern
  ctx.fillStyle = '#252535';
  ctx.fillRect(0, 0, Math.floor(s / 2) - 1, Math.floor(s / 2) - 1);
  ctx.fillRect(Math.floor(s / 2) + 1, Math.floor(s / 2) + 1, Math.floor(s / 2) - 1, Math.floor(s / 2) - 1);
  // Tiny specks
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(Math.floor(s * 0.25), Math.floor(s * 0.25), 1, 1);
  ctx.fillRect(Math.floor(s * 0.75), Math.floor(s * 0.6), 1, 1);
  return canvasToImage(c);
}

function drawStairsDown(): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const s = TILE_SIZE;
  // Floor background
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(0, 0, s, s);
  // Stair steps descending
  const steps = 4;
  const stepH = Math.floor(s / (steps + 1));
  for (let i = 0; i < steps; i++) {
    const shade = 60 - i * 12;
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 20})`;
    const x = Math.floor(s * 0.2) + i * 2;
    const y = Math.floor(s * 0.15) + i * stepH;
    const w = s - Math.floor(s * 0.4) - i * 4;
    ctx.fillRect(x, y, w, stepH - 1);
  }
  // Arrow hint
  ctx.fillStyle = '#00ccff';
  const cx = Math.floor(s / 2);
  const by = s - 4;
  ctx.fillRect(cx - 1, by - 4, 2, 4);
  ctx.fillRect(cx - 3, by - 2, 6, 1);
  return canvasToImage(c);
}

// -- Player --

function drawPlayer(): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const s = TILE_SIZE;
  const u = Math.floor(s / 16); // unit size

  // Body
  ctx.fillStyle = '#ddaa22';
  ctx.fillRect(6 * u, 3 * u, 4 * u, 3 * u); // head
  ctx.fillRect(5 * u, 6 * u, 6 * u, 5 * u); // torso
  ctx.fillRect(5 * u, 11 * u, 2 * u, 3 * u); // left leg
  ctx.fillRect(9 * u, 11 * u, 2 * u, 3 * u); // right leg
  ctx.fillRect(3 * u, 7 * u, 2 * u, 4 * u); // left arm
  ctx.fillRect(11 * u, 7 * u, 2 * u, 4 * u); // right arm

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(7 * u, 4 * u, u, u);
  ctx.fillRect(9 * u, 4 * u, u, u);

  // Sword in right hand
  ctx.fillStyle = '#aab8cc';
  ctx.fillRect(12 * u, 4 * u, u, 7 * u);
  ctx.fillStyle = '#887744';
  ctx.fillRect(11 * u, 10 * u, 3 * u, u);

  return canvasToImage(c);
}

// -- Generic monster placeholder --

function drawMonsterPlaceholder(color: string, char: string): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const s = TILE_SIZE;
  // Body silhouette
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(s * 0.25), Math.floor(s * 0.15), Math.floor(s * 0.5), Math.floor(s * 0.7));
  // Head
  ctx.fillRect(Math.floor(s * 0.3), Math.floor(s * 0.1), Math.floor(s * 0.4), Math.floor(s * 0.3));
  // Eyes
  ctx.fillStyle = '#ff3333';
  ctx.fillRect(Math.floor(s * 0.35), Math.floor(s * 0.2), 2, 2);
  ctx.fillRect(Math.floor(s * 0.55), Math.floor(s * 0.2), 2, 2);
  // Character label
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(s * 0.4)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, Math.floor(s / 2), Math.floor(s * 0.55));
  return canvasToImage(c);
}

// -- Items --

function drawHealthPotion(color: string): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const u = Math.floor(TILE_SIZE / 16);
  // Bottle
  ctx.fillStyle = '#666';
  ctx.fillRect(7 * u, 3 * u, 2 * u, 2 * u); // cork
  ctx.fillStyle = color;
  ctx.fillRect(5 * u, 5 * u, 6 * u, 7 * u); // body
  ctx.fillRect(6 * u, 5 * u, 4 * u, 8 * u);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(6 * u, 6 * u, u, 4 * u);
  // Label
  ctx.fillStyle = '#fff';
  ctx.fillRect(7 * u, 8 * u, 2 * u, u);
  return canvasToImage(c);
}

function drawSword(color: string, length: number): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const u = Math.floor(TILE_SIZE / 16);
  // Blade
  ctx.fillStyle = color;
  ctx.fillRect(7 * u, (3 + (4 - length)) * u, 2 * u, (length + 4) * u);
  // Tip
  ctx.fillRect(8 * u, (2 + (4 - length)) * u, u, u);
  // Cross guard
  ctx.fillStyle = '#887744';
  ctx.fillRect(5 * u, (7 + (4 - length)) * u + length * u, 6 * u, u);
  // Handle
  ctx.fillStyle = '#664422';
  ctx.fillRect(7 * u, (8 + (4 - length)) * u + length * u, 2 * u, 3 * u);
  // Pommel
  ctx.fillStyle = '#887744';
  ctx.fillRect(7 * u, (11 + (4 - length)) * u + length * u, 2 * u, u);
  return canvasToImage(c);
}

function drawArmor(color: string, weight: number): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const u = Math.floor(TILE_SIZE / 16);
  // Main body
  ctx.fillStyle = color;
  ctx.fillRect(4 * u, 3 * u, 8 * u, 8 * u);
  // Shoulders
  ctx.fillRect(3 * u, 3 * u, 2 * u, 3 * u);
  ctx.fillRect(11 * u, 3 * u, 2 * u, 3 * u);
  // Neck hole
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(6 * u, 3 * u, 4 * u, 2 * u);
  // Arm holes
  ctx.fillRect(4 * u, 6 * u, u, 3 * u);
  ctx.fillRect(11 * u, 6 * u, u, 3 * u);
  // Detail lines based on weight
  if (weight >= 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(5 * u, 6 * u, 6 * u, u);
    ctx.fillRect(5 * u, 8 * u, 6 * u, u);
  }
  if (weight >= 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(5 * u, 4 * u, 6 * u, u);
    ctx.fillRect(5 * u, 10 * u, 6 * u, u);
  }
  return canvasToImage(c);
}

function drawScroll(): HTMLImageElement {
  const [c, ctx] = createCanvas();
  const u = Math.floor(TILE_SIZE / 16);
  // Scroll body
  ctx.fillStyle = '#ddcc88';
  ctx.fillRect(5 * u, 4 * u, 6 * u, 8 * u);
  // Roll ends
  ctx.fillStyle = '#aa9955';
  ctx.fillRect(4 * u, 4 * u, 8 * u, 2 * u);
  ctx.fillRect(4 * u, 10 * u, 8 * u, 2 * u);
  // Lightning symbol
  ctx.fillStyle = '#ffff44';
  ctx.fillRect(8 * u, 5 * u, 2 * u, u);
  ctx.fillRect(7 * u, 6 * u, 2 * u, u);
  ctx.fillRect(6 * u, 7 * u, 3 * u, u);
  ctx.fillRect(7 * u, 8 * u, 2 * u, u);
  ctx.fillRect(6 * u, 9 * u, 2 * u, u);
  return canvasToImage(c);
}

// -- Generate all placeholders --

export function generatePlaceholderSprites(): SpriteMap {
  const map: SpriteMap = new Map();

  // Tiles
  map.set('wall', drawWall());
  map.set('floor', drawFloor());
  map.set('stairs-down', drawStairsDown());

  // Player
  map.set('player', drawPlayer());

  // Monster placeholders (fallback if PNGs fail to load)
  const monsterDefs: [string, string, string][] = [
    // [slug, color, char]
    ['cave_bug', '#668844', 'b'], ['snake', '#44aa44', 's'],
    ['slug', '#88aa66', 'S'], ['toad', '#44aa66', 't'],
    ['boar', '#886644', 'B'], ['raptor', '#aa6644', 'R'],
    ['sharpbeak', '#ccaa44', 's'], ['wood_spider', '#664422', 'w'],
    ['guard_goblin', '#44aa44', 'g'], ['cultist_goblin', '#448844', 'c'],
    ['skeleton', '#ccccbb', 'S'], ['imp', '#cc4444', 'i'],
    ['orc', '#448844', 'O'], ['orc_shaman', '#44aa44', 'o'],
    ['lizardman', '#44aa88', 'L'], ['scorpion', '#aa6622', 'S'],
    ['troll', '#228822', 'T'], ['werewolf', '#887766', 'W'],
    ['lurker', '#556688', 'L'], ['minion', '#884488', 'm'],
    ['ghost', '#8888cc', 'G'], ['cyclop', '#aa8866', 'C'],
    ['stone_spirit', '#888899', 'S'], ['yeti', '#aabbcc', 'Y'],
    ['marsh_howler', '#448866', 'M'], ['swarm_soldier', '#886644', 'S'],
    ['devourer', '#aa4466', 'D'], ['metal_golem', '#888899', 'G'],
    ['demon_soldier', '#cc3333', 'D'], ['magma_demon', '#ff6622', 'M'],
    ['forest_keeper', '#44aa44', 'F'], ['hermit', '#aa8844', 'H'],
    ['lich', '#aa44ff', 'L'], ['abomination', '#884466', 'A'],
    ['overlord', '#cc2222', 'O'],
  ];
  for (const [slug, color, char] of monsterDefs) {
    map.set(slug, drawMonsterPlaceholder(color, char));
  }

  // Potions
  map.set('potion-red', drawHealthPotion('#cc3333'));
  map.set('potion-blue', drawHealthPotion('#3366cc'));
  map.set('potion-greater', drawHealthPotion('#ff4444'));
  map.set('potion-elixir', drawHealthPotion('#44ff88'));
  // Scrolls
  map.set('scroll-of-lightning', drawScroll());
  // Swords
  map.set('sword-rusty', drawSword('#997766', 2));
  map.set('sword-short', drawSword('#aaaacc', 2));
  map.set('sword-long', drawSword('#ccccee', 3));
  map.set('sword-broad', drawSword('#bbbbdd', 3));
  map.set('sword-bastard', drawSword('#ddddff', 3));
  map.set('sword-great', drawSword('#eeeeff', 4));
  map.set('sword-enchanted', drawSword('#88aaff', 4));
  map.set('sword-demon', drawSword('#ff4444', 4));
  map.set('sword-legendary', drawSword('#ffcc44', 4));
  // Axes (reuse sword shape with different color)
  map.set('axe-hand', drawSword('#aa8855', 2));
  map.set('axe-battle', drawSword('#ccaa66', 3));
  map.set('axe-war', drawSword('#ddbb77', 4));
  // Hammers
  map.set('hammer-war', drawSword('#999999', 3));
  map.set('hammer-great', drawSword('#bbbbbb', 4));
  // Other weapons
  map.set('bow', drawSword('#aa8844', 3));
  map.set('flail', drawSword('#aaaaaa', 3));
  // Body armor
  map.set('armor-light', drawArmor('#aa7744', 1));
  map.set('armor-medium', drawArmor('#888899', 2));
  map.set('armor-heavy', drawArmor('#aaaacc', 3));
  map.set('armor-dragon', drawArmor('#cc6644', 3));
  map.set('armor-greaves', drawArmor('#888888', 1));
  // Shields
  map.set('shield-wood', drawArmor('#aa8844', 1));
  map.set('shield-iron', drawArmor('#8888aa', 2));
  map.set('shield-tower', drawArmor('#aabbcc', 3));
  // Helmets
  map.set('helmet-leather', drawArmor('#aa7744', 1));
  map.set('helmet-iron', drawArmor('#8888aa', 2));
  // Gauntlets
  map.set('gauntlets', drawArmor('#8888aa', 1));

  return map;
}
