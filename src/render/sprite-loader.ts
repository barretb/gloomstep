import { generatePlaceholderSprites } from './placeholder-sprites';
import { CHARACTERS } from '../data/characters';

export type SpriteMap = Map<string, HTMLImageElement>;

// All sprite slugs and their file paths relative to /sprites/
const SPRITE_PATHS: Record<string, string> = {
  // Tiles
  'wall': 'tiles/wall.png',
  'floor': 'tiles/floor.png',
  'stairs-down': 'tiles/stairs-down.png',
  // Player (default)
  'player': 'player.png',
  // Monsters — Depth 1
  'cave_bug': 'monsters/cave_bug.png',
  'snake': 'monsters/snake.png',
  'slug': 'monsters/Slug.png',
  'toad': 'monsters/toad.png',
  // Depth 2
  'boar': 'monsters/boar.png',
  'raptor': 'monsters/raptor.png',
  'sharpbeak': 'monsters/Sharpbeak.png',
  'wood_spider': 'monsters/wood_spider.png',
  // Depth 3
  'guard_goblin': 'monsters/guard_goblin.png',
  'cultist_goblin': 'monsters/cultist_goblin.png',
  'skeleton': 'monsters/skeleton.png',
  'imp': 'monsters/imp.png',
  // Depth 4
  'orc': 'monsters/orc.png',
  'orc_shaman': 'monsters/orc_shaman.png',
  'lizardman': 'monsters/lizardman.png',
  'scorpion': 'monsters/Scorpion.png',
  // Depth 5
  'troll': 'monsters/Troll.png',
  'werewolf': 'monsters/Werewolf.png',
  'lurker': 'monsters/Lurker.png',
  'minion': 'monsters/minion.png',
  // Depth 6
  'ghost': 'monsters/ghost.png',
  'cyclop': 'monsters/cyclop.png',
  'stone_spirit': 'monsters/stone_spirit.png',
  'yeti': 'monsters/yeti.png',
  // Depth 7
  'marsh_howler': 'monsters/marsh_howler.png',
  'swarm_soldier': 'monsters/Swarm_Soldier.png',
  'devourer': 'monsters/devourer.png',
  'metal_golem': 'monsters/Metal_golem.png',
  // Depth 8
  'demon_soldier': 'monsters/demon_soldier.png',
  'magma_demon': 'monsters/magma_demon.png',
  'forest_keeper': 'monsters/Forest_Keeper.png',
  'hermit': 'monsters/hermit.png',
  // Depth 9+
  'lich': 'monsters/lich.png',
  'abomination': 'monsters/abomination.png',
  'overlord': 'monsters/overlord.png',
  // Potions
  'potion-red': 'items/potion_red_005.png',
  'potion-blue': 'items/potion_blue_002.png',
  'potion-greater': 'items/potion2.png',
  'potion-elixir': 'items/potion3.png',
  // Scrolls
  'scroll-of-lightning': 'items/scroll-of-lightning.png',
  // Swords
  'sword-rusty': 'items/sword1.png',
  'sword-short': 'items/sword_006.png',
  'sword-long': 'items/sword2.png',
  'sword-broad': 'items/sword_011.png',
  'sword-bastard': 'items/sword_014.png',
  'sword-great': 'items/sword3.png',
  'sword-enchanted': 'items/sword_017.png',
  'sword-demon': 'items/sword_019.png',
  'sword-legendary': 'items/sword_024.png',
  // Axes
  'axe-hand': 'items/axe_001.png',
  'axe-battle': 'items/axe2.png',
  'axe-war': 'items/axe_025.png',
  // Hammers
  'hammer-war': 'items/hammer_001.png',
  'hammer-great': 'items/hammer_016.png',
  // Other weapons
  'bow': 'items/bow.png',
  'flail': 'items/flail.png',
  // Body armor
  'armor-light': 'items/armor_light.png',
  'armor-medium': 'items/armor_medium.png',
  'armor-heavy': 'items/armor_heavy.png',
  'armor-dragon': 'items/armor_heavy2.png',
  'armor-greaves': 'items/armor_grieves.png',
  // Shields
  'shield-wood': 'items/shield.png',
  'shield-iron': 'items/shield_007.png',
  'shield-tower': 'items/shield_010.png',
  // Helmets
  'helmet-leather': 'items/helmet.png',
  'helmet-iron': 'items/helmet2.png',
  // Gauntlets
  'gauntlets': 'items/gauntlets.png',
};

// Add character sprite paths
for (const char of CHARACTERS) {
  SPRITE_PATHS[char.sprite] = char.spriteFile;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Loads sprites from public/sprites/ PNGs.
 * Falls back to procedurally generated placeholders for any missing files.
 */
export async function loadSprites(): Promise<SpriteMap> {
  const placeholders = generatePlaceholderSprites();
  const sprites: SpriteMap = new Map(placeholders);

  // Try loading real PNGs, overriding placeholders where found
  const entries = Object.entries(SPRITE_PATHS);
  const results = await Promise.all(
    entries.map(async ([slug, path]) => {
      const img = await loadImage(`/sprites/${path}`);
      return [slug, img] as const;
    })
  );

  for (const [slug, img] of results) {
    if (img) {
      sprites.set(slug, img);
    }
  }

  return sprites;
}
