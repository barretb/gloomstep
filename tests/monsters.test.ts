import { describe, it, expect } from 'vitest';
import { MONSTERS } from '../src/data/monsters';
import { getLootPool } from '../src/data/items';
import { computeDamage } from '../src/systems/damage';

describe('monster durability', () => {
  it('the toughest monster at each depth from 5 survives one max-roll best-weapon hit', () => {
    for (let depth = 5; depth <= 10; depth++) {
      const available = MONSTERS.filter((m) => m.minDepth <= depth);
      const toughest = Math.max(...available.map((m) => m.stats.maxHp));
      const bestWeapon = Math.max(...getLootPool(depth).map((e) => e.template.item.attackBonus ?? 0));
      // Warrior base 6, roughly one level per floor, best weapon in the pool.
      const playerAttack = 6 + depth + bestWeapon;
      const maxHit = computeDamage(playerAttack, 0, () => 0.999999);

      expect(toughest, `depth ${depth}`).toBeGreaterThan(maxHit);
    }
  });
});
