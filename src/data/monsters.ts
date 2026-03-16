import { AIComponent, Appearance, Stats } from '../types';

export interface MonsterTemplate {
  appearance: Appearance;
  stats: Stats;
  ai: AIComponent;
  xpValue: number;
  minDepth: number;
}

const MONSTERS: MonsterTemplate[] = [
  // -- Depth 1: Early vermin & critters --
  {
    appearance: { name: 'Cave Bug', char: 'b', color: '#668844', sprite: 'cave_bug' },
    stats: { hp: 3, maxHp: 3, attack: 2, defense: 0, level: 1, xp: 0, xpToNext: 0 },
    ai: { type: 'wander', alertRange: 4 },
    xpValue: 4,
    minDepth: 1,
  },
  {
    appearance: { name: 'Snake', char: 's', color: '#44aa44', sprite: 'snake' },
    stats: { hp: 4, maxHp: 4, attack: 3, defense: 0, level: 1, xp: 0, xpToNext: 0 },
    ai: { type: 'wander', alertRange: 5 },
    xpValue: 5,
    minDepth: 1,
  },
  {
    appearance: { name: 'Slug', char: 'S', color: '#88aa66', sprite: 'slug' },
    stats: { hp: 5, maxHp: 5, attack: 1, defense: 1, level: 1, xp: 0, xpToNext: 0 },
    ai: { type: 'wander', alertRange: 3 },
    xpValue: 4,
    minDepth: 1,
  },
  {
    appearance: { name: 'Toad', char: 't', color: '#44aa66', sprite: 'toad' },
    stats: { hp: 5, maxHp: 5, attack: 2, defense: 1, level: 1, xp: 0, xpToNext: 0 },
    ai: { type: 'wander', alertRange: 4 },
    xpValue: 5,
    minDepth: 1,
  },
  // -- Depth 2: Beasts & small threats --
  {
    appearance: { name: 'Boar', char: 'B', color: '#886644', sprite: 'boar' },
    stats: { hp: 8, maxHp: 8, attack: 4, defense: 1, level: 2, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 10,
    minDepth: 2,
  },
  {
    appearance: { name: 'Raptor', char: 'R', color: '#aa6644', sprite: 'raptor' },
    stats: { hp: 6, maxHp: 6, attack: 5, defense: 0, level: 2, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 7 },
    xpValue: 10,
    minDepth: 2,
  },
  {
    appearance: { name: 'Sharpbeak', char: 's', color: '#ccaa44', sprite: 'sharpbeak' },
    stats: { hp: 5, maxHp: 5, attack: 4, defense: 0, level: 2, xp: 0, xpToNext: 0 },
    ai: { type: 'wander', alertRange: 8 },
    xpValue: 8,
    minDepth: 2,
  },
  {
    appearance: { name: 'Wood Spider', char: 'w', color: '#664422', sprite: 'wood_spider' },
    stats: { hp: 6, maxHp: 6, attack: 3, defense: 1, level: 2, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 5 },
    xpValue: 8,
    minDepth: 2,
  },
  // -- Depth 3: Humanoids & warriors --
  {
    appearance: { name: 'Goblin Guard', char: 'g', color: '#44aa44', sprite: 'guard_goblin' },
    stats: { hp: 8, maxHp: 8, attack: 4, defense: 2, level: 3, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 7 },
    xpValue: 14,
    minDepth: 3,
  },
  {
    appearance: { name: 'Cultist Goblin', char: 'c', color: '#448844', sprite: 'cultist_goblin' },
    stats: { hp: 7, maxHp: 7, attack: 5, defense: 1, level: 3, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 12,
    minDepth: 3,
  },
  {
    appearance: { name: 'Skeleton', char: 'S', color: '#ccccbb', sprite: 'skeleton' },
    stats: { hp: 10, maxHp: 10, attack: 5, defense: 2, level: 3, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 15,
    minDepth: 3,
  },
  {
    appearance: { name: 'Imp', char: 'i', color: '#cc4444', sprite: 'imp' },
    stats: { hp: 6, maxHp: 6, attack: 6, defense: 0, level: 3, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 8 },
    xpValue: 13,
    minDepth: 3,
  },
  // -- Depth 4: Tougher creatures --
  {
    appearance: { name: 'Orc', char: 'O', color: '#448844', sprite: 'orc' },
    stats: { hp: 16, maxHp: 16, attack: 6, defense: 3, level: 4, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 22,
    minDepth: 4,
  },
  {
    appearance: { name: 'Orc Shaman', char: 'o', color: '#44aa44', sprite: 'orc_shaman' },
    stats: { hp: 12, maxHp: 12, attack: 7, defense: 1, level: 4, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 8 },
    xpValue: 24,
    minDepth: 4,
  },
  {
    appearance: { name: 'Lizardman', char: 'L', color: '#44aa88', sprite: 'lizardman' },
    stats: { hp: 14, maxHp: 14, attack: 6, defense: 2, level: 4, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 7 },
    xpValue: 20,
    minDepth: 4,
  },
  {
    appearance: { name: 'Scorpion', char: 'S', color: '#aa6622', sprite: 'scorpion' },
    stats: { hp: 12, maxHp: 12, attack: 7, defense: 2, level: 4, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 5 },
    xpValue: 20,
    minDepth: 4,
  },
  // -- Depth 5: Serious threats --
  {
    appearance: { name: 'Troll', char: 'T', color: '#228822', sprite: 'troll' },
    stats: { hp: 24, maxHp: 24, attack: 8, defense: 3, level: 5, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 5 },
    xpValue: 35,
    minDepth: 5,
  },
  {
    appearance: { name: 'Werewolf', char: 'W', color: '#887766', sprite: 'werewolf' },
    stats: { hp: 20, maxHp: 20, attack: 9, defense: 2, level: 5, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 8 },
    xpValue: 35,
    minDepth: 5,
  },
  {
    appearance: { name: 'Lurker', char: 'L', color: '#556688', sprite: 'lurker' },
    stats: { hp: 18, maxHp: 18, attack: 8, defense: 3, level: 5, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 4 },
    xpValue: 30,
    minDepth: 5,
  },
  {
    appearance: { name: 'Minion', char: 'm', color: '#884488', sprite: 'minion' },
    stats: { hp: 14, maxHp: 14, attack: 7, defense: 2, level: 5, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 7 },
    xpValue: 25,
    minDepth: 5,
  },
  // -- Depth 6: Dangerous elites --
  {
    appearance: { name: 'Ghost', char: 'G', color: '#8888cc', sprite: 'ghost' },
    stats: { hp: 16, maxHp: 16, attack: 10, defense: 1, level: 6, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 10 },
    xpValue: 40,
    minDepth: 6,
  },
  {
    appearance: { name: 'Cyclops', char: 'C', color: '#aa8866', sprite: 'cyclop' },
    stats: { hp: 28, maxHp: 28, attack: 10, defense: 3, level: 6, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 5 },
    xpValue: 45,
    minDepth: 6,
  },
  {
    appearance: { name: 'Stone Spirit', char: 'S', color: '#888899', sprite: 'stone_spirit' },
    stats: { hp: 22, maxHp: 22, attack: 8, defense: 5, level: 6, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 5 },
    xpValue: 40,
    minDepth: 6,
  },
  {
    appearance: { name: 'Yeti', char: 'Y', color: '#aabbcc', sprite: 'yeti' },
    stats: { hp: 26, maxHp: 26, attack: 9, defense: 4, level: 6, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 42,
    minDepth: 6,
  },
  // -- Depth 7: Deadly --
  {
    appearance: { name: 'Marsh Howler', char: 'M', color: '#448866', sprite: 'marsh_howler' },
    stats: { hp: 24, maxHp: 24, attack: 11, defense: 3, level: 7, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 8 },
    xpValue: 50,
    minDepth: 7,
  },
  {
    appearance: { name: 'Swarm Soldier', char: 'S', color: '#886644', sprite: 'swarm_soldier' },
    stats: { hp: 20, maxHp: 20, attack: 10, defense: 4, level: 7, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 7 },
    xpValue: 45,
    minDepth: 7,
  },
  {
    appearance: { name: 'Devourer', char: 'D', color: '#aa4466', sprite: 'devourer' },
    stats: { hp: 22, maxHp: 22, attack: 12, defense: 2, level: 7, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 50,
    minDepth: 7,
  },
  {
    appearance: { name: 'Metal Golem', char: 'G', color: '#888899', sprite: 'metal_golem' },
    stats: { hp: 30, maxHp: 30, attack: 9, defense: 6, level: 7, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 4 },
    xpValue: 50,
    minDepth: 7,
  },
  // -- Depth 8: Hellish --
  {
    appearance: { name: 'Demon Soldier', char: 'D', color: '#cc3333', sprite: 'demon_soldier' },
    stats: { hp: 28, maxHp: 28, attack: 12, defense: 4, level: 8, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 7 },
    xpValue: 60,
    minDepth: 8,
  },
  {
    appearance: { name: 'Magma Demon', char: 'M', color: '#ff6622', sprite: 'magma_demon' },
    stats: { hp: 26, maxHp: 26, attack: 14, defense: 3, level: 8, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 65,
    minDepth: 8,
  },
  {
    appearance: { name: 'Forest Keeper', char: 'F', color: '#44aa44', sprite: 'forest_keeper' },
    stats: { hp: 32, maxHp: 32, attack: 11, defense: 5, level: 8, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 60,
    minDepth: 8,
  },
  {
    appearance: { name: 'Hermit', char: 'H', color: '#aa8844', sprite: 'hermit' },
    stats: { hp: 20, maxHp: 20, attack: 13, defense: 2, level: 8, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 9 },
    xpValue: 55,
    minDepth: 8,
  },
  // -- Depth 9+: Bosses & endgame --
  {
    appearance: { name: 'Lich', char: 'L', color: '#aa44ff', sprite: 'lich' },
    stats: { hp: 30, maxHp: 30, attack: 14, defense: 4, level: 9, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 10 },
    xpValue: 75,
    minDepth: 9,
  },
  {
    appearance: { name: 'Abomination', char: 'A', color: '#884466', sprite: 'abomination' },
    stats: { hp: 36, maxHp: 36, attack: 13, defense: 5, level: 9, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 6 },
    xpValue: 80,
    minDepth: 9,
  },
  {
    appearance: { name: 'Overlord', char: 'O', color: '#cc2222', sprite: 'overlord' },
    stats: { hp: 40, maxHp: 40, attack: 15, defense: 5, level: 10, xp: 0, xpToNext: 0 },
    ai: { type: 'chase', alertRange: 8 },
    xpValue: 100,
    minDepth: 10,
  },
];

export function getMonsterTemplate(depth: number): MonsterTemplate {
  const available = MONSTERS.filter((m) => m.minDepth <= depth);
  // Weight toward harder monsters at deeper levels
  const weighted = available.flatMap((m) => {
    const relevance = depth - m.minDepth;
    const weight = relevance < 2 ? 3 : relevance < 4 ? 2 : 1;
    return Array(weight).fill(m);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}
