import { describe, it, expect } from 'vitest';
import { ABILITIES } from '../src/data/abilities';
import { CHARACTERS } from '../src/data/characters';

describe('ability data', () => {
  it('gives every character a defined ability', () => {
    for (const character of CHARACTERS) {
      expect(ABILITIES[character.ability], character.name).toBeDefined();
    }
  });

  it('gives every ability a positive cooldown', () => {
    for (const ability of Object.values(ABILITIES)) {
      expect(ability.cooldown, ability.name).toBeGreaterThan(0);
    }
  });

  it('maps each class to exactly one ability and each ability to one class', () => {
    const byClass = new Map<string, string>();
    for (const character of CHARACTERS) {
      const existing = byClass.get(character.className);
      if (existing) {
        expect(existing, character.name).toBe(character.ability);
      } else {
        byClass.set(character.className, character.ability);
      }
    }
    expect(new Set(byClass.values()).size).toBe(byClass.size);
    expect(byClass.size).toBe(7);
  });
});
