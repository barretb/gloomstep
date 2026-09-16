import { AbilityId } from '../types';

export type AbilityEffect =
  | { type: 'cleave' }
  | { type: 'bolt'; base: number; perLevel: number; range: number }
  | { type: 'buff'; stat: 'attack' | 'defense'; amount: number; turns: number }
  | { type: 'stealth'; turns: number }
  | { type: 'reveal'; radius: number }
  | { type: 'heal'; fraction: number };

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  /** One line, shown on the character select screen. */
  description: string;
  /** Turns between uses. */
  cooldown: number;
  effect: AbilityEffect;
}

export const ABILITIES: Record<AbilityId, AbilityDefinition> = {
  'cleave': {
    id: 'cleave',
    name: 'Cleave',
    description: 'Strike every adjacent enemy',
    cooldown: 10,
    effect: { type: 'cleave' },
  },
  'rage': {
    id: 'rage',
    name: 'Rage',
    description: '+3 ATK for 6 turns',
    cooldown: 15,
    effect: { type: 'buff', stat: 'attack', amount: 3, turns: 6 },
  },
  'arcane-bolt': {
    id: 'arcane-bolt',
    name: 'Arcane Bolt',
    description: '8 + level damage to the nearest enemy in sight',
    cooldown: 6,
    effect: { type: 'bolt', base: 8, perLevel: 1, range: 6 },
  },
  'vanish': {
    id: 'vanish',
    name: 'Vanish',
    description: 'Monsters lose sight of you for 5 turns',
    cooldown: 15,
    effect: { type: 'stealth', turns: 5 },
  },
  'survey': {
    id: 'survey',
    name: 'Survey',
    description: 'Reveal the map within 12 tiles',
    cooldown: 30,
    effect: { type: 'reveal', radius: 12 },
  },
  'guard-stance': {
    id: 'guard-stance',
    name: 'Guard Stance',
    description: '+4 DEF for 6 turns',
    cooldown: 15,
    effect: { type: 'buff', stat: 'defense', amount: 4, turns: 6 },
  },
  'mend': {
    id: 'mend',
    name: 'Mend',
    description: 'Heal 30% of max HP',
    cooldown: 12,
    effect: { type: 'heal', fraction: 0.3 },
  },
};
