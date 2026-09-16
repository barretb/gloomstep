/** Damage rolls vary between these fractions of the mitigated value. */
const ROLL_MIN = 0.8;
const ROLL_MAX = 1.2;

/**
 * Damage dealt by `attack` into `defense`.
 *
 * Defense mitigates proportionally rather than subtracting: the base value is
 * attack * attack / (attack + defense), so equal defense halves the hit and
 * further defense keeps helping with diminishing returns. It never bottoms
 * out, which keeps armor meaningful without making the player immune.
 *
 * The result is then scaled by a roll between 80% and 120%, rounded, and
 * floored at 1.
 */
export function computeDamage(attack: number, defense: number, rng: () => number = Math.random): number {
  const atk = Math.max(0, attack);
  const def = Math.max(0, defense);
  const base = atk + def > 0 ? (atk * atk) / (atk + def) : 0;
  const roll = ROLL_MIN + rng() * (ROLL_MAX - ROLL_MIN);
  return Math.max(1, Math.round(base * roll));
}
