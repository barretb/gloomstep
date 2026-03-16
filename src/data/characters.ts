import { Stats } from '../types';

export interface CharacterTemplate {
  id: string;
  name: string;
  race: string;
  className: string;
  sprite: string;       // slug for sprite map
  spriteFile: string;   // filename in public/sprites/
  stats: Stats;
}

export const CHARACTERS: CharacterTemplate[] = [
  // Humans
  {
    id: 'h_warrior_male', name: 'Human Warrior', race: 'Human', className: 'Warrior',
    sprite: 'h_warrior_male', spriteFile: 'h_warrior_male.png',
    stats: { hp: 35, maxHp: 35, attack: 6, defense: 3, level: 1, xp: 0, xpToNext: 20 },
  },
  {
    id: 'h_warrior_female', name: 'Human Warrior', race: 'Human', className: 'Warrior',
    sprite: 'h_warrior_female', spriteFile: 'h_warrior_female.png',
    stats: { hp: 35, maxHp: 35, attack: 6, defense: 3, level: 1, xp: 0, xpToNext: 20 },
  },
  {
    id: 'h_barbarian_male', name: 'Human Barbarian', race: 'Human', className: 'Barbarian',
    sprite: 'h_barbarian_male', spriteFile: 'h_barbarian_male.png',
    stats: { hp: 40, maxHp: 40, attack: 7, defense: 1, level: 1, xp: 0, xpToNext: 20 },
  },
  {
    id: 'h_mage_male', name: 'Human Mage', race: 'Human', className: 'Mage',
    sprite: 'h_mage_male', spriteFile: 'h_mage_male.png',
    stats: { hp: 22, maxHp: 22, attack: 4, defense: 1, level: 1, xp: 0, xpToNext: 18 },
  },
  {
    id: 'h_mage_female', name: 'Human Mage', race: 'Human', className: 'Mage',
    sprite: 'h_mage_female', spriteFile: 'h_mage_female.png',
    stats: { hp: 22, maxHp: 22, attack: 4, defense: 1, level: 1, xp: 0, xpToNext: 18 },
  },
  {
    id: 'h_rogue_male', name: 'Human Rogue', race: 'Human', className: 'Rogue',
    sprite: 'h_rogue_male', spriteFile: 'h_rogue_male.png',
    stats: { hp: 26, maxHp: 26, attack: 5, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
  {
    id: 'h_rogue_female', name: 'Human Rogue', race: 'Human', className: 'Rogue',
    sprite: 'h_rogue_female', spriteFile: 'h_rogue_female.png',
    stats: { hp: 26, maxHp: 26, attack: 5, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
  {
    id: 'h_scout_male', name: 'Human Scout', race: 'Human', className: 'Scout',
    sprite: 'h_scout_male', spriteFile: 'h_scout_male.png',
    stats: { hp: 28, maxHp: 28, attack: 4, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
  // Elves
  {
    id: 'elf_sentinel_male', name: 'Elf Sentinel', race: 'Elf', className: 'Sentinel',
    sprite: 'elf_sentinel_male', spriteFile: 'elf_sentinel_male.png',
    stats: { hp: 24, maxHp: 24, attack: 5, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
  {
    id: 'elf_sentinel_female', name: 'Elf Sentinel', race: 'Elf', className: 'Sentinel',
    sprite: 'elf_sentinel_female', spriteFile: 'elf_sentinel_female.png',
    stats: { hp: 24, maxHp: 24, attack: 5, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
  // Dwarves
  {
    id: 'dwarf_warrior_male', name: 'Dwarf Warrior', race: 'Dwarf', className: 'Warrior',
    sprite: 'Dwarf_warrior_male', spriteFile: 'Dwarf_warrior_male.png',
    stats: { hp: 38, maxHp: 38, attack: 5, defense: 4, level: 1, xp: 0, xpToNext: 22 },
  },
  {
    id: 'dwarf_warrior_female', name: 'Dwarf Warrior', race: 'Dwarf', className: 'Warrior',
    sprite: 'Dwarf_warrior_female', spriteFile: 'Dwarf_warrior_female.png',
    stats: { hp: 38, maxHp: 38, attack: 5, defense: 4, level: 1, xp: 0, xpToNext: 22 },
  },
  {
    id: 'dwarven_healer_female', name: 'Dwarven Healer', race: 'Dwarf', className: 'Healer',
    sprite: 'Dwarven_healer_female', spriteFile: 'Dwarven_healer_female.png',
    stats: { hp: 32, maxHp: 32, attack: 3, defense: 3, level: 1, xp: 0, xpToNext: 20 },
  },
  // Drow
  {
    id: 'drow_warrior_male', name: 'Drow Warrior', race: 'Drow', className: 'Warrior',
    sprite: 'drow_warrior_male', spriteFile: 'drow_warrior_male.png',
    stats: { hp: 28, maxHp: 28, attack: 6, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
  {
    id: 'drow_warrior_female', name: 'Drow Warrior', race: 'Drow', className: 'Warrior',
    sprite: 'drow_warrior_female', spriteFile: 'drow_warrior_female.png',
    stats: { hp: 28, maxHp: 28, attack: 6, defense: 2, level: 1, xp: 0, xpToNext: 18 },
  },
];
