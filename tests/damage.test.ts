import { describe, it, expect } from 'vitest';
import { computeDamage } from '../src/systems/damage';

const mid = () => 0.5;

describe('computeDamage', () => {
  it('deals full attack against zero defense on a mid roll', () => {
    expect(computeDamage(10, 0, mid)).toBe(10);
  });

  it('halves damage when defense equals attack', () => {
    expect(computeDamage(10, 10, mid)).toBe(5);
  });

  it('keeps reducing with diminishing returns as defense grows', () => {
    expect(computeDamage(10, 20, mid)).toBe(3);
    expect(computeDamage(10, 40, mid)).toBe(2);
  });

  it('rolls between 80% and 120% of the mitigated value', () => {
    expect(computeDamage(10, 0, () => 0)).toBe(8);
    expect(computeDamage(10, 0, () => 0.999999)).toBe(12);
  });

  it('never deals less than 1', () => {
    expect(computeDamage(1, 50, () => 0)).toBe(1);
  });
});
