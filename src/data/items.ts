import { Appearance, ItemComponent } from '../types';

export interface ItemTemplate {
  appearance: Appearance;
  item: ItemComponent;
  minDepth: number;
}

const ITEMS: ItemTemplate[] = [
  // ── Potions ──────────────────────────────────────────────
  {
    appearance: { name: 'Health Potion', char: '!', color: '#cc3333', sprite: 'potion-red' },
    item: { kind: 'potion', useEffect: { type: 'heal', amount: 8 } },
    minDepth: 1,
  },
  {
    appearance: { name: 'Mana Tonic', char: '!', color: '#3366cc', sprite: 'potion-blue' },
    item: { kind: 'potion', useEffect: { type: 'heal', amount: 12 } },
    minDepth: 2,
  },
  {
    appearance: { name: 'Greater Health Potion', char: '!', color: '#ff4444', sprite: 'potion-greater' },
    item: { kind: 'potion', useEffect: { type: 'heal', amount: 20 } },
    minDepth: 4,
  },
  {
    appearance: { name: 'Elixir of Vitality', char: '!', color: '#44ff88', sprite: 'potion-elixir' },
    item: { kind: 'potion', useEffect: { type: 'heal', amount: 30 } },
    minDepth: 7,
  },

  // ── Scrolls ──────────────────────────────────────────────
  {
    appearance: { name: 'Scroll of Lightning', char: '?', color: '#ffff44', sprite: 'scroll-of-lightning' },
    item: { kind: 'scroll', useEffect: { type: 'damage', amount: 12, range: 5 } },
    minDepth: 2,
  },

  // ── Swords ───────────────────────────────────────────────
  {
    appearance: { name: 'Rusty Sword', char: '/', color: '#997766', sprite: 'sword-rusty' },
    item: { kind: 'weapon', attackBonus: 1 },
    minDepth: 1,
  },
  {
    appearance: { name: 'Short Sword', char: '/', color: '#aaaacc', sprite: 'sword-short' },
    item: { kind: 'weapon', attackBonus: 2 },
    minDepth: 1,
  },
  {
    appearance: { name: 'Long Sword', char: '/', color: '#ccccee', sprite: 'sword-long' },
    item: { kind: 'weapon', attackBonus: 4 },
    minDepth: 3,
  },
  {
    appearance: { name: 'Broadsword', char: '/', color: '#bbbbdd', sprite: 'sword-broad' },
    item: { kind: 'weapon', attackBonus: 5 },
    minDepth: 4,
  },
  {
    appearance: { name: 'Bastard Sword', char: '/', color: '#ddddff', sprite: 'sword-bastard' },
    item: { kind: 'weapon', attackBonus: 6 },
    minDepth: 5,
  },
  {
    appearance: { name: 'Great Sword', char: '/', color: '#eeeeff', sprite: 'sword-great' },
    item: { kind: 'weapon', attackBonus: 8 },
    minDepth: 6,
  },
  {
    appearance: { name: 'Enchanted Blade', char: '/', color: '#88aaff', sprite: 'sword-enchanted' },
    item: { kind: 'weapon', attackBonus: 10 },
    minDepth: 7,
  },
  {
    appearance: { name: 'Demon Sword', char: '/', color: '#ff4444', sprite: 'sword-demon' },
    item: { kind: 'weapon', attackBonus: 12 },
    minDepth: 8,
  },
  {
    appearance: { name: 'Legendary Blade', char: '/', color: '#ffcc44', sprite: 'sword-legendary' },
    item: { kind: 'weapon', attackBonus: 15 },
    minDepth: 9,
  },

  // ── Axes ─────────────────────────────────────────────────
  {
    appearance: { name: 'Hand Axe', char: ')', color: '#aa8855', sprite: 'axe-hand' },
    item: { kind: 'weapon', attackBonus: 3 },
    minDepth: 2,
  },
  {
    appearance: { name: 'Battle Axe', char: ')', color: '#ccaa66', sprite: 'axe-battle' },
    item: { kind: 'weapon', attackBonus: 6 },
    minDepth: 4,
  },
  {
    appearance: { name: 'War Axe', char: ')', color: '#ddbb77', sprite: 'axe-war' },
    item: { kind: 'weapon', attackBonus: 9 },
    minDepth: 7,
  },

  // ── Hammers ──────────────────────────────────────────────
  {
    appearance: { name: 'War Hammer', char: 'T', color: '#999999', sprite: 'hammer-war' },
    item: { kind: 'weapon', attackBonus: 4 },
    minDepth: 3,
  },
  {
    appearance: { name: 'Great Hammer', char: 'T', color: '#bbbbbb', sprite: 'hammer-great' },
    item: { kind: 'weapon', attackBonus: 8 },
    minDepth: 6,
  },

  // ── Other Weapons ────────────────────────────────────────
  {
    appearance: { name: 'Hunting Bow', char: '}', color: '#aa8844', sprite: 'bow' },
    item: { kind: 'weapon', attackBonus: 3 },
    minDepth: 2,
  },
  {
    appearance: { name: 'Flail', char: '&', color: '#aaaaaa', sprite: 'flail' },
    item: { kind: 'weapon', attackBonus: 7 },
    minDepth: 5,
  },

  // ── Body Armor ───────────────────────────────────────────
  {
    appearance: { name: 'Leather Armor', char: '[', color: '#aa7744', sprite: 'armor-light' },
    item: { kind: 'armor', defenseBonus: 1 },
    minDepth: 1,
  },
  {
    appearance: { name: 'Chain Mail', char: '[', color: '#888899', sprite: 'armor-medium' },
    item: { kind: 'armor', defenseBonus: 3 },
    minDepth: 3,
  },
  {
    appearance: { name: 'Plate Armor', char: '[', color: '#aaaacc', sprite: 'armor-heavy' },
    item: { kind: 'armor', defenseBonus: 5 },
    minDepth: 5,
  },
  {
    appearance: { name: 'Dragon Armor', char: '[', color: '#cc6644', sprite: 'armor-dragon' },
    item: { kind: 'armor', defenseBonus: 7 },
    minDepth: 8,
  },
  {
    appearance: { name: 'Greaves', char: '[', color: '#888888', sprite: 'armor-greaves' },
    item: { kind: 'armor', defenseBonus: 2 },
    minDepth: 2,
  },

  // ── Shields ──────────────────────────────────────────────
  {
    appearance: { name: 'Wooden Shield', char: '(', color: '#aa8844', sprite: 'shield-wood' },
    item: { kind: 'armor', defenseBonus: 1 },
    minDepth: 1,
  },
  {
    appearance: { name: 'Iron Shield', char: '(', color: '#8888aa', sprite: 'shield-iron' },
    item: { kind: 'armor', defenseBonus: 3 },
    minDepth: 3,
  },
  {
    appearance: { name: 'Tower Shield', char: '(', color: '#aabbcc', sprite: 'shield-tower' },
    item: { kind: 'armor', defenseBonus: 5 },
    minDepth: 6,
  },

  // ── Helmets ──────────────────────────────────────────────
  {
    appearance: { name: 'Leather Helmet', char: '^', color: '#aa7744', sprite: 'helmet-leather' },
    item: { kind: 'armor', defenseBonus: 1 },
    minDepth: 2,
  },
  {
    appearance: { name: 'Iron Helmet', char: '^', color: '#8888aa', sprite: 'helmet-iron' },
    item: { kind: 'armor', defenseBonus: 2 },
    minDepth: 4,
  },

  // ── Gauntlets ────────────────────────────────────────────
  {
    appearance: { name: 'Iron Gauntlets', char: '{', color: '#8888aa', sprite: 'gauntlets' },
    item: { kind: 'armor', defenseBonus: 2 },
    minDepth: 4,
  },
];

export function getRandomItem(depth: number): ItemTemplate {
  const available = ITEMS.filter((i) => i.minDepth <= depth);
  return available[Math.floor(Math.random() * available.length)];
}
